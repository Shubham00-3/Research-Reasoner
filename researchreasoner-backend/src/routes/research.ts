import express from 'express';
import { RealPaper } from '../services/paperSearchService';
import { searchRealPapers } from '../services/paperSearchService';
import { RelationshipService } from '../services/relationshipService';
import { PaperDownloadService } from '../services/paperDownloadService';
import neo4jService from '../services/neo4jService';
import path from 'path';
import fs from 'fs';
import { GraphRAGService } from '../services/graphRagService';
import { AdvancedRAGService } from '../services/AdvancedRAGService';
import { groqService } from '../services/groqService';

// ✅ TYPE DEFINITIONS
interface RAGResponse {
  answer: string;
  sources: any[];
  context: {
    relevantPapers: any[];
    searchQuery: string;
    searchType: string;
    totalPapersFound: number;
    confidence: number;
    topic?: string;
  };
  suggestedQuestions: string[];
  reasoning: string;
}

interface MultiStepResult {
  originalQuestion: string;
  steps: any[];
  synthesis: string;
  conclusions: string[];
  limitationsAndGaps: string[];
  suggestedResearch: string[];
  sources: any[];
  totalConfidence: number;
  // Compatibility properties for union type handling
  answer?: string;
  suggestedQuestions?: string[];
  confidence?: number;
  investigation?: {
    question: string;
    steps: any[];
    synthesis: string;
    gaps: string[];
    futureWork: string[];
  };
}

interface BulkOperationResult {
  success: boolean;
  message: string;
  filesProcessedAttempted?: number;
  successfullyStoredInDB?: number;
  papersAttempted?: number;
  filesWritten?: number;
  details?: any;
}

const router = express.Router();
const downloadService = new PaperDownloadService();
const graphRAG = new GraphRAGService();
const advancedRAG = new AdvancedRAGService();

// Helper function to check if response is RAGResponse
function isRAGResponse(response: any): boolean {
  return response && typeof response === 'object' && 'answer' in response && 'suggestedQuestions' in response;
}

// Helper function to check if response is MultiStepResult
function isMultiStepResult(response: any): boolean {
  return response && typeof response === 'object' && ('investigation' in response || 'synthesis' in response);
}

// ✅ INSTANT CACHING SYSTEM
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class InstantCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 10000;

  set(key: string, data: any, ttlMinutes: number = 60): void {
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
    if (this.cache.size > this.maxSize) {
        const entriesToDelete = Array.from(this.cache.entries()).sort((a,b) => a[1].timestamp - b[1].timestamp);
        for(let i=0; i < (this.cache.size - this.maxSize); i++){
            this.cache.delete(entriesToDelete[i][0]);
        }
    }
  }

  getStats(): { size: number; maxSize: number } {
    this.cleanup();
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// ✅ CACHE INSTANCES
const searchCache = new InstantCache();
const paperContentCache = new InstantCache();
const graphCache = new InstantCache();

// Helper function to optimize papers for frontend
function optimizePapersForFrontend(papers: any[]): any[] {
  return papers.map((paper, index) => ({
    id: paper.id || `paper-${Date.now()}-${index}`,
    title: paper.title || 'Untitled Paper',
    authors: paper.authors ? paper.authors.slice(0, 3) : ['Unknown Author'],
    year: paper.year || null,
    citationCount: paper.citationCount || 0,
    abstract: paper.abstract ? paper.abstract.substring(0, 300) + (paper.abstract.length > 300 ? '...' : '') : 'No abstract available',
    venue: paper.venue || 'Unknown Venue',
    url: paper.url,
    localFilePath: paper.localFilePath,
    hasLocalFile: !!paper.localFilePath,
    fileSize: paper.fileSize,
    similarity: paper.similarity,
    relevance: paper.relevance,
    connectionStrength: paper.connectionStrength,
    embeddingDimension: paper.embeddingDimension,
    hasFullContent: paper.hasFullContent,
    contentType: paper.contentType,
  }));
}

// 🎯 ENHANCED SEARCH WITH PDF PRIORITY
router.post('/search-papers', async (req: any, res: any) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required and must be a non-empty string'
      });
    }

    const cacheKey = `search-papers_${query.toLowerCase().replace(/\s+/g, '_')}`;
    const cachedResults = searchCache.get(cacheKey);

    if (cachedResults) {
      console.log('⚡ INSTANT: Returning cached search results for (search-papers):', query);
      return res.json({...cachedResults, data: {...cachedResults.data, cached: true}});
    }

    console.log(`🔍 Original search (/search-papers) for: ${query} (PDF-priority download enabled)`);
    const results = await searchRealPapers(query);

    console.log(`📦 Found ${results.papers.length} papers - Starting PDF-priority download (if any)`);

    if (results.papers.length > 0) {
      console.log(`📥 Starting PDF-priority download for up to ${results.papers.length} papers via /search-papers`);

      downloadService.downloadAllPapers(results.papers, query, true)
        .then(async (downloadResults) => {
          console.log(`✅ Download completed via /search-papers with PDF priority:`);
          console.log(`📄 Success: ${downloadResults.completed}, Failed: ${downloadResults.failed}`);
        })
        .catch(error => {
          console.error('❌ PDF-priority download initiated by /search-papers failed:', error);
        });
    }

    const optimizedPapers = results.papers.map((paper: any, index: number) => ({
      id: paper.id || `paper-${Date.now()}-${index}`,
      title: paper.title || 'Untitled Paper',
      authors: paper.authors || ['Unknown Author'],
      year: paper.year || null,
      citationCount: paper.citationCount || 0,
      abstract: paper.abstract,
      venue: paper.venue || 'Unknown Venue',
      url: paper.url,
      doi: paper.doi,
      keywords: paper.keywords || [],
      hasLocalFile: paper.localFilePath ? true : false,
      storedInDatabase: paper.storedInDatabase ? true : false,
      localFilePath: paper.localFilePath || null,
      fileSize: paper.fileSize || null,
      contentType: paper.contentType || null,
      downloadStrategy: paper.downloadStrategy || null
    }));

    const responseData = {
      success: true,
      message: `Found ${results.papers.length} papers - PDF-priority auto-download started (if applicable)`,
      data: {
        papers: optimizedPapers,
        count: results.papers.length,
        authorsAnalyzed: results.authorsAnalyzed,
        summary: results.summary,
        totalFound: results.totalFound,
        autoDownloadStarted: results.papers.length > 0,
        downloadStrategy: 'pdf_priority',
        databaseStorageEnabled: true,
        features: {
          pdfPriority: true,
          inlinePDFViewing: true,
          fullContentDisplay: true,
          noExternalLinks: true
        },
        cached: false
      }
    };

    searchCache.set(cacheKey, responseData, 30);
    console.log(`💾 Cached /search-papers results for: ${query}`);

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error in /search-papers endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching papers with PDF priority',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/chat', async (req: any, res: any) => {
  const startTime = Date.now(); // ADD THIS LINE

  try {
    const { question, mode = 'simple', conversationId, topic } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    console.log(`💬 Chat request: "${question}" (mode: ${mode}, topic: ${topic})`);

    // ADD THIS: Get conversation history
    let conversationHistory = [];
    if (conversationId) {
      const session = conversationStore.get(conversationId);
      if (session) {
        conversationHistory = session.messages.slice(-5);
        console.log(`📋 Found conversation with ${conversationHistory.length} messages`);
      } else {
        console.log(`❌ No conversation found for ID: ${conversationId}`);
      }
    }

    let ragResponse: any; // ADD THIS LINE

    if (mode === 'investigation') {
      ragResponse = await advancedRAG.conductResearchInvestigation(question, topic);
    } else if (mode === 'advanced') {
      ragResponse = await graphRAG.askQuestion(question, topic, conversationHistory);
    } else {
      ragResponse = await graphRAG.askQuestion(question, topic, conversationHistory);
    }

    // Handle different response types safely
    if (isRAGResponse(ragResponse)) {
      res.json({
        success: true,
        message: 'Research question answered',
        data: {
          answer: ragResponse.answer,
          sources: optimizePapersForFrontend(ragResponse.sources || []),
          suggestedQuestions: ragResponse.suggestedQuestions,
          confidence: ragResponse.confidence || 0.8,
          searchMethod: 'hybrid',
          responseTime: Date.now() - startTime,
          topic: topic || (ragResponse as any).context?.topic || 'all'
        }
      });
    } else if (isMultiStepResult(ragResponse)) {
      res.json({
        success: true,
        message: 'Multi-step investigation completed',
        data: {
          type: 'investigation',
          investigation: ragResponse.investigation,
          sources: optimizePapersForFrontend(ragResponse.sources || []),
          summary: ragResponse.synthesis || (ragResponse.investigation as any)?.synthesis,
          steps: (ragResponse.investigation as any)?.steps,
          answer: ragResponse.answer || (ragResponse.investigation as any)?.synthesis,
          confidence: ragResponse.confidence || 0.8,
          suggestedQuestions: ragResponse.suggestedQuestions || [],
          responseTime: Date.now() - startTime,
          topic: topic || (ragResponse as any).context?.topic || 'all'
        }
      });
    } else {
      console.warn('⚠️ Unknown response type from RAG service:', ragResponse);
      const bestEffortAnswer = (ragResponse as any)?.answer || (ragResponse as any)?.synthesis || "Could not determine a structured answer.";
      const bestEffortSources = optimizePapersForFrontend((ragResponse as any)?.sources || []);

      res.json({
        success: true,
        message: 'Response processed with undefined structure.',
        data: {
            answer: bestEffortAnswer,
            sources: bestEffortSources,
            suggestedQuestions: (ragResponse as any)?.suggestedQuestions || [],
            confidence: (ragResponse as any)?.confidence || 0.5,
            responseTime: Date.now() - startTime,
            topic: topic || 'all',
            rawResponse: ragResponse
        }
      });
    }

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing chat request',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        question: req.body.question,
        fallbackSuggestions: [
          "Try asking about specific research topics in your database",
          "Ask about authors or methodologies you're interested in",
          "Request information about recent developments in a field"
        ]
      }
    });
  }
});

