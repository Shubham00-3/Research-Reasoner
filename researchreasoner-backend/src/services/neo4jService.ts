// neo4jService.ts - With Full PDF Content and Vector Embeddings for RAG

import neo4j, { Driver, Session, Integer } from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import axios from 'axios'; 

class Neo4jService {
  protected driver: Driver | null = null;
  protected connected = false;

  constructor() {
    this.connect();
  }
  

  /**
   * Safely converts Neo4j Integer values to regular JavaScript numbers
   * Handles both Neo4j Integer objects and regular numbers
   */
  private safeToNumber(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    // If it's already a regular number
    if (typeof value === 'number') {
      return value;
    }

    // If it's a Neo4j Integer object
    if (value && typeof value === 'object') {
      // Try the toNumber method if it exists
      if (typeof value.toNumber === 'function') {
        return value.toNumber();
      }

      // Try the low property (for Neo4j integers)
      if (typeof value.low === 'number') {
        return value.low;
      }

      // Try converting to string then number
      if (value.toString) {
        const stringValue = value.toString();
        const numberValue = parseInt(stringValue, 10);
        return isNaN(numberValue) ? 0 : numberValue;
      }
    }

    // Try direct conversion
    const converted = Number(value);
    return isNaN(converted) ? 0 : converted;
  }

  private async connect() {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const username = process.env.NEO4J_USERNAME || 'neo4j';
      const password = process.env.NEO4J_PASSWORD || 'password123';

      // Debug log to verify env variables (do not print full password)
      console.log(
        `🔧 Neo4j config → uri: ${uri}, user: ${username}, passLen: ${password ? password.length : 0}`
      );

      // Configure encryption based on URI scheme
      const isSecureUri = uri.includes('+s://') || uri.includes('neo4j+s://') || uri.includes('bolt+s://');
      const config: any = {
        maxConnectionLifetime: 30 * 60 * 1000,
        maxConnectionPoolSize: 100,
        connectionAcquisitionTimeout: 60000,
        disableLosslessIntegers: true
      };

      // Only add encryption config if NOT using secure URI scheme
      if (!isSecureUri) {
        config.encrypted = 'ENCRYPTION_OFF';
        config.trust = 'TRUST_ALL_CERTIFICATES';
      }

      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), config);

      const session = this.driver.session();
      try {
        await Promise.race([
          session.run('RETURN 1'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
        await session.close();

        this.connected = true;
        console.log('✅ Neo4j connection established');
      } catch (error) {
        await session.close();
        throw error;
      }
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error);
      this.connected = false;

      console.log('\n🔍 Troubleshooting steps:');
      console.log('1. Ensure Neo4j server is running');
      console.log('2. Check if Neo4j is accessible at:', process.env.NEO4J_URI || 'bolt://localhost:7687');
      console.log('3. Verify username and password');
      console.log('4. Check Neo4j logs for any errors');
      console.log('5. If using Neo4j Desktop, ensure the database is started');
      console.log('6. Try restarting the Neo4j server\n');
    }
  }

  // --- Embedding Generation Methods ---

  /**
   * Generates high-quality embeddings using TF-IDF and semantic features
   * This works entirely locally without requiring external APIs
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      console.log(`🔢 Generating local embedding for text (${text.length} chars)`);

      // Use the enhanced local embedding instead of API calls
      return this.generateEnhancedEmbedding(text);

    } catch (error: any) {
      console.warn(`⚠️ Error generating embedding: ${error.message}. Using fallback.`);
      return this.generateSimpleEmbedding(text);
    }
  }

  /**
   * Enhanced local embedding generator using TF-IDF and semantic features
   * This creates much better embeddings than the simple hash approach
   */
  private generateEnhancedEmbedding(text: string): number[] {
    const embedding = new Array(512).fill(0.0); // Increased to 512 dimensions

    if (!text || text.trim().length === 0) {
      return embedding;
    }

    // Clean and tokenize text
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanText.split(' ').filter(w => w.length > 2);

    if (words.length === 0) return embedding;

    // 1. WORD FREQUENCY FEATURES (dimensions 0-255)
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Normalize frequencies and map to embedding dimensions
    const maxFreq = Math.max(...wordFreq.values());
    let dimIndex = 0;

    for (const [word, freq] of wordFreq.entries()) {
      if (dimIndex >= 256) break;

      const normalizedFreq = freq / maxFreq;
      const hash = this.enhancedHash(word);
      embedding[dimIndex % 256] += normalizedFreq;
      embedding[(hash % 256)] += normalizedFreq * 0.5;
      dimIndex++;
    }

    // 2. N-GRAM FEATURES (dimensions 256-383)
    const bigrams = this.generateNGrams(words, 2);
    const trigrams = this.generateNGrams(words, 3);

    [...bigrams, ...trigrams].forEach((ngram, index) => {
      if (index >= 128) return;
      const hash = this.enhancedHash(ngram);
      embedding[256 + (hash % 128)] += 1.0 / Math.sqrt(ngram.split(' ').length);
    });

    // 3. SEMANTIC FEATURES (dimensions 384-511)
    const semanticFeatures = this.extractSemanticFeatures(text, words);
    semanticFeatures.forEach((value, index) => {
      if (index < 128) {
        embedding[384 + index] = value;
      }
    });

    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  /**
   * Generate n-grams from word array
   */
  private generateNGrams(words: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  /**
   * Extract semantic features from text
   */
  private extractSemanticFeatures(text: string, words: string[]): number[] {
    const features = new Array(128).fill(0.0);

    // Research domain indicators
    const domains = {
      'machine_learning': ['learning', 'neural', 'network', 'algorithm', 'model', 'training'],
      'nlp': ['language', 'text', 'word', 'semantic', 'parsing', 'embedding'],
      'computer_vision': ['image', 'visual', 'pixel', 'detection', 'recognition', 'convolution'],
      'robotics': ['robot', 'control', 'motion', 'sensor', 'autonomous', 'manipulation'],
      'theory': ['theorem', 'proof', 'complexity', 'analysis', 'mathematical', 'optimization']
    };

    let featureIndex = 0;

    // Domain relevance scores
    for (const [domain, keywords] of Object.entries(domains)) {
      if (featureIndex >= features.length) break;

      const domainScore = keywords.reduce((score, keyword) => {
        const occurrences = words.filter(w => w.includes(keyword)).length;
        return score + occurrences;
      }, 0) / Math.max(words.length, 1);

      features[featureIndex++] = domainScore;
    }

    // Text statistics
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
    const uniqueWordRatio = new Set(words).size / Math.max(words.length, 1);
    const capitalizedWords = (text.match(/[A-Z][a-z]+/g) || []).length;

    if (featureIndex < features.length) features[featureIndex++] = avgWordLength / 10; // Normalize
    if (featureIndex < features.length) features[featureIndex++] = uniqueWordRatio;
    if (featureIndex < features.length) features[featureIndex++] = capitalizedWords / Math.max(words.length, 1);

    // Research paper specific features
    const methodWords = ['method', 'approach', 'technique', 'framework', 'system'];
    const resultWords = ['result', 'performance', 'accuracy', 'evaluation', 'experiment'];
    const noveltyWords = ['novel', 'new', 'improved', 'enhanced', 'proposed'];

    const methodScore = methodWords.reduce((score, word) =>
      score + words.filter(w => w.includes(word)).length, 0) / Math.max(words.length, 1);
    const resultScore = resultWords.reduce((score, word) =>
      score + words.filter(w => w.includes(word)).length, 0) / Math.max(words.length, 1);
    const noveltyScore = noveltyWords.reduce((score, word) =>
      score + words.filter(w => w.includes(word)).length, 0) / Math.max(words.length, 1);

    if (featureIndex < features.length) features[featureIndex++] = methodScore;
    if (featureIndex < features.length) features[featureIndex++] = resultScore;
    if (featureIndex < features.length) features[featureIndex++] = noveltyScore;

    return features;
  }

  /**
   * Enhanced hash function with better distribution
   */
  private enhancedHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }

    // Second hash for better distribution
    hash = hash ^ (hash >>> 16);
    hash = Math.imul(hash, 0x85ebca6b);
    hash = hash ^ (hash >>> 13);
    hash = Math.imul(hash, 0xc2b2ae35);
    hash = hash ^ (hash >>> 16);

    return Math.abs(hash);
  }

  /**
   * Simple fallback embedding (keep existing for compatibility)
   */
  private generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const embedding = new Array(384).fill(0.0);

    if (words.length === 0) return embedding;

    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      embedding[hash % 384] += 1.0 / (index + 1.0);
    });

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  /**
   * Simple hash function (keep existing)
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }


  // --- Paper Storage and Management ---

  /**
   * Stores a single paper with its full content (if provided) and generated embeddings.
   */
  async storePaperWithEmbeddings(paper: any, topic: string, fileContent?: Buffer | string): Promise<void> {
    if (!this.connected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();

    try {
      const textForEmbedding = `${paper.title || ''} ${paper.abstract || ''}`.substring(0, 2000);
      const embeddings = await this.generateEmbeddings(textForEmbedding); // Uses new embedding logic

      console.log(`🔢 Generated ${embeddings.length}-dimensional embedding for: ${paper.title || paper.id}`);

      let contentBase64: string | null = null;
      let contentType: string | null = null;
      let originalSize: number = 0;

      if (fileContent) {
        if (Buffer.isBuffer(fileContent)) {
          contentBase64 = fileContent.toString('base64');
          contentType = 'application/pdf';
          originalSize = fileContent.length;
        } else {
          contentBase64 = Buffer.from(fileContent, 'utf8').toString('base64');
          contentType = 'text/plain';
          originalSize = Buffer.byteLength(fileContent, 'utf8');
        }
      }

      await session.run(`
        MERGE (t:Topic {name: $topic})
          ON CREATE SET t.createdAt = datetime()
        WITH t
        MERGE (p:Paper {id: $id})
        ON CREATE SET
          p.title = $title, p.abstract = $abstract, p.year = $year,
          p.citationCount = $citationCount, p.venue = $venue, p.url = $url,
          p.doi = $doi, p.authors = $authors, p.keywords = $keywords,
          p.embedding = $embedding, p.embeddingDimension = $embeddingDimension,
          p.fileContent = $fileContent, p.contentType = $contentType,
          p.originalSize = $originalSize, p.hasFullContent = $hasFullContent,
          p.localFilePath = $localFilePath, p.downloadedAt = $downloadedAt,
          p.fileSize = $fileSize, p.createdAt = datetime(), p.lastUpdated = datetime()
        ON MATCH SET
          p.title = $title, p.abstract = $abstract, p.year = $year,
          p.citationCount = $citationCount, p.venue = $venue, p.url = $url,
          p.doi = $doi, p.authors = $authors, p.keywords = $keywords,
          p.embedding = $embedding, p.embeddingDimension = $embeddingDimension,
          p.fileContent = COALESCE($fileContent, p.fileContent),
          p.contentType = COALESCE($contentType, p.contentType),
          p.originalSize = COALESCE($originalSize, p.originalSize),
          p.hasFullContent = $hasFullContent,
          p.localFilePath = COALESCE($localFilePath, p.localFilePath),
          p.downloadedAt = COALESCE($downloadedAt, p.downloadedAt),
          p.fileSize = COALESCE($fileSize, p.fileSize),
          p.lastUpdated = datetime()
        WITH p, t
        MERGE (p)-[:BELONGS_TO]->(t)
      `, {
        id: paper.id || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: paper.title || 'Untitled', abstract: paper.abstract || '',
        year: neo4j.int(paper.year || 0), citationCount: neo4j.int(paper.citationCount || 0),
        venue: paper.venue || '', url: paper.url || '', doi: paper.doi || '',
        authors: paper.authors || [], keywords: paper.keywords || [],
        embedding: embeddings, embeddingDimension: neo4j.int(embeddings.length),
        fileContent: contentBase64, contentType: contentType, originalSize: neo4j.int(originalSize),
        hasFullContent: !!fileContent,
        localFilePath: paper.localFilePath || null, downloadedAt: paper.downloadedAt || null,
        fileSize: paper.fileSize ? neo4j.int(paper.fileSize) : null,
        topic
      });

      console.log(`✅ Stored/Updated paper ${paper.id || 'new paper'} with ${originalSize > 0 ? originalSize + ' bytes of content and ' : ''}${embeddings.length}D embedding`);

    } catch (error) {
      console.error('❌ Error storing paper with embeddings:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Stores a research graph (papers and relationships), including full content and embeddings for papers.
   * This method was part of the original code and then updated by the instructions.
   * The instruction version calls `this.storePaperWithContent`.
   * The original code had `storeResearchGraphWithContent` which called `storePaperWithEmbeddings`.
   * I will use the structure from the instructions.
   */
  // ✅ FIX: Update storeResearchGraph to accept optional paperFiles parameter (from instruction)
  async storeResearchGraph(
    papers: any[],
    relationships: any[],
    topic: string,
    paperFiles?: Map<string, Buffer | string>
  ): Promise<void> {
    if (!this.connected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();

    try {
      // Create topic node
      // The instruction has "MERGE (t:Topic {name: $topic, createdAt: datetime()})"
      // The original `storePaperWithEmbeddings` used "MERGE (t:Topic {name: $topic}) ON CREATE SET t.createdAt = datetime()"
      // Both achieve similar results, ON CREATE is generally safer for not overwriting existing createdAt.
      // For consistency with `storePaperWithEmbeddings`, I'll use ON CREATE.
      await session.run(
        `MERGE (t:Topic {name: $topic}) ON CREATE SET t.createdAt = datetime()`,
        { topic }
      );

      console.log(`📥 Storing ${papers.length} papers in Neo4j...`);

      // Store each paper with optional content
      for (const paper of papers) {
        const fileContent = paperFiles?.get(paper.id);
        // The instruction calls `this.storePaperWithContent(paper, topic, fileContent);`
        // The new helper method `storePaperWithContent` is defined below.
        // Note: `storePaperWithContent` from instructions *does not* handle embeddings.
        // The original `storePaperWithEmbeddings` did. If embeddings are still desired here,
        // `storePaperWithContent` needs to be enhanced or `storePaperWithEmbeddings` should be called.
        // Given the method name `storePaperWithContent`, I'll assume it's intended to *not* do embeddings here.
        // However, the previous `storeResearchGraphWithContent` called `storePaperWithEmbeddings`.
        // The instruction's `storeResearchGraph` is simpler.
        // Re-checking: the previous file had a `storeResearchGraph` that called `storeResearchGraphWithContent`
        // and `storeResearchGraphWithContent` called `storePaperWithEmbeddings`.
        // The current instruction redefines `storeResearchGraph` to call `storePaperWithContent`.
        // This seems to imply a shift away from embeddings in this specific `storeResearchGraph` flow,
        // relying on `storePaperWithEmbeddings` to be called separately or by other means if embeddings are needed with content.
        // Or the new `storePaperWithContent` should also handle embeddings.
        // The instruction added `storePaperWithContent` does NOT create embeddings.
        // This will be a change in behavior.
        // The instruction seems to want a separation: `storePaperWithEmbeddings` for full feature storage,
        // and the new `storePaperWithContent` (called by `storeResearchGraph`) for simpler storage.
        // Let's follow the instruction strictly.
        await this.storePaperWithContent(paper, topic, fileContent);


        // Create author nodes and relationships
        if (paper.authors && Array.isArray(paper.authors)) {
          for (const authorName of paper.authors) {
            if (authorName && typeof authorName === 'string' && authorName.trim() !== '') { // Added check for empty author name
              await session.run(`
                MERGE (a:Author {name: $authorName})
                WITH a
                MATCH (p:Paper {id: $paperId})
                MERGE (a)-[:AUTHORED]->(p)
              `, {
                authorName: authorName.trim(),
                paperId: paper.id || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // More robust ID
              });
            }
          }
        }
      }

      // Create relationships between papers
      console.log(`🔗 Storing ${relationships.length} relationships...`); // Moved console log up
      for (const rel of relationships) {
        await session.run(`
          MATCH (p1:Paper {id: $sourceId})
          MATCH (p2:Paper {id: $targetId})
          MERGE (p1)-[r:RELATED_TO {
            type: $type,
            strength: $strength,
            createdAt: datetime()
          }]->(p2)
        `, {
          sourceId: rel.sourceId,
          targetId: rel.targetId,
          type: rel.relationshipType || rel.type || 'Generic', // Added default
          strength: rel.strength || 0.5
        });
      }

      console.log(`✅ Stored ${papers.length} papers and ${relationships.length} relationships for topic '${topic}'`); // Clarified topic

    } catch (error) {
      console.error('❌ Error storing research graph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Backward compatibility: The previous file had a `storeResearchGraph` that called `storeResearchGraphWithContent`.
   * The new instructions *redefine* `storeResearchGraph`. The old `storeResearchGraphWithContent` is not in the new instructions.
   * I will keep `storeResearchGraph` as defined by the new instructions.
   * The original `storeResearchGraphWithContent` (from the file provided by user) is effectively replaced by the logic inside the new `storeResearchGraph`
   * combined with the new `storePaperWithContent` helper, although it no longer directly handles embeddings itself within this flow.
   */

  // ✅ ADD: Helper method to handle optional content storage (from instruction)
  private async storePaperWithContent(paper: any, topic: string, fileContent?: Buffer | string): Promise<void> {
    // This helper is called by the new storeResearchGraph.
    // It does not handle embeddings itself. Embeddings are handled by storePaperWithEmbeddings.
    let contentBase64: string | null = null;
    let contentType: string | null = null;
    let originalSize: number = 0;

    if (fileContent) {
      if (Buffer.isBuffer(fileContent)) {
        contentBase64 = fileContent.toString('base64');
        contentType = 'application/pdf';
        originalSize = fileContent.length;
      } else {
        contentBase64 = Buffer.from(fileContent, 'utf8').toString('base64');
        contentType = 'text/plain';
        originalSize = Buffer.byteLength(fileContent, 'utf8');
      }
    }

    const session = this.driver!.session(); // Assert driver is not null due to connected check

    try {
      // Create paper node with optional content
      // The MERGE query provided in instructions for storePaperWithContent has some differences from storePaperWithEmbeddings
      // E.g., it doesn't include ON MATCH SET for all properties, and doesn't set embedding properties.
      // This is consistent with it being a simpler storage method.
      await session.run(`
        MERGE (p:Paper {id: $id})
        ON CREATE SET
            p.title = $title, p.abstract = $abstract, p.year = $year,
            p.citationCount = $citationCount, p.venue = $venue, p.url = $url,
            p.doi = $doi, p.authors = $authors, p.keywords = $keywords,
            p.fileContent = $fileContent, p.contentType = $contentType,
            p.originalSize = $originalSize, p.hasFullContent = $hasFullContent,
            p.localFilePath = $localFilePath, p.downloadedAt = $downloadedAt,
            p.fileSize = $fileSize, p.createdAt = datetime(), p.lastUpdated = datetime()
        ON MATCH SET
            p.title = COALESCE($title, p.title),
            p.abstract = COALESCE($abstract, p.abstract),
            p.year = COALESCE($year, p.year),
            p.citationCount = COALESCE($citationCount, p.citationCount),
            // Update content only if new content is provided
            p.fileContent = CASE WHEN $hasFullContent THEN $fileContent ELSE p.fileContent END,
            p.contentType = CASE WHEN $hasFullContent THEN $contentType ELSE p.contentType END,
            p.originalSize = CASE WHEN $hasFullContent THEN $originalSize ELSE p.originalSize END,
            p.hasFullContent = CASE WHEN $hasFullContent THEN true ELSE p.hasFullContent END,
            p.lastUpdated = datetime()
        WITH p
        MATCH (t:Topic {name: $topic})
        MERGE (p)-[:BELONGS_TO]->(t)
      `, {
        id: paper.id || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More robust ID
        title: paper.title || 'Untitled',
        abstract: paper.abstract || '',
        year: neo4j.int(paper.year || 0), // Use neo4j.int for consistency with storePaperWithEmbeddings
        citationCount: neo4j.int(paper.citationCount || 0),
        venue: paper.venue || '',
        url: paper.url || '',
        doi: paper.doi || '',
        authors: paper.authors || [],
        keywords: paper.keywords || [],

        fileContent: contentBase64,
        contentType: contentType,
        originalSize: neo4j.int(originalSize), // Use neo4j.int
        hasFullContent: !!fileContent,

        localFilePath: paper.localFilePath || null,
        downloadedAt: paper.downloadedAt || null,
        fileSize: paper.fileSize ? neo4j.int(paper.fileSize) : null, // Use neo4j.int
        topic
      });

    } finally {
      await session.close();
    }
  }


  /**
   * Updates an existing paper with new file content.
   * This method focuses on content, not embeddings.
   */
  async updatePaperWithContent(paperId: string, fileContent: Buffer | string, contentType: string): Promise<void> {
    if (!this.connected || !this.driver) {
      throw new Error('Neo4j not connected');
    }
    const session = this.driver.session();
    try {
      let contentBase64: string;
      let originalSize: number;

      if (Buffer.isBuffer(fileContent)) {
        contentBase64 = fileContent.toString('base64');
        originalSize = fileContent.length;
      } else {
        contentBase64 = Buffer.from(fileContent, 'utf8').toString('base64');
        originalSize = Buffer.byteLength(fileContent, 'utf8');
      }

      await session.run(`
        MATCH (p:Paper {id: $paperId})
        SET p.fileContent = $fileContent,
            p.contentType = $contentType,
            p.originalSize = $originalSize,
            p.hasFullContent = true,
            p.lastUpdated = datetime()
      `, {
        paperId,
        fileContent: contentBase64,
        contentType,
        originalSize: neo4j.int(originalSize)
      });
      console.log(`✅ Updated paper ${paperId} with ${originalSize} bytes of content`);
    } catch (error) {
      console.error(`❌ Error updating paper ${paperId} with content:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Updates paper node with local file path information.
   */
  async updatePaperLocalFile(paperId: string, localFilePath: string, fileSize: number): Promise<void> {
    if (!this.connected || !this.driver) throw new Error('Neo4j not connected');
    const session = this.driver.session();
    try {
      await session.run(`
        MATCH (p:Paper {id: $paperId})
        SET p.localFilePath = $localFilePath,
            p.downloadedAt = datetime(),
            p.fileSize = $fileSize,
            p.isDownloaded = true,
            p.lastUpdated = datetime()
      `, {
        paperId,
        localFilePath,
        fileSize: neo4j.int(fileSize)
      });
      console.log(`✅ Updated paper ${paperId} with local file: ${localFilePath}`);
    } catch (error) {
      console.error(`❌ Error updating paper ${paperId} local file:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Bulk stores downloaded file contents into existing paper nodes in Neo4j.
   */
  async bulkStoreFileContents(downloadResults: Array<{ paperId: string; status: string; filePath?: string }>): Promise<void> {
    if (!this.connected || !this.driver) {
      throw new Error('Neo4j not connected');
    }
    console.log(`📥 Bulk storing ${downloadResults.length} file contents into Neo4j...`);
    let successCount = 0;
    let failCount = 0;

    for (const result of downloadResults) {
      if (result.status === 'completed' && result.filePath && result.paperId) {
        try {
          const fileContent = fs.readFileSync(result.filePath);
          const contentType = path.extname(result.filePath).toLowerCase() === '.pdf' ? 'application/pdf' : 'text/plain';

          await this.updatePaperWithContent(result.paperId, fileContent, contentType);
          console.log(`✅ Stored content for paper ${result.paperId} (${fileContent.length} bytes) from ${result.filePath}`);
          successCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to store content for ${result.paperId} from ${result.filePath}:`, error);
          failCount++;
        }
      } else if (result.paperId) {
        console.log(`ℹ️ Skipping content storage for paper ${result.paperId} due to status: ${result.status} or missing filePath.`);
        failCount++;
      }
    }
    console.log(`✅ Bulk content storage complete. Success: ${successCount}, Failed/Skipped: ${failCount}`);
  }

  /**
   * Adds embeddings to existing papers in batches that don't have them.
   */
  async addEmbeddingsToExistingPapers(batchSize: number = 10): Promise<void> {
    if (!this.connected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    let papersProcessed = 0;
    let totalToProcess = 0;

    // ✅ FIRST: Count total papers needing embeddings
    const countSession = this.driver.session();
    try {
      const countResult = await countSession.run(`
          MATCH (p:Paper)
          WHERE p.embedding IS NULL AND (p.title IS NOT NULL OR p.abstract IS NOT NULL)
          RETURN count(p) as papersToProcess
        `);

      totalToProcess = this.safeToNumber(countResult.records[0].get('papersToProcess'));

      if (totalToProcess === 0) {
        console.log('✅ No papers found requiring embeddings.');
        return;
      }
      console.log(`🔢 Found ${totalToProcess} papers to process for embeddings.`);
    } catch (error) {
      console.error('❌ Error counting papers for embedding:', error);
      return;
    } finally {
      await countSession.close();
    }

    // ✅ SECOND: Process papers in batches
    while (papersProcessed < totalToProcess) {
      const session = this.driver.session();
      try {
        // ✅ Check connection before each batch
        if (!this.connected) {
          console.log('🔄 Reconnecting to Neo4j...');
          await this.connect();
        }

        const result = await session.run(`
            MATCH (p:Paper)
            WHERE p.embedding IS NULL AND (p.title IS NOT NULL OR p.abstract IS NOT NULL)
            RETURN p.id as id, p.title as title, p.abstract as abstract
            LIMIT $limit
          `, { limit: neo4j.int(batchSize) });

        if (result.records.length === 0) {
          console.log('✅ All papers requiring embeddings have been processed.');
          break;
        }

        console.log(`🔄 Processing batch of ${result.records.length} papers for embeddings...`);

        for (const record of result.records) {
          const paperId = record.get('id');
          const title = record.get('title') || '';
          const abstractText = record.get('abstract') || '';

          const textForEmbedding = `${title} ${abstractText}`.trim().substring(0, 2000);
          if (!textForEmbedding) {
            console.warn(`⚠️ Skipping paper ${paperId}: No text available for embedding.`);
            papersProcessed++;
            continue;
          }

          const embeddings = await this.generateEmbeddings(textForEmbedding); // Uses new embedding logic

          await session.run(`
          MATCH (p:Paper {id: $paperId})
          SET p.embedding = $embedding,
              p.embeddingDimension = $embeddingDimension,
              p.lastUpdated = datetime()
          `, {
            paperId,
            embedding: embeddings,
            embeddingDimension: neo4j.int(embeddings.length)
          });
          console.log(`✅ Added ${embeddings.length}D embedding to paper: ${paperId}`);
          papersProcessed++;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log(`Batch complete. Processed ${papersProcessed} of ${totalToProcess} papers.`);
      } catch (error) {
        console.error('❌ Error adding embeddings in batch:', error);
        break;
      } finally {
        await session.close();
      }
    }
    console.log(`✅ Embedding update process finished. Total papers processed: ${papersProcessed}`);
  }


  // --- Retrieval Methods ---

  /**
   * Gets full paper content (decoded) directly from the database.
   */
  async getPaperFullContentFromDatabase(paperId: string): Promise<{
    paperId: string;
    title: string | null;
    content: Buffer | string | null;
    contentType: string | null;
    hasFullContent: boolean;
    originalSize: number;
  }> {
    if (!this.connected || !this.driver) throw new Error('Neo4j not connected');
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (p:Paper {id: $paperId})
        RETURN p.title as title,
               p.fileContent as fileContent,
               p.contentType as contentType,
               p.hasFullContent as hasFullContent,
               p.originalSize as originalSize
      `, { paperId });

      if (result.records.length === 0) {
        throw new Error(`Paper ${paperId} not found`);
      }

      const record = result.records[0];
      const title = record.get('title');
      const fileContentBase64 = record.get('fileContent');
      const contentType = record.get('contentType');
      const hasFullContent = record.get('hasFullContent') || false;
      const originalSize = record.get('originalSize')?.toNumber() || 0;

      let content: Buffer | string | null = null;
      if (fileContentBase64 && hasFullContent) {
        const buffer = Buffer.from(fileContentBase64, 'base64');
        if (contentType === 'application/pdf') {
          content = buffer;
        } else {
          content = buffer.toString('utf8');
        }
      }

      return { paperId, title, content, contentType, hasFullContent, originalSize };
    } catch (error) {
      console.error(`❌ Error getting paper content for ${paperId}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getPaperFullContent(paperId: string): Promise<{
    paperId: string;
    title: string;
    content: Buffer | string | null;
    contentType: string | null;
    hasFullContent: boolean;
    originalSize: number;
  }> {
    if (!this.connected || !this.driver) {
      throw new Error('Neo4j not connected');
    }

    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (p:Paper {id: $paperId})
        RETURN p.title as title,
               p.fileContent as fileContent,
               p.contentType as contentType,
               p.hasFullContent as hasFullContent,
               p.originalSize as originalSize
      `, { paperId });

      if (result.records.length === 0) {
        throw new Error(`Paper ${paperId} not found`);
      }

      const record = result.records[0];
      const title = record.get('title');
      const fileContentBase64 = record.get('fileContent');
      const contentType = record.get('contentType');
      const hasFullContent = record.get('hasFullContent');
      const originalSize = record.get('originalSize')?.toNumber() || 0;

      let content: Buffer | string | null = null;

      if (fileContentBase64 && hasFullContent) {
        // Decode Base64 content
        const buffer = Buffer.from(fileContentBase64, 'base64');

        if (contentType === 'application/pdf') {
          content = buffer; // Return as Buffer for PDF
        } else {
          content = buffer.toString('utf8'); // Return as string for text
        }
      }

      return {
        paperId,
        title,
        content,
        contentType,
        hasFullContent,
        originalSize
      };

    } catch (error) {
      console.error('❌ Error getting paper content:', error);
      throw error;
    } finally {
      await session.close();
    }
  }


  /**
   * Gets papers that have full content stored, optionally filtered by topic.
   */
  async getPapersWithFullContent(topic?: string): Promise<any[]> {
    if (!this.connected || !this.driver) return [];
    const session = this.driver.session();
    try {
      const query = topic
        ? `
          MATCH (p:Paper)-[:BELONGS_TO]->(t:Topic {name: $topic})
          WHERE p.hasFullContent = true
          RETURN p, t.name as topicName
          ORDER BY p.createdAt DESC
        `
        : `
          MATCH (p:Paper)
          WHERE p.hasFullContent = true
          OPTIONAL MATCH (p)-[:BELONGS_TO]->(t:Topic)
          RETURN p, t.name as topicName
          ORDER BY p.createdAt DESC
        `;
      const params = topic ? { topic } : {};
      const result = await session.run(query, params);

      return result.records.map(record => {
        const paper = record.get('p').properties;
        return {
          ...paper,
          year: paper.year?.toNumber(),
          citationCount: paper.citationCount?.toNumber(),
          originalSize: paper.originalSize?.toNumber(),
          embeddingDimension: paper.embeddingDimension?.toNumber(),
          topic: record.get('topicName'),
        };
      });
    } catch (error) {
      console.error('❌ Error getting papers with full content:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  async getLocalFilePath(paperId: string): Promise<string | null> {
    if (!this.connected || !this.driver) return null;
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (p:Paper {id: $paperId}) RETURN p.localFilePath as path',
        { paperId }
      );
      return result.records.length > 0 ? result.records[0].get('path') : null;
    } catch (error) {
      console.error(`❌ Error getting local file path for ${paperId}:`, error);
      return null;
    } finally {
      await session.close();
    }
  }

  
  async getPapersByTopic(topic: string, limit?: number): Promise<any[]> {
    if (!this.connected || !this.driver) {
      return [];
    }

    const session = this.driver.session();

    try {
      let query = `
        MATCH (p:Paper)-[:BELONGS_TO]->(t:Topic {name: $topic})
        RETURN p
        ORDER BY p.citationCount DESC
      `;

      const params: { topic: string, limit?: number } = { topic };

      if (limit && limit > 0) {
        query += ` LIMIT $limit`;
        params.limit = limit;
      }

      const result = await session.run(query, params);

      return result.records.map(record => {
        const paper = record.get('p').properties;
        return {
          ...paper,
          year: this.safeToNumber(paper.year),
          citationCount: this.safeToNumber(paper.citationCount),
          fileSize: this.safeToNumber(paper.fileSize),
          hasLocalFile: !!paper.localFilePath
        };
      });

    } catch (error) {
      console.error(`❌ Error getting papers by topic '${topic}':`, error);
      return [];
    } finally {
      await session.close();
    }
  }


  /**
   * Gets papers that have an associated local file, optionally filtered by topic.
   */
  async getPapersWithLocalFiles(topic?: string): Promise<any[]> {
    if (!this.connected || !this.driver) return [];
    const session = this.driver.session();
    try {
      const query = topic
        ? `
          MATCH (p:Paper)-[:BELONGS_TO]->(t:Topic {name: $topic})
          WHERE p.localFilePath IS NOT NULL
          RETURN p, t.name as topicName
          ORDER BY p.createdAt DESC
        `
        : `
          MATCH (p:Paper)
          WHERE p.localFilePath IS NOT NULL
          OPTIONAL MATCH (p)-[:BELONGS_TO]->(t:Topic)
          RETURN p, t.name as topicName
          ORDER BY p.createdAt DESC
        `;
      const params = topic ? { topic } : {};
      const result = await session.run(query, params);

      return result.records.map(record => {
        const paper = record.get('p').properties;
        return {
          ...paper,
          year: paper.year?.toNumber(),
          citationCount: paper.citationCount?.toNumber(),
          fileSize: paper.fileSize?.toNumber(),
          originalSize: paper.originalSize?.toNumber(),
          embeddingDimension: paper.embeddingDimension?.toNumber(),
          topic: record.get('topicName'),
          hasLocalFile: true
        };
      });
    } catch (error) {
      console.error('❌ Error getting papers with local files:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  // --- Search Methods ---

  /**
   * Performs keyword search on papers (title, abstract, keywords, authors).
   */
  async keywordSearch(queryText: string, limit: number = 10, topic?: string): Promise<any[]> {
    if (!this.connected || !this.driver) return [];
    const session = this.driver.session();
    try {
      const cypherQuery = topic
        ? `
          MATCH (p:Paper)-[:BELONGS_TO]->(t:Topic {name: $topic})
          WHERE (toLower(p.title) CONTAINS toLower($queryText)
            OR toLower(p.abstract) CONTAINS toLower($queryText)
            OR any(keyword IN p.keywords WHERE toLower(keyword) CONTAINS toLower($queryText))
            OR any(author IN p.authors WHERE toLower(author) CONTAINS toLower($queryText)))
          WITH p, t,
               (CASE WHEN toLower(p.title) CONTAINS toLower($queryText) THEN 2 ELSE 0 END +
                CASE WHEN toLower(p.abstract) CONTAINS toLower($queryText) THEN 1 ELSE 0 END +
                CASE WHEN size([kw IN p.keywords WHERE toLower(kw) CONTAINS toLower($queryText)]) > 0 THEN 1 ELSE 0 END
               ) as relevanceScore
          RETURN p, relevanceScore, t.name as topicName
          ORDER BY relevanceScore DESC, p.citationCount DESC
          LIMIT $limit
        `
        : `
          MATCH (p:Paper)
          WHERE (toLower(p.title) CONTAINS toLower($queryText)
            OR toLower(p.abstract) CONTAINS toLower($queryText)
            OR any(keyword IN p.keywords WHERE toLower(keyword) CONTAINS toLower($queryText))
            OR any(author IN p.authors WHERE toLower(author) CONTAINS toLower($queryText)))
          WITH p,
               (CASE WHEN toLower(p.title) CONTAINS toLower($queryText) THEN 2 ELSE 0 END +
                CASE WHEN toLower(p.abstract) CONTAINS toLower($queryText) THEN 1 ELSE 0 END +
                CASE WHEN size([kw IN p.keywords WHERE toLower(kw) CONTAINS toLower($queryText)]) > 0 THEN 1 ELSE 0 END
               ) as relevanceScore
          OPTIONAL MATCH (p)-[:BELONGS_TO]->(topicNode:Topic)
          RETURN p, relevanceScore, topicNode.name as topicName
          ORDER BY relevanceScore DESC, p.citationCount DESC
          LIMIT $limit
        `;
      const result = await session.run(cypherQuery, {
        queryText,
        limit: neo4j.int(limit),
        ...(topic && { topic })
      });

      return result.records.map(record => {
        const paper = record.get('p').properties;
        return {
          ...paper,
          year: paper.year?.toNumber(),
          citationCount: paper.citationCount?.toNumber(),
          originalSize: paper.originalSize?.toNumber(),
          embeddingDimension: paper.embeddingDimension?.toNumber(),
          relevance: record.get('relevanceScore')?.toNumber(),
          topic: record.get('topicName'),
          searchType: 'keyword'
        };
      });
    } catch (error) {
      console.error('❌ Error in keyword search:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Performs semantic search using vector similarity on paper embeddings.
   * Note: This method was listed for replacement in the instructions,
   * but the replacement code was not provided in the 'second artifact' (code 2).
   * Therefore, this method remains unchanged from the original 'code 1'.
   * The new embedding logic in `generateEmbeddings` will produce different embeddings,
   * which this search method will then use.
   */
  async semanticSearch(queryText: string, limit: number = 10, topic?: string): Promise<any[]> {
    if (!this.connected || !this.driver) return [];
    const session = this.driver.session();
    try {
      const queryEmbedding = await this.generateEmbeddings(queryText); // Will use the new local embeddings
      if (queryEmbedding.every(v => v === 0)) {
        console.warn(`⚠️ Semantic search for "${queryText}" resulted in a zero embedding. May yield no results.`);
      }
      console.log(`🔍 Semantic search for: "${queryText}" (Topic: ${topic || 'Any'})`); // Added topic logging

      const cypherQuery = topic
        ? `
          MATCH (p:Paper)-[:BELONGS_TO]->(t:Topic {name: $topic})
          WHERE p.embedding IS NOT NULL AND size(p.embedding) = size($queryEmbedding)
          WITH p, t, gds.similarity.cosine(p.embedding, $queryEmbedding) AS similarity
          WHERE similarity > 0.1 
          RETURN p, similarity, t.name as topicName
          ORDER BY similarity DESC
          LIMIT $limit
        `
        : `
          MATCH (p:Paper)
          WHERE p.embedding IS NOT NULL AND size(p.embedding) = size($queryEmbedding)
          WITH p, gds.similarity.cosine(p.embedding, $queryEmbedding) AS similarity
          WHERE similarity > 0.1
          OPTIONAL MATCH (p)-[:BELONGS_TO]->(topicNode:Topic)
          RETURN p, similarity, topicNode.name as topicName
          ORDER BY similarity DESC
          LIMIT $limit
        `;

      const result = await session.run(cypherQuery, {
        queryEmbedding,
        limit: neo4j.int(limit),
        ...(topic && { topic })
      });

      return result.records.map(record => {
        const paper = record.get('p').properties;
        const similarity = record.get('similarity');
        return {
          ...paper,
          year: paper.year?.toNumber(),
          citationCount: paper.citationCount?.toNumber(),
          originalSize: paper.originalSize?.toNumber(),
          embeddingDimension: paper.embeddingDimension?.toNumber(), // Will reflect new 512 or 384 dim
          similarity: similarity,
          similarityPercentage: Math.round(similarity * 100),
          topic: record.get('topicName'),
          searchType: 'semantic'
        };
      });
    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      if (error instanceof Error && error.message.includes("Unknown function 'gds.similarity.cosine'")) {
        console.error("❗ GDS Library not found or 'gds.similarity.cosine' is not available. Semantic search might require GDS or a manual cosine similarity calculation in Cypher.");
      }
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Performs graph-based search to find papers related through connections.
   */
  async graphSearch(queryText: string, limit: number = 10, topic?: string): Promise<any[]> {
    if (!this.connected || !this.driver) return [];
    const session = this.driver.session();
    try {
      const seedPapers = await this.keywordSearch(queryText, 3, topic);
      if (seedPapers.length === 0) return [];

      const seedIds = seedPapers.map(p => p.id);

      const result = await session.run(`
        MATCH (seed:Paper) WHERE seed.id IN $seedIds
        MATCH (seed)-[rels*1..2]-(related:Paper)
        WHERE NOT related.id IN $seedIds
        ${topic ? 'AND (related)-[:BELONGS_TO]->(:Topic {name: $topic})' : ''}
        WITH related, count(DISTINCT rels) as connectionStrength,
             reduce(acc = [], r IN rels | acc + type(r)) as relationshipTypes
        OPTIONAL MATCH (related)-[:BELONGS_TO]->(topicNode:Topic) // Get topic for related papers
        RETURN DISTINCT related, connectionStrength, relationshipTypes, topicNode.name as topicName
        ORDER BY connectionStrength DESC, related.citationCount DESC
        LIMIT $limit
      `, {
        seedIds,
        limit: neo4j.int(limit),
        ...(topic && { topic })
      });

      return result.records.map(record => {
        const paper = record.get('related').properties;
        return {
          ...paper,
          year: paper.year?.toNumber(),
          citationCount: paper.citationCount?.toNumber(),
          originalSize: paper.originalSize?.toNumber(),
          embeddingDimension: paper.embeddingDimension?.toNumber(),
          connectionStrength: record.get('connectionStrength').toNumber(),
          relationshipTypes: record.get('relationshipTypes'),
          topic: record.get('topicName'), // Added topic to graph results
          searchType: 'graph'
        };
      });
    } catch (error) {
      console.error('❌ Error in graph search:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Combines results from semantic, keyword, and graph searches.
   */
  private combineSearchResults(semanticResults: any[], keywordResults: any[], graphResults: any[]): any[] {
    const resultMap = new Map<string, any>();
    const weights = { semantic: 0.5, keyword: 0.3, graph: 0.2 };

    semanticResults.forEach((paper) => { // Removed index as it was unused
      const score = (paper.similarity || 0) * weights.semantic;
      resultMap.set(paper.id, { ...paper, combinedScore: score, sources: ['semantic'] });
    });

    keywordResults.forEach((paper) => {
      const score = (paper.relevance || 0) * weights.keyword;
      const existing = resultMap.get(paper.id);
      if (existing) {
        existing.combinedScore += score;
        existing.sources.push('keyword');
      } else {
        resultMap.set(paper.id, { ...paper, combinedScore: score, sources: ['keyword'] });
      }
    });

    graphResults.forEach((paper) => {
      const score = (paper.connectionStrength || 0) * weights.graph;
      const existing = resultMap.get(paper.id);
      if (existing) {
        existing.combinedScore += score;
        existing.sources.push('graph');
      } else {
        resultMap.set(paper.id, { ...paper, combinedScore: score, sources: ['graph'] });
      }
    });

    resultMap.forEach(paper => {
      if (paper.sources.length > 1) {
        paper.combinedScore += 0.1 * (paper.sources.length - 1);
      }
    });

    return Array.from(resultMap.values()).sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * Performs a hybrid search combining semantic, keyword, and graph-based approaches.
   */
  async hybridSearch(queryText: string, limit: number = 10, topic?: string): Promise<{
    semanticResults: any[];
    keywordResults: any[];
    graphResults: any[];
    combinedResults: any[];
  }> {
    console.log(`🔄 Hybrid search for: "${queryText}" (Topic: ${topic || 'Any'})`);

    const [semanticResults, keywordResults, graphResults] = await Promise.all([
      this.semanticSearch(queryText, limit, topic),
      this.keywordSearch(queryText, limit, topic),
      this.graphSearch(queryText, limit, topic)
    ]);

    const combinedResults = this.combineSearchResults(semanticResults, keywordResults, graphResults);

    return {
      semanticResults,
      keywordResults,
      graphResults,
      combinedResults: combinedResults.slice(0, limit)
    };
  }

  // --- Statistics Methods ---

  /**
   * Gets statistics about downloaded files (papers with localFilePath).
   */
  async getDownloadStats(): Promise<any> {
    if (!this.connected || !this.driver) return { totalPapers: 0, downloadedPapers: 0, totalFileSize: 0, downloadPercentage: 0, totalFileSizeMB: 0 };
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (p:Paper)
        RETURN
          count(p) as totalPapers,
          count(CASE WHEN p.localFilePath IS NOT NULL THEN 1 END) as downloadedPapers,
          sum(CASE WHEN p.fileSize IS NOT NULL THEN p.fileSize ELSE 0 END) as totalFileSize
      `);
      const record = result.records[0];

      // Use safe conversion
      const totalPapers = this.safeToNumber(record.get('totalPapers'));
      const downloadedPapers = this.safeToNumber(record.get('downloadedPapers'));
      const totalFileSize = this.safeToNumber(record.get('totalFileSize'));

      return {
        totalPapers,
        downloadedPapers,
        totalFileSize,
        downloadPercentage: totalPapers > 0 ? Math.round((downloadedPapers / totalPapers) * 10000) / 100 : 0,
        totalFileSizeMB: Math.round(totalFileSize / (1024 * 1024) * 100) / 100,
      };
    } catch (error) {
      console.error('❌ Error getting download stats:', error);
      return { totalPapers: 0, downloadedPapers: 0, totalFileSize: 0, downloadPercentage: 0, totalFileSizeMB: 0 };
    } finally {
      await session.close();
    }
  }

  /**
   * Gets general database statistics (node counts).
   */
  async getDatabaseStorageStats(): Promise<any> {
    if (!this.connected || !this.driver) return { connected: false };
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (p:Paper)
        WHERE p.hasFullContent = true AND p.originalSize IS NOT NULL
        RETURN
          count(p) as papersWithContent,
          sum(p.originalSize) as totalContentSize,
          avg(p.originalSize) as avgContentSize,
          max(p.originalSize) as largestPaperSize
        WITH papersWithContent, totalContentSize, avgContentSize, largestPaperSize
        MATCH (allP:Paper)
        RETURN
            count(allP) as totalPapers,
            papersWithContent,
            totalContentSize,
            avgContentSize,
            largestPaperSize
      `);
      const record = result.records[0];

      // Use safe conversion
      const totalPapers = this.safeToNumber(record.get('totalPapers'));
      const papersWithContent = this.safeToNumber(record.get('papersWithContent'));
      const totalContentSize = this.safeToNumber(record.get('totalContentSize'));
      const avgContentSize = this.safeToNumber(record.get('avgContentSize'));
      const largestPaperSize = this.safeToNumber(record.get('largestPaperSize'));

      return {
        connected: true,
        totalPapers,
        papersWithContent,
        papersWithoutContent: totalPapers - papersWithContent,
        contentCoveragePercentage: totalPapers > 0 ? Math.round((papersWithContent / totalPapers) * 10000) / 100 : 0,
        totalContentSize,
        totalContentSizeMB: Math.round(totalContentSize / (1024 * 1024) * 100) / 100,
        avgContentSize: Math.round(avgContentSize),
        avgContentSizeKB: Math.round(avgContentSize / 1024 * 100) / 100,
        largestPaperSize,
        largestPaperMB: Math.round(largestPaperSize / (1024 * 1024) * 100) / 100,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting database storage stats:', error);
      return { connected: false, error: (error as Error).message };
    } finally {
      await session.close();
    }
  }


  /**
   * Gets statistics about paper embeddings.
   */
  async getEmbeddingStats(): Promise<any> {
    if (!this.connected || !this.driver) return { connected: false };
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (p:Paper)
        RETURN
          count(p) as totalPapers,
          count(CASE WHEN p.embedding IS NOT NULL THEN 1 END) as papersWithEmbeddings,
          avg(CASE WHEN p.embeddingDimension IS NOT NULL THEN p.embeddingDimension ELSE 0 END) as avgDimension
      `);
      const record = result.records[0];

      // Use the safe conversion helper
      const totalPapers = this.safeToNumber(record.get('totalPapers'));
      const papersWithEmbeddings = this.safeToNumber(record.get('papersWithEmbeddings'));
      const avgDimension = this.safeToNumber(record.get('avgDimension'));

      return {
        connected: true,
        totalPapers,
        papersWithEmbeddings,
        papersWithoutEmbeddings: totalPapers - papersWithEmbeddings,
        embeddingCoveragePercentage: totalPapers > 0 ? Math.round((papersWithEmbeddings / totalPapers) * 10000) / 100 : 0,
        avgEmbeddingDimension: Math.round(avgDimension), // Will reflect new 512 or 384 dim
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting embedding stats:', error);
      return { connected: false, error: (error as Error).message };
    } finally {
      await session.close();
    }
  }

  /**
  * Gets general database statistics (node counts).
  */
  async getDatabaseStats(): Promise<any> {
    if (!this.connected || !this.driver) return { connected: false };
    const session = this.driver.session();

    try {
      const result = await session.run(`
        MATCH (p:Paper)
        OPTIONAL MATCH (a:Author)
        OPTIONAL MATCH (t:Topic)
        RETURN
          count(DISTINCT p) as papers,
          count(DISTINCT a) as authors,
          count(DISTINCT t) as topics,
          count(CASE WHEN p.localFilePath IS NOT NULL THEN 1 END) as downloadedPapers
      `);

      const record = result.records[0];

      return {
        connected: true,
        papers: this.safeToNumber(record.get('papers')),
        authors: this.safeToNumber(record.get('authors')),
        topics: this.safeToNumber(record.get('topics')),
        downloadedPapers: this.safeToNumber(record.get('downloadedPapers')),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      return { connected: false, error: (error as Error).message };
    } finally {
      await session.close();
    }
  }
  // --- Connection Management ---

  /**
   * Closes the Neo4j driver connection.
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      this.connected = false;
      console.log('🔌 Neo4j connection closed');
    }
  }
}

export default new Neo4jService();