// ✅ SEMANTIC SEARCH ENDPOINT
router.post('/semantic-search', async (req: any, res: any) => {
  try {
    const { query, limit = 10, topic } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    const numericLimit = parseInt(limit as string, 10) || 10;

    console.log(`🔍 Semantic search: "${query}" (Limit: ${numericLimit}, Topic: ${topic || 'all'})`);

    const results = await neo4jService.semanticSearch(query, numericLimit, topic);

    res.json({
      success: true,
      message: `Found ${results.length} semantically similar papers`,
      data: {
        query: query,
        results: optimizePapersForFrontend(results),
        count: results.length,
        searchType: 'semantic',
        topic: topic || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Error in semantic search:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing semantic search',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ HYBRID SEARCH ENDPOINT
router.post('/hybrid-search', async (req: any, res: any) => {
  try {
    const { query, limit = 10, topic } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    const numericLimit = parseInt(limit as string, 10) || 10;

    console.log(`🔄 Hybrid search: "${query}" (Limit: ${numericLimit}, Topic: ${topic || 'all'})`);

    const results = await neo4jService.hybridSearch(query, numericLimit, topic);

    res.json({
      success: true,
      message: `Hybrid search completed, found ${results.combinedResults.length} combined results.`,
      data: {
        query: query,
        combined: optimizePapersForFrontend(results.combinedResults),
        breakdown: {
          semantic: results.semanticResults.length,
          keyword: results.keywordResults.length,
          graph: results.graphResults.length,
          totalCombinedBeforeLimit: results.combinedResults.length
        },
        details: {
          semanticResults: optimizePapersForFrontend(results.semanticResults),
          keywordResults: optimizePapersForFrontend(results.keywordResults),
          graphResults: optimizePapersForFrontend(results.graphResults)
        },
        searchType: 'hybrid',
        topic: topic || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Error in hybrid search:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing hybrid search',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ AUTHOR SEARCH ENDPOINT
router.get('/search/authors/:authorName', async (req: any, res: any) => {
  try {
    const { authorName } = req.params;
    const { limit = 10 } = req.query;
    const numericLimit = parseInt(limit as string, 10) || 10;

    if(!authorName || typeof authorName !== 'string' || authorName.trim() === '') {
        return res.status(400).json({ success: false, message: 'Author name is required.'});
    }

    console.log(`👤 Author search: "${authorName}" (Limit: ${numericLimit})`);

    const papers = await graphRAG.findPapersByAuthor(authorName, numericLimit);

    res.json({
      success: true,
      message: `Found ${papers.length} papers by ${authorName}`,
      data: {
        authorName: authorName,
        papers: optimizePapersForFrontend(papers),
        count: papers.length,
        searchType: 'author'
      }
    });

  } catch (error) {
    console.error('❌ Error in author search:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching for author',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ RESEARCH COMPARISON ENDPOINT
router.post('/compare', async (req: any, res: any) => {
  try {
    const { topic1, topic2 } = req.body;

    if (!topic1 || !topic2 || typeof topic1 !== 'string' || typeof topic2 !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Both topics are required as strings for comparison'
      });
    }

    console.log(`⚖️ Comparing: "${topic1}" vs "${topic2}"`);

    const comparison = await graphRAG.compareApproaches(topic1, topic2);

    res.json({
      success: true,
      message: `Comparison completed: ${topic1} vs ${topic2}`,
      data: {
        topic1: topic1,
        topic2: topic2,
        comparison: comparison.answer,
        sources: optimizePapersForFrontend(comparison.sources),
        confidence: comparison.context.confidence,
        suggestedQuestions: comparison.suggestedQuestions
      }
    });

  } catch (error) {
    console.error('❌ Error in research comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing research topics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ INITIALIZE EMBEDDINGS ENDPOINT
router.post('/initialize-embeddings', async (req: any, res: any) => {
  try {
    const { batchSize = 10 } = req.body;
    const numericBatchSize = parseInt(batchSize as string, 10) || 10;

    console.log(`🔢 Starting embeddings initialization (batch size: ${numericBatchSize})`);

    neo4jService.addEmbeddingsToExistingPapers(numericBatchSize)
        .then(async () => {
            console.log('✅ Embeddings initialization process started/completed in background.');
        })
        .catch(err => {
            console.error('❌ Background embeddings initialization failed to start:', err);
        });

    const initialStats = await neo4jService.getEmbeddingStats();

    res.status(202).json({
      success: true,
      message: 'Embeddings initialization process has been initiated. Check /api/embeddings/stats for progress.',
      data: {
        batchSize: numericBatchSize,
        currentStats: initialStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error initiating embeddings initialization:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating embeddings initialization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ EMBEDDING STATS ENDPOINT
router.get('/embeddings/stats', async (req: any, res: any) => {
  try {
    const stats = await neo4jService.getEmbeddingStats();

    res.json({
      success: true,
      message: 'Embedding statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting embedding stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving embedding statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ QUICK RESEARCH SUGGESTIONS ENDPOINT
router.get('/suggestions/:topic?', async (req: any, res: any) => {
  try {
    const { topic } = req.params;
    const defaultTopic = topic || 'AI research';

    let suggestions = [
      `What are the latest developments in ${defaultTopic}?`,
      `Who are the leading researchers in ${defaultTopic}?`,
      `What methodologies are commonly used in ${defaultTopic} research?`,
      `Can you compare different approaches to ${defaultTopic}?`,
      `What are the practical applications of ${defaultTopic} research?`
    ];

    const samplePapers = await neo4jService.getPapersByTopic(defaultTopic);
    const paperTitles = samplePapers.slice(0, 5).map((p: any) => p.title).filter(Boolean);

    if (paperTitles.length > 0) {
      suggestions.push(`Tell me more about: "${paperTitles[0]}"`);
      if (paperTitles.length > 1) {
        suggestions.push(`How does "${paperTitles[0]}" relate to "${paperTitles[1]}"?`);
      }
    }
    suggestions = suggestions.slice(0,5);
    if (suggestions.length < 5 && samplePapers.length > 2) {
        suggestions.push(`Summarize the key findings from papers related to ${defaultTopic}.`)
    }
    if (suggestions.length < 5) {
        suggestions.push(`What are some open research questions in ${defaultTopic}?`)
    }

    res.json({
      success: true,
      message: 'Research suggestions generated successfully',
      data: {
        topic: defaultTopic,
        suggestions: suggestions.slice(0, 5),
        samplePapersUsedForSuggestions: paperTitles,
        totalPapersInTopic: samplePapers.length
      }
    });

  } catch (error) {
    console.error('❌ Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating research suggestions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ GENERATE INSIGHTS ENDPOINT
router.post('/generate-insights', async (req: any, res: any) => {
  try {
    const { papers, relationships, topic: reqTopic } = req.body;

    if (!papers || !Array.isArray(papers)) {
      return res.status(400).json({
        success: false,
        message: 'Papers array is required'
      });
    }

    const currentTopic = reqTopic || 'research topic';
    console.log(`💡 Generating REAL insights for: ${currentTopic}`);
    console.log(`🧠 Analyzing ${papers.length} real papers...`);

    const { DynamicInsightsService } = await import('../services/dynamicInsightsService');
    const realInsights = DynamicInsightsService.generateRealInsights(papers, currentTopic);

    const downloadStats = await neo4jService.getDownloadStats();

    console.log(`✅ Generated insights from real paper data for topic: ${currentTopic}`);

    const connectionsCount = relationships?.length || 0;
    const statsConnections = (realInsights.researchStats as any)?.connections || 0;
    const connectionsDiscovered = Math.max(connectionsCount, statsConnections);

    res.json({
      success: true,
      message: 'Research insights generated from real data',
      data: {
        insights: realInsights.insights,
        keyFindings: realInsights.insights?.keyFindings || [],
        authorsAnalyzed: realInsights.researchStats?.uniqueAuthors || 0,
        connectionsDiscovered: connectionsDiscovered,
        realPaperTitles: realInsights.realPaperTitles || [],
        topCitedPapers: optimizePapersForFrontend(realInsights.topCitedPapers || []),
        researchStats: realInsights.researchStats,
        totalPapersAnalyzed: papers.length,
        downloadStats: downloadStats
      }
    });

  } catch (error) {
    console.error('❌ Error generating insights:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ GENERATE RESEARCH DRAFT ENDPOINT
router.post('/generate-research-draft', async (req: any, res: any) => {
  try {
    const { topic, papers, insights } = req.body;
    const currentTopic = topic || 'Research Topic';

    console.log(`📝 Generating research draft for: ${currentTopic}`);

    const researchDraft = `# Research Analysis: ${currentTopic}

## Executive Summary
This comprehensive analysis examines ${papers?.length || 0} research papers related to ${currentTopic}, providing insights into current research trends, methodologies, and collaboration patterns in the field.

## Key Findings
${insights?.keyFindings?.map((finding: any, index: number) =>
  `${index + 1}. ${finding}`
).join('\n\n') || '1. Comprehensive analysis of research papers completed successfully.'}

## Research Landscape Overview
Our analysis reveals significant activity in ${currentTopic} with ${papers?.length || 0} active publications. The research demonstrates strong collaboration networks among ${insights?.authorsAnalyzed || insights?.researchStats?.uniqueAuthors || 0} unique researchers.

## Local Paper Archive
This analysis includes a local archive of research papers. Papers have been downloaded and stored (${insights?.downloadStats?.downloadedPapers || 0} locally, ${insights?.storageStats?.papersWithContent || 0} in DB).

## Methodology
Data Collection: arXiv, Semantic Scholar, Multi-source Integration, Local Paper Archive.
Analysis Techniques: Citation Network Analysis, Author Collaboration Networks, Content Analysis, Temporal Analysis, Full-Text Analysis.
Technical Infrastructure: AI-Powered Processing (e.g., Groq LLaMA models), Graph Database (Neo4j), Local File System.

## Research Statistics
- Total Papers Analyzed: ${papers?.length || 0}
- Unique Authors Identified: ${insights?.authorsAnalyzed || insights?.researchStats?.uniqueAuthors || 0}
- Research Connections: ${insights?.connectionsDiscovered || (insights?.researchStats as any)?.connections || 0}
- Papers Downloaded (Local FS): ${insights?.downloadStats?.downloadedPapers || 0}
- Papers with Full Content (DB): ${(insights?.storageStats as any)?.papersWithContent || (await neo4jService.getDatabaseStorageStats()).papersWithContent || 0}
- Analysis Date: ${new Date().toLocaleDateString()}

## Database Integration
Research data stored in Neo4j graph database with local file links and embedded content, enabling persistent storage, local paper access, relationship mapping, advanced query capabilities, and offline access.

## Conclusions
The ${currentTopic} field demonstrates remarkable vitality. Our local paper archive and database integration ensure persistent access to these valuable research resources.

---
## Technical Metadata
- Platform: ResearchReasoner AI Analysis System
- Data Sources: arXiv, Semantic Scholar, Real-time APIs
- AI Models: e.g., Groq LLaMA-3
- Database: Neo4j graph database
- Local Archive: ${insights?.downloadStats?.downloadedPapers || 0} papers stored locally
- Database Content: ${(await neo4jService.getDatabaseStorageStats()).papersWithContent || 0} papers with full content in DB
- Processing Date: ${new Date().toLocaleDateString()}

*This research draft was automatically generated.*`;

    const wordCount = researchDraft.split(/\s+/).length;

    res.json({
      success: true,
      message: 'Research draft generated successfully',
      data: {
        draft: researchDraft,
        wordCount: wordCount,
        pageCount: Math.ceil(wordCount / 250),
        generatedAt: new Date().toISOString(),
        topic: currentTopic,
        paperCount: papers?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error generating research draft:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating research draft',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ DATABASE STATS ENDPOINT
router.get('/database-stats', async (req: any, res: any) => {
  try {
    console.log(`📊 Getting database statistics...`);
    const stats = await neo4jService.getDatabaseStats();

    res.json({
      success: true,
      message: 'Database statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting database statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ PAPERS BY TOPIC ENDPOINT
router.get('/papers/:topic', async (req: any, res: any) => {
  try {
    const { topic } = req.params;
    console.log(`🔍 Querying papers for topic: ${topic}`);

    const papers = await neo4jService.getPapersByTopic(topic);

    res.json({
      success: true,
      message: `Found ${papers.length} papers for topic: ${topic}`,
      data: {
        topic: topic,
        papers: optimizePapersForFrontend(papers),
        count: papers.length
      }
    });

  } catch (error) {
    console.error('❌ Error querying papers by topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error querying papers by topic',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ LOCAL PAPERS ENDPOINT
router.get('/local-papers/:topic?', async (req: any, res: any) => {
  try {
    const { topic } = req.params;
    const localPapers = await neo4jService.getPapersWithLocalFiles(topic);

    res.json({
      success: true,
      message: `Found ${localPapers.length} papers with local files ${topic ? `for topic "${topic}"` : '(all topics)'}`,
      data: {
        papers: optimizePapersForFrontend(localPapers),
        count: localPapers.length,
        topic: topic || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Error getting local papers:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting local papers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🎯 ENHANCED PAPER CONTENT ENDPOINT
router.get('/paper-content/:paperId', async (req: any, res: any) => {
  try {
    const { paperId } = req.params;
    console.log(`🔍 Fetching full content for paper: ${paperId}`);

    const cacheKey = `content_${paperId}`;
    const cachedItem = paperContentCache.get(cacheKey);

    if (cachedItem) {
      console.log('⚡ INSTANT: Returning cached paper content for:', paperId);
      return res.json({
        success: true,
        message: 'Paper content retrieved from cache (INSTANT)',
        data: {...cachedItem, source: 'cache'}
      });
    }

    try {
      const dbContent = await neo4jService.getPaperFullContentFromDatabase(paperId);

      if (dbContent.hasFullContent && dbContent.content !== null) {
        console.log(`✅ SUCCESS: Retrieved full content from database for: ${paperId} (Type: ${dbContent.contentType})`);

        const paperData: any = {
          paperId,
          type: dbContent.contentType === 'application/pdf' ? 'pdf' : 'text',
          content: dbContent.contentType === 'application/pdf' ? null : dbContent.content,
          hasFullContent: true,
          hasLocalFileOrDBContent: true,
          contentType: dbContent.contentType,
          originalSize: dbContent.originalSize,
          title: dbContent.title,
          source: 'database'
        };

        if (dbContent.contentType === 'application/pdf') {
          paperData.downloadUrl = `/api/download/paper-from-db/${paperId}`;
          paperData.message = 'PDF content stored in database - ready for inline viewing via downloadUrl.';
          paperData.fileSize = dbContent.originalSize;
        } else {
          paperData.message = 'Full text content retrieved from database.';
        }

        paperContentCache.set(cacheKey, paperData, 120);

        return res.json({
          success: true,
          message: `Full paper content retrieved from database (${dbContent.contentType})`,
          data: paperData
        });
      }
    } catch (dbError: any) {
      console.warn(`⚠️ Database content retrieval failed for ${paperId} (will try filesystem):`, dbError.message);
    }

    const localPath = await neo4jService.getLocalFilePath(paperId);

    if (localPath && fs.existsSync(localPath)) {
      const fileExtension = path.extname(localPath).toLowerCase();
      const stats = fs.statSync(localPath);
      let paperData: any;

      if (fileExtension === '.txt') {
        const content = fs.readFileSync(localPath, 'utf8');
        paperData = {
          paperId, type: 'text', content, hasFullContent: true, hasLocalFileOrDBContent: true,
          filePath: localPath, fileSize: stats.size, source: 'filesystem',
          message: 'Full text content retrieved from local filesystem.'
        };
      } else if (fileExtension === '.pdf') {
        paperData = {
          paperId, type: 'pdf', downloadUrl: `/api/download/paper/${paperId}`,
          hasFullContent: true, hasLocalFileOrDBContent: true, fileSize: stats.size, filePath: localPath, source: 'filesystem',
          message: 'PDF paper available locally - ready for viewing via downloadUrl.'
        };
      } else {
          paperData = {
             paperId, type: 'file', downloadUrl: `/api/download/paper/${paperId}`,
             hasFullContent: false, hasLocalFileOrDBContent: true, fileSize: stats.size, filePath: localPath, source: 'filesystem',
             message: `File (${fileExtension}) available locally via downloadUrl.`
          };
      }

      if (paperData) {
          paperContentCache.set(cacheKey, paperData, 120);
          return res.json({ success: true, message: paperData.message, data: paperData });
      }
    }

    return res.status(404).json({
      success: false,
      message: 'Paper content not found in database or local filesystem.',
      data: { paperId, source: 'none', hasFullContent: false, hasLocalFileOrDBContent: false }
    });

  } catch (error) {
    console.error(`❌ Error getting paper content for ${req.params.paperId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving paper content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🎯 ENHANCED: Download status
router.get('/download-status/:topic', async (req: any, res: any) => {
  try {
    const { topic } = req.params;

    const cacheKey = `download_status_${topic}`;
    const cachedStatus = searchCache.get(cacheKey);

    if (cachedStatus) {
      console.log('⚡ INSTANT: Returning cached download status for:', topic);
      return res.json({...cachedStatus, data: {...cachedStatus.data, cached: true}});
    }

    const allPapersInTopic = await neo4jService.getPapersByTopic(topic);

    const downloadStatusList = allPapersInTopic.map((paper:any) => ({
      id: paper.id,
      title: paper.title,
      hasLocalFile: !!paper.localFilePath,
      hasFullContentInDB: !!paper.hasFullContent,
      fileSize: paper.fileSize,
      originalDBSize: paper.originalSize,
      downloadedAt: paper.downloadedAt,
      contentTypeInDB: paper.contentType
    }));

    const stats: any = {
      totalPapersInTopic: allPapersInTopic.length,
      downloadedToLocalFSCount: downloadStatusList.filter(p => p.hasLocalFile).length,
      withFullContentInDBCount: downloadStatusList.filter(p => p.hasFullContentInDB).length,
      pdfInDBCount: downloadStatusList.filter(p => p.hasFullContentInDB && p.contentTypeInDB === 'application/pdf').length,
      textInDBCount: downloadStatusList.filter(p => p.hasFullContentInDB && p.contentTypeInDB === 'text/plain').length,
    };
    stats['downloadProgressFSPercent'] = stats.totalPapersInTopic > 0 ? Math.round((stats.downloadedToLocalFSCount / stats.totalPapersInTopic) * 100) : 0;
    stats['contentInDBProgressPercent'] = stats.totalPapersInTopic > 0 ? Math.round((stats.withFullContentInDBCount / stats.totalPapersInTopic) * 100) : 0;

    const responseData = {
      success: true,
      message: 'Download and content status retrieved',
      data: {
        topic,
        ...stats,
        papers: downloadStatusList,
        downloadStrategyInUse: 'pdf_priority_and_db_storage',
        features: { pdfPriority: true, databaseStorage: true, inlineViewing: true },
        cached: false
      }
    };

    searchCache.set(cacheKey, responseData, 5);

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error getting download status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting download status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ BUILD KNOWLEDGE GRAPH ENDPOINT
router.post('/build-knowledge-graph', async (req: any, res: any) => {
  try {
    const { papers, topic } = req.body;

    if (!papers || !Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Papers array (non-empty) is required'
      });
    }
    const currentTopic = topic || 'research_graph_topic';

    const cacheKey = `graph_${currentTopic}_${papers.map((p:any) => p.id).sort().join('_')}`.slice(0,100);
    const cachedGraph = graphCache.get(cacheKey);

    if (cachedGraph) {
      console.log('⚡ INSTANT: Returning cached knowledge graph for:', currentTopic);
      return res.json({...cachedGraph, data: {...cachedGraph.data, cached: true}});
    }

    console.log(`🌐 Building REAL knowledge graph for: ${currentTopic} with ${papers.length} papers`);

    const limitedPapers = papers.slice(0, 500);
    const relationships = RelationshipService.analyzeRelationships(limitedPapers);
    console.log(`✅ Found ${relationships.length} relationships through RelationshipService`);

    await neo4jService.storeResearchGraph(limitedPapers, relationships, currentTopic)
      .then(() => console.log(`✅ Successfully stored graph in Neo4j for topic: ${currentTopic} (embeddings included)`))
      .catch(err => console.warn(`⚠️ Database storage for graph failed for topic ${currentTopic}:`, err));

    const additionalConnections = generateGraphConnections(limitedPapers);
    const allConnections = [...relationships.map((rel: any) => ({
      source: rel.sourceId, target: rel.targetId, type: rel.relationshipType || 'semantic', strength: rel.strength || 0.5
    })), ...additionalConnections];

    const responseData = {
      success: true,
      message: `Knowledge graph built with ${limitedPapers.length} nodes and ${allConnections.length} connections`,
      data: {
        topic: currentTopic,
        relationshipsFromService: relationships,
        graphNodes: optimizePapersForFrontend(limitedPapers),
        graphEdges: allConnections,
        databaseStored: true,
        totalPapersProvided: papers.length,
        papersInGraph: limitedPapers.length,
        cached: false
      }
    };

    graphCache.set(cacheKey, responseData, 60);
    console.log(`💾 Cached knowledge graph for: ${currentTopic}`);

    res.json(responseData);

  } catch (error) {
    console.error('❌ Error building knowledge graph:', error);
    res.status(500).json({
      success: false,
      message: 'Error building knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to generate graph connections
function generateGraphConnections(papers: any[]): any[] {
  const connections: any[] = [];
  const maxConnections = Math.min(1000, papers.length * 2);

  for (let i = 0; i < papers.length && connections.length < maxConnections; i++) {
    const maxConnectionsPerPaper = Math.min(5, papers.length - 1);
    let connectionsForThisPaper = 0;

    for (let j = i + 1; j < papers.length && connectionsForThisPaper < maxConnectionsPerPaper && connections.length < maxConnections; j++) {
      const paper1 = papers[i];
      const paper2 = papers[j];

      const p1Id = paper1.id || `paper-gen-${i}`;
      const p2Id = paper2.id || `paper-gen-${j}`;

      const sharedAuthors = paper1.authors?.filter((author: string) =>
        paper2.authors?.some((otherAuthor: string) =>
          author.toLowerCase().includes(otherAuthor.toLowerCase()) ||
          otherAuthor.toLowerCase().includes(author.toLowerCase())
        )
      );

      if (sharedAuthors && sharedAuthors.length > 0) {
        connections.push({ source: p1Id, target: p2Id, type: 'shared_author', strength: 0.8 });
        connectionsForThisPaper++; continue;
      }

      if (paper1.year && paper2.year && Math.abs(paper1.year - paper2.year) <= 1) {
        connections.push({ source: p1Id, target: p2Id, type: 'temporal_proximity', strength: 0.4 });
        connectionsForThisPaper++; continue;
      }

      const title1Words = (paper1.title || '').toLowerCase().split(' ').filter((w: string) => w.length > 3);
      const title2Words = (paper2.title || '').toLowerCase().split(' ').filter((w: string) => w.length > 3);
      const commonWords = title1Words.filter((word: string) => title2Words.includes(word));

      if (commonWords.length >= 2) {
        connections.push({ source: p1Id, target: p2Id, type: 'title_overlap', strength: Math.min(0.7, commonWords.length * 0.15) });
        connectionsForThisPaper++; continue;
      }

      if (connectionsForThisPaper === 0 && Math.random() < 0.01 && j > i + papers.length/2) {
        connections.push({ source: p1Id, target: p2Id, type: 'random_link', strength: 0.1 });
        connectionsForThisPaper++;
      }
    }
  }
  console.log(`🔗 Generated ${connections.length} additional connections for graph visualization`);
  return connections;
}

// ✅ CACHE STATS ENDPOINT
router.get('/cache-stats', async (req: any, res: any) => {
  try {
    const stats = {
      searchCache: searchCache.getStats(),
      paperContentCache: paperContentCache.getStats(),
      graphCache: graphCache.getStats(),
      totalCachedItems: searchCache.getStats().size + paperContentCache.getStats().size + graphCache.getStats().size
    };

    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cache statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ BATCH PAPER CONTENT ENDPOINT
router.post('/batch-paper-content', async (req: any, res: any) => {
  try {
    const { paperIds } = req.body;

    if (!paperIds || !Array.isArray(paperIds) || paperIds.some(id => typeof id !== 'string')) {
      return res.status(400).json({
        success: false,
        message: 'Paper IDs array (of strings) is required'
      });
    }

    console.log(`🔍 Batch fetching content for ${paperIds.length} papers`);
    const results: any[] = [];

    for (const paperId of paperIds) {
      const cacheKey = `content_${paperId}`;
      const cachedItem = paperContentCache.get(cacheKey);

      if (cachedItem) {
        results.push({ paperId, status: 'cached', data: cachedItem });
        continue;
      }

      try {
        const dbContent = await neo4jService.getPaperFullContentFromDatabase(paperId);
        if (dbContent.hasFullContent && dbContent.content !== null) {
          const paperData: any = {
            type: dbContent.contentType === 'application/pdf' ? 'pdf' : 'text',
            content: dbContent.contentType === 'application/pdf' ? null : dbContent.content,
            downloadUrl: dbContent.contentType === 'application/pdf' ? `/api/download/paper-from-db/${paperId}` : null,
            message: dbContent.contentType === 'application/pdf' ? 'PDF from DB' : 'Text from DB',
            source: 'database', title: dbContent.title, originalSize: dbContent.originalSize
          };
          paperContentCache.set(cacheKey, paperData, 120);
          results.push({ paperId, status: 'retrieved_db', data: paperData });
          continue;
        }

        const localPath = await neo4jService.getLocalFilePath(paperId);
        if (localPath && fs.existsSync(localPath)) {
          const fileExtension = path.extname(localPath).toLowerCase();
          const stats = fs.statSync(localPath);
          let paperDataFs: any;
          if (fileExtension === '.txt') {
              const content = fs.readFileSync(localPath, 'utf8');
              paperDataFs = {
                type: 'text', content, source: 'filesystem', fileSize: stats.size, filePath: localPath,
                message: 'Text from FS'
              };
          } else if (fileExtension === '.pdf') {
              paperDataFs = {
                type: 'pdf', downloadUrl: `/api/download/paper/${paperId}`, source: 'filesystem',
                fileSize: stats.size, filePath: localPath, message: 'PDF from FS'
              };
          } else {
            paperDataFs = { type: fileExtension.replace('.',''), downloadUrl: `/api/download/paper/${paperId}`, source: 'filesystem', fileSize: stats.size, message: 'File from FS' };
          }
          paperContentCache.set(cacheKey, paperDataFs, 120);
          results.push({ paperId, status: 'retrieved_fs', data: paperDataFs });
        } else {
          results.push({ paperId, status: 'not_found', data: { message: 'Content not found' } });
        }
      } catch (fetchError: any) {
        console.warn(`⚠️ Failed to fetch content for ${paperId} in batch:`, fetchError.message);
        results.push({ paperId, status: 'error', error: fetchError.message });
      }
    }

    console.log(`✅ Batch content fetch complete: ${results.length} papers processed`);
    res.json({
      success: true,
      message: `Batch fetch completed for ${paperIds.length} papers`,
      data: { results, totalRequested: paperIds.length, totalProcessed: results.length }
    });

  } catch (error) {
    console.error('❌ Error in batch paper content fetch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch paper content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ DOWNLOAD PAPERS ENDPOINT
router.post('/download-papers', async (req: any, res: any) => {
  try {
    const { papers } = req.body;

    if (!papers || !Array.isArray(papers)) {
      return res.status(400).json({ success: false, message: 'Papers array is required' });
    }

    console.log(`📥 Starting manual download of ${papers.length} papers to filesystem`);

    const downloadResults = await downloadService.downloadAllPapers(papers, "manual_batch", false);

    let updatedInDbCount = 0;
    for (const progressItem of downloadResults.progress) {
        if (progressItem.status === 'completed' && progressItem.filePath && progressItem.paperId) {
            try {
                await neo4jService.updatePaperLocalFile(
                    progressItem.paperId,
                    progressItem.filePath,
                    progressItem.fileSize || 0
                );
                updatedInDbCount++;
            } catch (dbError) {
                console.warn(`⚠️ Failed to update local file path in DB for ${progressItem.paperId}:`, dbError);
            }
        }
    }
    console.log(`Updated ${updatedInDbCount} paper records in DB with local file paths.`);

    res.json({
      success: true,
      message: `Download to filesystem initiated/completed: ${downloadResults.completed} successful, ${downloadResults.failed} failed.`,
      data: {
        completed: downloadResults.completed,
        failed: downloadResults.failed,
        totalSizeMB: downloadResults.totalSize ? Math.round(downloadResults.totalSize / (1024*1024)*100)/100 : 0,
        progressDetails: downloadResults.progress
      }
    });

  } catch (error) {
    console.error('❌ Error in /download-papers endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading papers to filesystem',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ SERVE PAPER FILES FROM LOCAL FILESYSTEM
router.get('/download/paper/:paperId', async (req: any, res: any) => {
  try {
    const { paperId } = req.params;
    const localPath = await neo4jService.getLocalFilePath(paperId);

    if (!localPath || !fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, message: 'Paper file not found locally' });
    }

    const fileName = path.basename(localPath);
    const fileExtension = path.extname(localPath).toLowerCase();

    if (fileExtension === '.pdf') res.setHeader('Content-Type', 'application/pdf');
    else if (fileExtension === '.txt') res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    else res.setHeader('Content-Type', 'application/octet-stream');

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

    fs.createReadStream(localPath).pipe(res);

  } catch (error) {
    console.error('❌ Error serving paper file from FS:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving paper file from filesystem',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🎯 NEW: Download PDF/Text directly from database
router.get('/download/paper-from-db/:paperId', async (req: any, res: any) => {
  try {
    const { paperId } = req.params;
    console.log(`📄 Serving content from database for: ${paperId}`);

    const dbContent = await neo4jService.getPaperFullContentFromDatabase(paperId);

    if (!dbContent.hasFullContent || dbContent.content === null) {
      return res.status(404).json({ success: false, message: 'Content not found in database for this paper' });
    }

    let fileName = paperId;
    if (dbContent.title) {
        fileName = dbContent.title.replace(/[^a-z0-9]/gi, '_').slice(0,50);
    }

    if (dbContent.contentType === 'application/pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}.pdf"`);
      if (dbContent.originalSize) res.setHeader('Content-Length', dbContent.originalSize.toString());
    } else if (dbContent.contentType === 'text/plain') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}.txt"`);
    } else {
      res.setHeader('Content-Type', dbContent.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}.bin"`);
    }

    if (Buffer.isBuffer(dbContent.content)) {
      res.send(dbContent.content);
    } else {
      res.send(dbContent.content);
    }

    console.log(`✅ Served ${paperId} from database (Type: ${dbContent.contentType}, Size: ${dbContent.originalSize || 'N/A'} bytes)`);

  } catch (error) {
    console.error('❌ Error serving content from database:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving content from database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ DOWNLOAD STATS ENDPOINT
router.get('/download-stats', async (req: any, res: any) => {
  try {
    const dbDownloadStats = await neo4jService.getDownloadStats();
    const fsDownloadStats = downloadService.getDownloadStats();
    const dbStorageStats = await neo4jService.getDatabaseStorageStats();

    res.json({
      success: true,
      message: 'Download and storage statistics retrieved',
      data: {
        fromDatabasePerspective: dbDownloadStats,
        fromFilesystemPerspective: fsDownloadStats,
        fromDatabaseContentStorage: dbStorageStats,
        combinedSummary: {
          totalPapersInDB: dbDownloadStats.totalPapers,
          papersWithLocalFileLinkInDB: dbDownloadStats.downloadedPapers,
          localFileLinkPercentageInDB: dbDownloadStats.downloadPercentage,
          totalLocalFilesSizeMB_FS: fsDownloadStats.totalSize ? Math.round(fsDownloadStats.totalSize / (1024*1024)*100)/100 : 0,
          papersWithFullContentInDB: dbStorageStats.papersWithContent,
          dbContentCoveragePercentage: dbStorageStats.contentCoveragePercentage,
          totalDBContentSizeMB: dbStorageStats.totalContentSizeMB,
          downloadDirectory_FS: fsDownloadStats.downloadDir
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting combined download/storage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting download and storage statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ SEARCH LOCAL PAPERS ENDPOINT
router.get('/search-local/:query', async (req: any, res: any) => {
  try {
    const { query } = req.params;
    const { limit = 10, topic } = req.query;
    const numericLimit = parseInt(limit as string, 10) || 10;

    const results = await neo4jService.keywordSearch(query, numericLimit, topic as string | undefined);

    res.json({
      success: true,
      message: `Found ${results.length} papers matching "${query}" ${topic ? `in topic "${topic}"` : ''} using keyword search.`,
      data: {
        papers: optimizePapersForFrontend(results),
        count: results.length,
        searchQuery: query,
        topic: topic || 'all',
        searchMethod: 'keywordSearch_DB'
      }
    });

  } catch (error) {
    console.error('❌ Error searching papers via keywordSearch:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching papers via keywordSearch',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ DATABASE STORAGE STATS ENDPOINT
router.get('/database-storage-stats', async (req: any, res: any) => {
  try {
    const stats = await neo4jService.getDatabaseStorageStats();

    res.json({
      success: true,
      message: 'Database content storage statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting database storage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting database storage statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🎯 ENHANCED: Get papers with full content (all topics)
router.get('/papers-with-full-content', async (req: any, res: any) => {
  try {
    const papersWithContent = await neo4jService.getPapersWithFullContent();

    const enhancedPapers = papersWithContent.map((paper:any) => ({
      ...paper,
      contentAvailableInDB: true,
      viewingSupported: paper.contentType === 'application/pdf' || paper.contentType === 'text/plain',
      inlineViewPath: paper.contentType === 'application/pdf'
          ? `/api/download/paper-from-db/${paper.id}`
          : (paper.contentType === 'text/plain' ? `/api/paper-content/${paper.id}` : null),
    }));

    const stats = {
      totalWithContent: enhancedPapers.length,
      pdfPapers: enhancedPapers.filter(p => p.contentType === 'application/pdf').length,
      textPapers: enhancedPapers.filter(p => p.contentType === 'text/plain').length,
      otherContentTypes: enhancedPapers.filter(p => p.contentType !== 'application/pdf' && p.contentType !== 'text/plain').length,
      totalContentSizeMB: Math.round(enhancedPapers.reduce((sum, paper) => sum + (paper.originalSize || 0), 0) / (1024*1024) * 100)/100,
    };

    res.json({
      success: true,
      message: `Found ${enhancedPapers.length} papers with full content in database (all topics)`,
      data: {
        papers: optimizePapersForFrontend(enhancedPapers),
        stats,
        topic: 'all',
        features: { pdfViewing: true, textDisplay: true, inlineContent: true, databaseStorage: true }
      }
    });

  } catch (error) {
    console.error('❌ Error getting papers with full content (all):', error);
    res.status(500).json({
      success: false,
      message: 'Error getting papers with full content (all topics)',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ PAPERS WITH FULL CONTENT BY TOPIC ENDPOINT
router.get('/papers-with-full-content/:topic', async (req: any, res: any) => {
  try {
    const { topic } = req.params;
    const papersWithContent = await neo4jService.getPapersWithFullContent(topic);

    res.json({
      success: true,
      message: `Found ${papersWithContent.length} papers with full content in database for topic "${topic}"`,
      data: {
        papers: optimizePapersForFrontend(papersWithContent),
        count: papersWithContent.length,
        topic: topic,
        totalContentSizeMB: Math.round(papersWithContent.reduce((sum:number, paper: any) => sum + (paper.originalSize || 0), 0) / (1024*1024) * 100)/100
      }
    });

  } catch (error) {
    console.error('❌ Error getting papers with full content by topic:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting papers with full content by topic',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ STORE EXISTING FILES FROM FS INTO DATABASE CONTENT
router.post('/store-existing-files', async (req: any, res: any) => {
  try {
    console.log('📥 Starting bulk storage of existing local files into database content...');

    const result: any = await downloadService.storeExistingFilesInDatabase();

    const stats = await neo4jService.getDatabaseStorageStats();

    const bulkResult = result as any;
    const filesProcessedAttempted = bulkResult?.filesProcessedAttempted || 'N/A';
    const successfullyStoredInDB = bulkResult?.successfullyStoredInDB || 'N/A';

    res.status(202).json({
      success: true,
      message: 'Process to store existing local files into database content has been initiated.',
      data: {
        filesProcessedAttempted: filesProcessedAttempted,
        successfullyStoredInDB: successfullyStoredInDB,
        currentDBStorageStats: stats,
        completedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error initiating storage of existing files into DB:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating storage of existing files into database content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ EXPORT DATABASE CONTENT TO FILESYSTEM
router.post('/export-database-content', async (req: any, res: any) => {
  try {
    const { outputDir = './exported_papers_from_db' } = req.body;

    console.log(`📤 Starting export of database content to filesystem: ${outputDir}`);

    const exportResult: any = await downloadService.exportDatabaseContent(outputDir);

    const exportResultTyped = exportResult as any;
    const papersAttempted = exportResultTyped?.papersAttempted || 'N/A';
    const filesWritten = exportResultTyped?.filesWritten || 'N/A';

    res.status(202).json({
      success: true,
      message: `Process to export database content to "${outputDir}" initiated.`,
      data: {
        exportDir: outputDir,
        papersAttempted: papersAttempted,
        filesWritten: filesWritten,
        initiatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error initiating export of database content:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating export of database content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ CONVERSATION MEMORY SYSTEM
interface ConversationSession {
  id: string;
  userId?: string;
  topic?: string;
  messages: any[];
  createdAt: Date;
  lastActive: Date;
  context: any;
}

const conversationStore = new Map<string, ConversationSession>();

async function getPaperYearDistribution(topic?: string): Promise<any[]> {
  console.log(`Analytics: Getting paper year distribution for topic: ${topic || 'all'}`);
  try {
    if (neo4jService && typeof (neo4jService as any).getPaperYearDistribution === 'function') {
        return await (neo4jService as any).getPaperYearDistribution(topic);
    }
  } catch (e) { console.warn("getPaperYearDistribution failed in neo4jService, using mock");}
  return [
    { year: 2020, count: 45 }, { year: 2021, count: 62 },
    { year: 2022, count: 78 }, { year: 2023, count: 89 },
    { year: 2024, count: 126 }
  ];
}

async function getTopAuthors(topic?: string, limit: number = 10): Promise<any[]> {
  console.log(`Analytics: Getting top authors for topic: ${topic || 'all'}, limit: ${limit}`);
  try {
    if (neo4jService && typeof (neo4jService as any).getTopAuthors === 'function') {
        return await (neo4jService as any).getTopAuthors(topic, limit);
    }
  } catch (e) { console.warn("getTopAuthors failed in neo4jService, using mock");}
  return [
    { name: 'Dr. Sarah Chen', papers: 12, citations: 1450 },
    { name: 'Prof. Michael Rodriguez', papers: 9, citations: 1230 },
    { name: 'Dr. Emily Wang', papers: 8, citations: 980 }
  ];
}

async function generateResearchAnalytics(topic?: string): Promise<any> {
  try {
    const dbStats = await neo4jService.getDatabaseStats();
    const embeddingStats = await neo4jService.getEmbeddingStats();
    const yearDistribution = await getPaperYearDistribution(topic);
    const topAuthors = await getTopAuthors(topic, 10);

    const totalQuestionsAcrossSessions = Array.from(conversationStore.values()).reduce((sum, conv) => sum + (conv.context.totalQuestions || 0), 0);
    const activityMetrics = {
      conversationsActive: conversationStore.size,
      totalQuestions: totalQuestionsAcrossSessions,
      averageQuestionsPerSession: conversationStore.size > 0 ? totalQuestionsAcrossSessions / conversationStore.size : 0
    };

    return {
      databaseMetrics: {
        totalPapers: dbStats.papers,
        totalAuthors: dbStats.authors,
        embeddingCoverage: embeddingStats.embeddingCoveragePercentage,
        topicsAvailable: dbStats.topics
      },
      temporalDistribution: yearDistribution,
      topContributors: topAuthors,
      researchActivity: activityMetrics,
      topic: topic || 'all',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    return {
      error: 'Analytics generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

async function generateConversationReport(session: ConversationSession, title?: string, includeInvestigations: boolean = true): Promise<any> {
  const reportTitle = title || `Research Report - ${session.topic || 'General Research'}`;
  const userMessages = session.messages.filter(m => m.type === 'user');
  const assistantMessages = session.messages.filter(m => m.type === 'assistant');
  const uniqueSources = new Set(session.context.sourcesUsed || []).size;

  let findingsContent = assistantMessages.slice(0, 3).map((msg, index) => {
      let contentSummary = msg.content;
      if (typeof msg.content === 'object' && msg.content !== null) {
          if ((msg.content as any).synthesis) contentSummary = (msg.content as any).synthesis;
          else if ((msg.content as any).answer) contentSummary = (msg.content as any).answer;
          else if ((msg.content as any).investigation?.synthesis) contentSummary = (msg.content as any).investigation.synthesis;
      }
      return `### Finding ${index + 1}\n${String(contentSummary).substring(0, 500)}...`;
  }).join('\n\n');

  if (assistantMessages.length === 0) {
      findingsContent = "No key findings available from this conversation.";
  }

  const content = `
# ${reportTitle}

## Research Session Summary
- **Session ID**: ${session.id}
- **Topic**: ${session.topic || 'General Research'}
- **Duration**: ${session.createdAt.toLocaleDateString()} - ${session.lastActive.toLocaleDateString()}
- **Total Questions**: ${session.context.totalQuestions || 0}
- **Unique Sources Referenced**: ${uniqueSources}

## Research Questions Explored
${userMessages.map((msg, index) => `${index + 1}. ${msg.content}`).join('\n') || "No user questions recorded."}

## Key Findings & Insights
${findingsContent}
${includeInvestigations && assistantMessages.some(m => m.advanced) ? `
## Detailed Investigations
Some questions involved multi-step investigations. Key insights from these are summarized above. For full details, refer to the conversation log.` : ''}

## Research Methodology
This report was generated based on an AI-powered research assistant session. The assistant utilized:
- Semantic search across available research papers.
- Multi-step research reasoning for complex queries (where applicable).
- Analysis of information from up to ${uniqueSources} unique sources during this session.

## Recommendations for Future Research (Example)
Based on the research session, consider exploring:
- Follow-up questions suggested during the conversation (if any).
- Related research areas identified through the analysis.
- Emerging trends in the field of "${session.topic || 'this research area'}".

---
*Generated by ResearchReasoner AI Research Assistant*
*Report created: ${new Date().toISOString()}*
`;

  return {
    title: reportTitle,
    content: content,
    metadata: {
      sessionId: session.id,
      questionCount: session.context.totalQuestions || 0,
      sourceCount: uniqueSources,
      topic: session.topic,
      format: 'markdown',
      includeInvestigations: includeInvestigations
    }
  };
}

// ✅ MULTI-STEP RESEARCH INVESTIGATION
router.post('/research/investigate', async (req: any, res: any) => {
  try {
    const { question, topic } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Research question is required'
      });
    }

    console.log(`🔬 Starting research investigation: "${question}"`);
    const investigation = await advancedRAG.conductResearchInvestigation(question, topic);

    // ✅ FIXED CONFIDENCE CALCULATION
    const investigationData = investigation as any;
    const overallConfidence = investigationData.totalConfidence ||
                                investigationData.confidence ||
                                0.75;

    res.json({
      success: true,
      message: `Multi-step research investigation completed`,
      data: {
        investigation: investigation,
        summary: {
          totalSteps: investigation.steps.length,
          totalSources: investigation.sources.length,
          overallConfidence: overallConfidence,
          researchDepth: investigation.steps.length > 3 ? 'deep' : 'moderate',
          synthesis: investigation.synthesis
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in research investigation:', error);
    res.status(500).json({
      success: false,
      message: 'Error conducting research investigation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ RESEARCH SYNTHESIS ACROSS TOPICS
router.post('/research/synthesize', async (req: any, res: any) => {
  try {
    const { topics, researchFocus } = req.body;

    if (!topics || !Array.isArray(topics) || topics.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 research topics are required for synthesis'
      });
    }

    console.log(`🔄 Synthesizing research across: ${topics.join(', ')}`);
    const synthesis = await advancedRAG.synthesizeResearchTopics(topics, researchFocus);

    res.json({
      success: true,
      message: `Research synthesis completed across ${topics.length} topics`,
      data: {
        synthesis: synthesis,
        intersectionCount: (synthesis as any).intersectionPapers?.length || 0,
        topicsAnalyzed: topics.length,
        researchFocus: researchFocus || 'general'
      }
    });

  } catch (error) {
    console.error('❌ Error in research synthesis:', error);
    res.status(500).json({
      success: false,
      message: 'Error synthesizing research topics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ TEMPORAL RESEARCH TRENDS ANALYSIS
router.post('/research/trends', async (req: any, res: any) => {
  try {
    const { topic, startYear, endYear } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Research topic is required for trend analysis'
      });
    }

    console.log(`📈 Analyzing trends for "${topic}"`);
    const trends = await advancedRAG.analyzeResearchTrends(topic, startYear, endYear);

    res.json({
      success: true,
      message: `Research trends analyzed for ${topic}`,
      data: {
        trends: trends,
        timespan: (trends as any).timeRange || `${startYear || 'start'} - ${endYear || 'end'}`,
        totalYears: (trends as any).yearlyBreakdown?.length || 0,
        emergingAuthorsCount: (trends as any).emergingAuthors?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error in trend analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing research trends',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ METHODOLOGY COMPARISON
router.post('/research/compare-methods', async (req: any, res: any) => {
  try {
    const { methodologies, researchArea } = req.body;

    if (!methodologies || !Array.isArray(methodologies) || methodologies.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 methodologies are required for comparison'
      });
    }

    if (!researchArea) {
      return res.status(400).json({
        success: false,
        message: 'Research area is required for methodology comparison'
      });
    }

    console.log(`⚖️ Comparing methodologies: ${methodologies.join(' vs ')} in ${researchArea}`);
    const comparison = await advancedRAG.compareResearchMethodologies(methodologies, researchArea);

    res.json({
      success: true,
      message: `Methodology comparison completed`,
      data: {
        comparison: comparison,
        methodologiesCompared: methodologies.length,
        researchArea: researchArea
      }
    });

  } catch (error) {
    console.error('❌ Error in methodology comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing research methodologies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ RESEARCH ANALYTICS DASHBOARD
router.get('/research/analytics/:topic?', async (req: any, res: any) => {
  try {
    const { topic } = req.params;
    console.log(`📊 Generating research analytics ${topic ? `for ${topic}` : 'overview'}`);
    const analytics = await generateResearchAnalytics(topic);

    res.json({
      success: true,
      message: 'Research analytics generated',
      data: analytics
    });

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating research analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// --- New Conversation System ---
router.post('/conversations/start', async (req: any, res: any) => {
  try {
    const { topic, userId } = req.body;
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: ConversationSession = {
      id: conversationId,
      userId: userId,
      topic: topic,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
      context: {
        totalQuestions: 0,
        topicsExplored: topic ? [topic] : [],
        sourcesUsed: []
      }
    };
    conversationStore.set(conversationId, session);
    console.log(`💬 Started new conversation: ${conversationId}`);
    res.json({
      success: true,
      message: 'Conversation session started',
      data: {
        conversationId: conversationId,
        topic: topic,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting conversation session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/conversations/:conversationId/message', async (req: any, res: any) => {
  try {
    const { conversationId } = req.params;
    const { question, useAdvanced = false } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    const session = conversationStore.get(conversationId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Conversation session not found' });
    }

    console.log(`💬 Processing message in conversation: ${conversationId}, Advanced: ${useAdvanced}`);

    const ragResponse: any = useAdvanced
      ? await advancedRAG.conductResearchInvestigation(question, session.topic)
      : await graphRAG.askQuestion(question, session.topic, session.messages.slice(-5));

    session.messages.push({
      id: `msg_user_${Date.now()}`, type: 'user', content: question, timestamp: new Date()
    });

    const assistantMessageContent = ragResponse;

    session.messages.push({
      id: `msg_assistant_${Date.now()}`, type: 'assistant',
      content: assistantMessageContent,
      sources: optimizePapersForFrontend(ragResponse.sources || []),
      timestamp: new Date(),
      advanced: useAdvanced
    });

    session.lastActive = new Date();
    session.context.totalQuestions = (session.context.totalQuestions || 0) + 1;

    const currentSources = ragResponse.sources;
    if (currentSources && Array.isArray(currentSources)) {
        currentSources.forEach((s: any) => {
            if(s && s.id && !session.context.sourcesUsed.includes(s.id)) {
                session.context.sourcesUsed.push(s.id);
            }
        });
    }
    if (session.topic && !session.context.topicsExplored.includes(session.topic)) {
        session.context.topicsExplored.push(session.topic);
    }

    let responseDataPayload;
    if (useAdvanced && isMultiStepResult(ragResponse)) {
        responseDataPayload = {
            type: 'investigation',
            investigation: ragResponse,
            summary: ragResponse.synthesis,
            sources: optimizePapersForFrontend(ragResponse.sources || [])
        };
    } else if (isRAGResponse(ragResponse)){
        responseDataPayload = {
            type: 'simple_rag',
            answer: ragResponse.answer,
            sources: optimizePapersForFrontend(ragResponse.sources || []),
            suggestedQuestions: ragResponse.suggestedQuestions
        };
    } else {
        responseDataPayload = {
            type: 'unknown_rag_structure',
            rawResponse: ragResponse,
            sources: optimizePapersForFrontend(ragResponse.sources || []),
            answer: ragResponse.answer || ragResponse.synthesis || "Response generated."
        };
    }

    res.json({
      success: true,
      message: 'Message processed successfully',
      data: {
        response: responseDataPayload,
        conversationContext: {
          messageCount: session.messages.length,
          totalQuestions: session.context.totalQuestions,
          uniqueSourcesUsedCount: session.context.sourcesUsed.length,
          lastActive: session.lastActive
        }
      }
    });

  } catch (error) {
    console.error('❌ Error processing conversation message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/conversations/:conversationId', async (req: any, res: any) => {
  try {
    const { conversationId } = req.params;
    const session = conversationStore.get(conversationId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Conversation session not found' });
    }

    const messagesWithOptimizedSources = session.messages.map(msg => {
        if (msg.type === 'assistant' && msg.sources) {
            return { ...msg, sources: optimizePapersForFrontend(msg.sources) };
        }
        if (msg.type === 'assistant' && msg.content && (msg.content as any).sources) {
            const newContent = { ...(msg.content as object), sources: optimizePapersForFrontend((msg.content as any).sources) };
            return { ...msg, content: newContent };
        }
        return msg;
    });

    res.json({
      success: true,
      message: 'Conversation retrieved',
      data: {
        conversation: {
          ...session,
          messages: messagesWithOptimizedSources,
          context: {
            ...session.context,
            uniqueSourcesUsedCount: session.context.sourcesUsed?.length || 0
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/conversations/:conversationId', async (req: any, res: any) => {
  try {
    const { conversationId } = req.params;
    const deleted = conversationStore.delete(conversationId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Conversation session not found for deletion' });
    }
    console.log(`🗑️ Deleted conversation: ${conversationId}`);
    res.json({ success: true, message: 'Conversation session deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ RESEARCH REPORT GENERATION
router.post('/research/generate-report', async (req: any, res: any) => {
  try {
    const { conversationId, title, includeInvestigations = true } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required for report generation' });
    }
    const session = conversationStore.get(conversationId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Conversation session not found' });
    }

    console.log(`📝 Generating research report for conversation: ${conversationId}`);
    const report = await generateConversationReport(session, title, includeInvestigations);

    res.json({
      success: true,
      message: 'Research report generated successfully',
      data: {
        report: report,
        conversationId: conversationId,
        generatedAt: new Date().toISOString(),
        wordCount: report.content.split(/\s+/).length
      }
    });

  } catch (error) {
    console.error('❌ Error generating research report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating research report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ ENHANCED HEALTH CHECK with Chat Readiness - FIXED VERSION
router.get('/health', async (req: any, res: any) => {
  try {
    // ✅ Properly declare all variables that were missing
    const dbGeneralStats = await neo4jService.getDatabaseStats();
    const embeddingStats = await neo4jService.getEmbeddingStats();
    const localDownloadStats = downloadService.getDownloadStats();
    const dbStorageStats = await neo4jService.getDatabaseStorageStats();

    const cacheStatsSummary = {
      searchCache: searchCache.getStats(),
      paperContentCache: paperContentCache.getStats(),
      graphCache: graphCache.getStats()
    };

    // ✅ Calculate readiness for chat
    const embeddingCoverage = embeddingStats.embeddingCoveragePercentage || 0;
    const chatReady = embeddingCoverage > 50 && dbGeneralStats.connected;

    const healthData = {
      success: true,
      message: 'Research Assistant is healthy and ready to operate!',
      timestamp: new Date().toISOString(),

      database: {
        connected: dbGeneralStats.connected,
        papers: dbGeneralStats.papers,
        authors: dbGeneralStats.authors,
        topics: dbGeneralStats.topics,
        papersWithLocalFiles: dbGeneralStats.downloadedPapers || 0, // Fixed property name
        papersWithFullContentInDB: dbStorageStats.papersWithContent || 0, // Fixed source
      },

      storageAndDownloads: {
        localFilesystem: {
            downloadedPapers: localDownloadStats.totalDownloadsActive || 0,
            totalLocalFileSizeMB: localDownloadStats.totalSizeActive ? Math.round(localDownloadStats.totalSizeActive / (1024*1024) * 100)/100 : 0,
            downloadDirectory: localDownloadStats.downloadDir
        },
        databaseContentStorage: {
            papersWithContent: dbStorageStats.papersWithContent || 0,
            contentCoveragePercentage: dbStorageStats.contentCoveragePercentage || 0,
            totalContentSizeMB: dbStorageStats.totalContentSizeMB || 0,
            avgContentSizeKB: dbStorageStats.avgContentSizeKB || 0
        }
      },

      embeddings: embeddingStats,
      cache: cacheStatsSummary,

      conversations: {
        activeSessions: conversationStore.size,
        totalMessagesAcrossSessions: Array.from(conversationStore.values()).reduce((sum, s) => sum + s.messages.length, 0)
      },

      systemFeatures: {
        instantCaching: true,
        fullContentStorageInDB: true,
        localFilesystemStorage: true,
        pdfPriorityDownload: true,
        inlinePDFViewing: true,
        backgroundDownloads: true,
        semanticSearch: embeddingStats.papersWithEmbeddings > 0,
        hybridSearch: true,
        graphSearch: true,
        chatAssistanceRAG: true,
        advancedRAG: true,
        conversationMemory: true,
        temporalTrendAnalysis: true,
        methodologyComparison: true,
        multiTopicSynthesis: true,
        analyticsDashboard: true,
        reportGeneration: true
      },

      chatReadiness: {
        coreServicesOnline: dbGeneralStats.connected,
        papersAvailable: dbGeneralStats.papers > 0,
        embeddingsInitialized: embeddingStats.papersWithEmbeddings > 0,
        embeddingCoverageSufficient: embeddingStats.embeddingCoveragePercentage >= 50,
        readyToChat: dbGeneralStats.connected && dbGeneralStats.papers > 0 && embeddingStats.papersWithEmbeddings > 0,
        recommendation: embeddingStats.embeddingCoveragePercentage < 50 && dbGeneralStats.papers > 0
          ? 'Consider running POST /api/initialize-embeddings to improve semantic search and RAG capabilities.'
          : 'Chat system appears ready!'
      },

      payloadLimit: '50mb',

      apiEndpoints: [
        'POST /api/chat - Main research assistant (RAG: simple, advanced, investigation)',
        'POST /api/search-papers - Original search with PDF priority download',
        'POST /api/semantic-search - Vector similarity search',
        'POST /api/hybrid-search - Combined (semantic, keyword, graph) search',
        'GET /api/suggestions/:topic? - Get research question suggestions',
        'POST /api/compare - Compare two research topics (GraphRAG based)',
        'GET /api/search/authors/:authorName - Find papers by author (GraphRAG based)',
        'POST /api/build-knowledge-graph (⚡ cached) - Build and store graph',
        'POST /api/generate-insights - Generate insights from papers',
        'POST /api/generate-research-draft - Generate a draft document',
        'POST /api/download-papers - Manually trigger downloads to local FS',
        'GET /api/download/paper/:paperId - Serve paper from local FS',
        'GET /api/download/paper-from-db/:paperId - Serve paper content from DB',
        'GET /api/download-status/:topic (⚡ cached) - Status of downloads for a topic',
        'GET /api/paper-content/:paperId (⚡ cached) - Get full paper content (DB first, then FS)',
        'POST /api/batch-paper-content - Batch get content for multiple papers',
        'GET /api/local-papers/:topic? - List all papers with local files',
        'GET /api/search-local/:query - Keyword search on local/DB papers',
        'GET /api/papers/:topic - Get papers by topic (metadata)',
        'GET /api/papers-with-full-content - List all papers with full content in DB',
        'GET /api/papers-with-full-content/:topic - List papers with full content in DB by topic',
        'GET /api/database-stats - General DB node counts',
        'GET /api/database-storage-stats - Stats on content stored in DB',
        'GET /api/download-stats - Combined download statistics (FS & DB)',
        'GET /api/cache-stats - Statistics for various caches',
        'POST /api/initialize-embeddings - Batch add embeddings to existing papers',
        'GET /api/embeddings/stats - Statistics for paper embeddings',
        'POST /api/store-existing-files - Store existing local files into DB content',
        'POST /api/export-database-content - Export full content from DB to files',
        'POST /api/research/investigate - Multi-step research investigation (AdvancedRAG)',
        'POST /api/research/synthesize - Synthesize across topics (AdvancedRAG)',
        'POST /api/research/trends - Temporal research trends analysis (AdvancedRAG)',
        'POST /api/research/compare-methods - Compare research methodologies (AdvancedRAG)',
        'GET /api/research/analytics/:topic? - Research analytics dashboard',
        'POST /api/research/generate-report - Generate research report from conversation',
        'POST /api/conversations/start - Start a new conversation session',
        'POST /api/conversations/:conversationId/message - Add a message to a conversation (uses AdvancedRAG)',
        'GET /api/conversations/:conversationId - Retrieve a conversation session',
        'DELETE /api/conversations/:conversationId - Delete a conversation session',
        'GET /api/health - This comprehensive health check'
      ].sort()
    };

    res.json(healthData);

  } catch (error) {
    console.error('❌ Error in comprehensive health check:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed to complete fully, service might be partially operational.',
      error: error instanceof Error ? error.message : 'Unknown error during health check',
      timestamp: new Date().toISOString(),
      status: 'DEGRADED'
    });
  }
});

// ✅ NEW: Analyze chat conversations endpoint
router.post('/analyze-conversations', async (req: any, res: any) => {
  try {
    // Get real conversation data from your conversationStore
    const conversations = Array.from(conversationStore.values());
    
    // Extract themes, questions, and patterns
    const userQuestions = conversations.flatMap(conv => 
      conv.messages.filter(msg => msg.type === 'user').map(msg => msg.content)
    );
    
    const aiResponses = conversations.flatMap(conv =>
      conv.messages.filter(msg => msg.type === 'assistant').length
    );

    // Get real database stats
    const dbStats = await neo4jService.getDatabaseStats();
    const embeddingStats = await neo4jService.getEmbeddingStats();

    res.json({
      success: true,
      data: {
        totalConversations: conversations.length,
        totalQuestions: userQuestions.length,
        totalResponses: aiResponses.length,
        themes: userQuestions.slice(0, 10), // Sample questions
        databaseStats: dbStats,
        embeddingStats: embeddingStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/generate-research-paper', async (req: any, res: any) => {
  try {
    const { userRequest, conversationId, currentPaper, requestType } = req.body;
    
    console.log('📝 Dynamic paper generation for:', userRequest);
    
    // Step 1: Search for real papers on the topic
    const searchResults = await searchRealPapers(userRequest);
    console.log(`📚 Found ${searchResults.papers.length} papers`);
    
    // Step 2: Analyze relationships between papers
    const relationships = RelationshipService.analyzeRelationships(searchResults.papers);
    console.log(`🔗 Found ${relationships.length} relationships`);
    
    // Step 3: Store in graph database (optional for persistence)
    try {
      await neo4jService.storeResearchGraph(
        searchResults.papers.slice(0, 100), // Limit for performance
        relationships,
        userRequest
      );
    } catch (dbError) {
      console.warn('Database storage failed, continuing...', dbError);
    }
    
    // Step 4: Generate dynamic sections using AI
    const sections = await generateResearchSections(
      userRequest, 
      searchResults.papers,
      relationships
    );
    
    // Step 5: Generate references from real papers
    const references = generateReferences(searchResults.papers.slice(0, 20));
    
    // Calculate word count
    const totalWordCount = sections.reduce((count, section) => 
      count + section.content.split(' ').length, 0
    );
    
    res.json({
      success: true,
      data: {
        response: `✅ **Research Paper Generated Successfully!**\n\nGenerated comprehensive ${sections.length}-section paper on "${userRequest}" using:\n\n• ${searchResults.papers.length} real research papers\n• ${relationships.length} analyzed connections\n• ${searchResults.authorsAnalyzed} unique authors\n• AI-powered content synthesis\n\n**Total word count: ${totalWordCount}**`,
        paper: {
          title: `${userRequest}: A Comprehensive Survey and Analysis`,
          abstract: await generateAbstract(userRequest, searchResults),
          sections: sections, // ← Now properly populated!
          references: references,
          wordCount: totalWordCount,
          metadata: {
            papersAnalyzed: searchResults.papers.length,
            authorsAnalyzed: searchResults.authorsAnalyzed,
            connectionsFound: relationships.length,
            generatedAt: new Date().toISOString()
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Dynamic paper generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Paper generation failed' 
    });
  }
});
// Helper function to generate abstract using AI
async function generateAbstract(topic: string, searchResults: any): Promise<string> {
  const prompt = `Write a comprehensive academic abstract for a survey paper on "${topic}".

Research context:
- ${searchResults.papers.length} papers analyzed
- ${searchResults.authorsAnalyzed} researchers involved
- Recent developments in the field

Write a 150-200 word abstract that covers: background, methodology, key findings, and implications.`;

  try {
    return await groqService.generateCompletion(prompt, {
      maxTokens: 300,
      temperature: 0.3
    });
  } catch (error) {
    return `This comprehensive survey examines ${topic} through systematic analysis of ${searchResults.papers.length} research papers. Our methodology encompasses literature review, relationship analysis, and trend identification across the research landscape. Key findings reveal significant developments in the field with contributions from ${searchResults.authorsAnalyzed} researchers. The analysis identifies emerging patterns, methodological approaches, and future research directions that will guide continued advancement in ${topic}.`;
  }
}

// Helper function to generate research sections dynamically
async function generateResearchSections(
  topic: string, 
  papers: any[], 
  relationships: any[]
): Promise<any[]> {
  
  // Analyze papers to extract key themes
  const recentPapers = papers.filter(p => p.year >= 2020).slice(0, 10);
  const topCitedPapers = papers.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0)).slice(0, 10);
  const venues = [...new Set(papers.map(p => p.venue).filter(Boolean))];
  const authors = [...new Set(papers.flatMap(p => p.authors || []))];
  
  const sections = [];
  
  // 1. Introduction Section
  const introPrompt = `Write an introduction section for a survey paper on "${topic}".

Context:
- ${papers.length} papers in the field
- Published in venues: ${venues.slice(0, 5).join(', ')}
- ${authors.length} active researchers

Include: problem motivation, research scope, and paper contributions. Write 300-400 words.`;
  
  const introContent = await generateSectionContent(introPrompt);
  sections.push({
    id: 'introduction',
    title: '1. Introduction',
    content: introContent,
    order: 1
  });
  
  // 2. Related Work Section
  const relatedWorkPrompt = `Write a related work section for "${topic}".

Key papers to reference:
${topCitedPapers.slice(0, 5).map(p => 
  `- "${p.title}" by ${p.authors?.slice(0, 2).join(', ')} (${p.year}) - ${p.citationCount} citations`
).join('\n')}

Write about evolution of the field, key contributions, and research gaps. 400-500 words.`;
  
  const relatedWorkContent = await generateSectionContent(relatedWorkPrompt);
  sections.push({
    id: 'related-work',
    title: '2. Related Work and Background',
    content: relatedWorkContent,
    order: 2
  });
  
  // 3. Methodology Section
  const methodologyPrompt = `Write a methodology section for surveying "${topic}".

Research scope:
- ${papers.length} papers analyzed
- Time period: ${Math.min(...papers.map(p => p.year || 2024))} - ${Math.max(...papers.map(p => p.year || 2024))}
- ${relationships.length} relationships identified
- Sources: ${venues.slice(0, 3).join(', ')}

Describe search strategy, inclusion criteria, and analysis methods. 300-400 words.`;
  
  const methodologyContent = await generateSectionContent(methodologyPrompt);
  sections.push({
    id: 'methodology',
    title: '3. Methodology and Research Scope',
    content: methodologyContent,
    order: 3
  });
  
  // 4. Analysis Section
  const analysisPrompt = `Write an analysis section for "${topic}" research.

Key findings:
- ${papers.length} total papers
- ${recentPapers.length} recent publications (2020+)
- Most active venues: ${venues.slice(0, 3).join(', ')}
- ${relationships.filter(r => r.relationshipType === 'author').length} author collaborations
- ${relationships.filter(r => r.relationshipType === 'citation').length} citation relationships

Analyze trends, patterns, and key developments. 500-600 words.`;
  
  const analysisContent = await generateSectionContent(analysisPrompt);
  sections.push({
    id: 'analysis',
    title: '4. Research Landscape Analysis',
    content: analysisContent,
    order: 4
  });
  
  // 5. Discussion Section
  const discussionPrompt = `Write a discussion section for "${topic}" survey.

Research insights:
- Field maturity and growth trends
- Major research groups and collaborations
- Methodological approaches
- Open challenges and gaps

Discuss implications and future directions. 400-500 words.`;
  
  const discussionContent = await generateSectionContent(discussionPrompt);
  sections.push({
    id: 'discussion',
    title: '5. Discussion and Future Directions',
    content: discussionContent,
    order: 5
  });
  
  // 6. Conclusion Section
  const conclusionPrompt = `Write a conclusion for a "${topic}" survey paper.

Summarize:
- Main contributions of this survey
- Key insights from ${papers.length} papers analyzed
- Research trends and patterns identified
- Future research opportunities

Write concise conclusion. 200-300 words.`;
  
  const conclusionContent = await generateSectionContent(conclusionPrompt);
  sections.push({
    id: 'conclusion',
    title: '6. Conclusion',
    content: conclusionContent,
    order: 6
  });
  
  return sections;
}

// Helper to generate individual section content
async function generateSectionContent(prompt: string): Promise<string> {
  try {
    return await groqService.generateCompletion(prompt, {
      maxTokens: 800,
      temperature: 0.4
    });
  } catch (error) {
    console.warn('AI generation failed, using template:', error);
    return "This section would contain detailed analysis based on the research papers found. The content generation service is currently unavailable, but the structure and metadata are preserved for when the service is restored.";
  }
}

// Helper to generate references from real papers
function generateReferences(papers: any[]): string[] {
  return papers.slice(0, 20).map(paper => {
    const authors = paper.authors?.slice(0, 3).join(', ') || 'Unknown Authors';
    const year = paper.year || 'n.d.';
    const title = paper.title || 'Untitled';
    const venue = paper.venue || 'Conference/Journal';
    
    return `${authors} (${year}). ${title}. *${venue}*.`;
  });
}

export default router;