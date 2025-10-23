// AdvancedRAGService.ts - Multi-Step Research Reasoning
import neo4jService from './neo4jService';
import { GraphRAGService } from './graphRagService';
import { groqService } from './groqService';

interface ResearchStep {
  id: string;
  question: string;
  reasoning: string;
  findings: any[];
  confidence: number;
  nextSteps: string[];
}

interface MethodologyComparison {
  methodology: string;
  papers: any[];
  analysis: any;
  strengths: any;
  limitations: any;
  useCases: any;
}

interface MultiStepResult {
  originalQuestion: string;
  steps: ResearchStep[];
  synthesis: string;
  conclusions: string[];
  limitationsAndGaps: string[];
  suggestedResearch: string[];
  sources: any[];
  totalConfidence: number;
}

export class AdvancedRAGService extends GraphRAGService {

  // ✅ MULTI-STEP RESEARCH REASONING
  async conductResearchInvestigation(question: string, topic?: string): Promise<MultiStepResult> {
    try {
      console.log(`🔬 Starting multi-step research investigation: "${question}"`);
      
      // Step 1: Break down the complex question into research steps
      const researchPlan = await this.createResearchPlan(question);
      console.log(`📋 Research plan created with ${researchPlan.steps.length} steps`);
      
      // Step 2: Execute each research step
      const executedSteps: ResearchStep[] = [];
      let allSources: any[] = [];
      
      for (let i = 0; i < researchPlan.steps.length; i++) {
        const step = researchPlan.steps[i];
        console.log(`🔍 Executing step ${i + 1}: ${step.question}`);
        
        const stepResult = await this.executeResearchStep(step, executedSteps, topic);
        executedSteps.push(stepResult);
        allSources.push(...stepResult.findings);
        
        // Brief pause between steps
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Step 3: Synthesize findings across all steps
      const synthesis = await this.synthesizeFindings(question, executedSteps);
      
      // Step 4: Generate conclusions and identify gaps
      const analysis = await this.analyzeResearchGaps(question, executedSteps, synthesis);
      
      return {
        originalQuestion: question,
        steps: executedSteps,
        synthesis: synthesis.synthesis,
        conclusions: synthesis.conclusions,
        limitationsAndGaps: analysis.limitations,
        suggestedResearch: analysis.futureResearch,
        sources: this.deduplicateSources(allSources),
        totalConfidence: this.calculateOverallConfidence(executedSteps)
      };
      
    } catch (error) {
      console.error('❌ Error in multi-step research investigation:', error);
      throw error;
    }
  }

  // Create a research plan by breaking down complex questions
  private async createResearchPlan(question: string): Promise<{ steps: { question: string; reasoning: string }[] }> {
    const planningPrompt = `
You are a research methodology expert. Break down this complex research question into 3-5 specific, actionable research steps.

Research Question: "${question}"

Create a systematic investigation plan. Each step should:
1. Focus on one specific aspect of the question
2. Build logically on previous steps
3. Be answerable with academic literature
4. Lead toward answering the main question

Provide JSON response:
{
  "steps": [
    {
      "question": "Specific research question for this step",
      "reasoning": "Why this step is important for the overall investigation"
    }
  ]
}

Make each step concrete and searchable in academic databases.
`;

    try {
      const response = await groqService.generateCompletion(planningPrompt, {
        maxTokens: 600,
        temperature: 0.2
      });

      const plan = JSON.parse(response);
      return {
        steps: plan.steps?.slice(0, 5) || [
          { question: question, reasoning: "Direct investigation of the main question" }
        ]
      };
      
    } catch (error) {
      console.warn('⚠️ Research planning failed, using simple approach:', error);
      return {
        steps: [
          { question: question, reasoning: "Direct investigation of the main question" }
        ]
      };
    }
  }

  // Execute a single research step
  private async executeResearchStep(
    step: { question: string; reasoning: string },
    previousSteps: ResearchStep[],
    topic?: string
  ): Promise<ResearchStep> {
    
    // Build context from previous steps
    const previousContext = previousSteps.map(s => 
      `${s.question}: ${s.findings.slice(0, 2).map(f => f.title).join(', ')}`
    ).join('\n');

    // Search for relevant papers using hybrid search
    const searchResults = await neo4jService.hybridSearch(step.question, 8, topic);
    
    // Get full content for top papers
    const papersWithContent = await this.getPapersFullContent(searchResults.combinedResults.slice(0, 5));
    
    // Extract and analyze relevant passages
    const relevantPassages = await this.extractRelevantPassages(papersWithContent, step.question);
    
    // Generate step-specific findings
    const findings = await this.analyzeStepFindings(step, relevantPassages, previousContext);
    
    return {
      id: `step-${Date.now()}`,
      question: step.question,
      reasoning: step.reasoning,
      findings: papersWithContent,
      confidence: this.calculateStepConfidence(papersWithContent, relevantPassages),
      nextSteps: findings.nextSteps || []
    };
  }

  // Analyze findings for a specific research step
  private async analyzeStepFindings(
    step: { question: string; reasoning: string },
    passages: any[],
    previousContext: string
  ): Promise<{ analysis: string; nextSteps: string[] }> {
    
    const contextText = passages.map((passage, index) => 
      `[Source ${index + 1}]: ${passage.content}`
    ).join('\n\n');

    const analysisPrompt = `
You are analyzing research findings for a specific step in a larger investigation.

RESEARCH STEP: ${step.question}
REASONING: ${step.reasoning}

PREVIOUS STEPS CONTEXT:
${previousContext}

CURRENT FINDINGS:
${contextText}

Provide a focused analysis for this research step:

1. What does the evidence show about this specific research question?
2. How do these findings relate to the previous steps?
3. What are the key insights and patterns?
4. What questions emerge for further investigation?

Provide JSON response:
{
  "analysis": "Detailed analysis of the findings for this step",
  "nextSteps": ["Specific follow-up questions or areas to explore"]
}

Focus on evidence-based conclusions and be specific about what the research shows.
`;

    try {
      const response = await groqService.generateCompletion(analysisPrompt, {
        maxTokens: 500,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.warn('⚠️ Step analysis failed:', error);
      return {
        analysis: `Analysis of findings related to: ${step.question}`,
        nextSteps: ['Continue investigation with additional sources']
      };
    }
  }

  // Synthesize findings across all research steps
  private async synthesizeFindings(
    originalQuestion: string,
    steps: ResearchStep[]
  ): Promise<{ synthesis: string; conclusions: string[] }> {
    
    const stepSummaries = steps.map((step, index) => 
      `Step ${index + 1}: ${step.question}\nKey papers: ${step.findings.slice(0, 3).map(f => f.title).join(', ')}\nConfidence: ${step.confidence}%`
    ).join('\n\n');

    const synthesisPrompt = `
You are synthesizing findings from a multi-step research investigation.

ORIGINAL RESEARCH QUESTION: "${originalQuestion}"

RESEARCH STEPS COMPLETED:
${stepSummaries}

Based on all the research steps and findings, provide a comprehensive synthesis:

1. How do the findings from different steps connect and support each other?
2. What is the overall picture that emerges from this investigation?
3. What are the most important conclusions supported by the evidence?
4. How well does this research answer the original question?

Provide JSON response:
{
  "synthesis": "Comprehensive synthesis connecting all research steps and findings",
  "conclusions": [
    "Key conclusion 1 based on evidence",
    "Key conclusion 2 based on evidence",
    "Key conclusion 3 based on evidence"
  ]
}

Focus on evidence-based synthesis and clear conclusions.
`;

    try {
      const response = await groqService.generateCompletion(synthesisPrompt, {
        maxTokens: 800,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.warn('⚠️ Synthesis failed:', error);
      return {
        synthesis: `Research synthesis for: ${originalQuestion}`,
        conclusions: ['Investigation completed with multiple research steps']
      };
    }
  }

  // Analyze research gaps and limitations
  private async analyzeResearchGaps(
    originalQuestion: string,
    steps: ResearchStep[],
    synthesis: { synthesis: string; conclusions: string[] }
  ): Promise<{ limitations: string[]; futureResearch: string[] }> {
    
    const gapAnalysisPrompt = `
Analyze this research investigation for limitations and future research opportunities.

ORIGINAL QUESTION: "${originalQuestion}"
SYNTHESIS: ${synthesis.synthesis}

RESEARCH STEPS CONFIDENCE:
${steps.map((s, i) => `Step ${i + 1}: ${s.confidence}% confidence`).join('\n')}

Identify:
1. What limitations exist in the current research findings?
2. What gaps remain unanswered?
3. What future research directions would be valuable?
4. What methodological improvements could strengthen the investigation?

Provide JSON response:
{
  "limitations": [
    "Specific limitation or constraint in the current research",
    "Another limitation or gap in the evidence"
  ],
  "futureResearch": [
    "Specific future research direction",
    "Another research opportunity or question"
  ]
}

Be specific and constructive in identifying limitations and opportunities.
`;

    try {
      const response = await groqService.generateCompletion(gapAnalysisPrompt, {
        maxTokens: 400,
        temperature: 0.4
      });

      return JSON.parse(response);
    } catch (error) {
      console.warn('⚠️ Gap analysis failed:', error);
      return {
        limitations: ['Limited scope of available research papers'],
        futureResearch: ['Further investigation with broader literature']
      };
    }
  }

  // ✅ RESEARCH SYNTHESIS - Combine multiple topics
  async synthesizeResearchTopics(topics: string[], research_focus?: string): Promise<any> {
    try {
      console.log(`🔄 Synthesizing research across topics: ${topics.join(', ')}`);
      
      // Search for papers across all topics
      const topicResults = await Promise.all(
        topics.map(topic => neo4jService.hybridSearch(topic, 5))
      );
      
      // Find intersection papers (papers that appear in multiple topic searches)
      const intersectionPapers = this.findTopicIntersections(topicResults, topics);
      
      // Analyze relationships between topics
      const topicAnalysis = await this.analyzeTopicRelationships(topics, intersectionPapers, research_focus);
      
      return {
        topics: topics,
        intersectionPapers: intersectionPapers,
        analysis: topicAnalysis,
        researchFocus: research_focus,
        recommendations: await this.generateSynthesisRecommendations(topics, topicAnalysis)
      };
      
    } catch (error) {
      console.error('❌ Error in research synthesis:', error);
      throw error;
    }
  }

  // Find papers that appear across multiple topic searches
  private findTopicIntersections(topicResults: any[], topics: string[]): any[] {
    const paperCounts = new Map<string, { paper: any; topics: string[] }>();
    
    topicResults.forEach((results, topicIndex) => {
      const topic = topics[topicIndex];
      results.combinedResults.forEach((paper: any) => {
        if (paperCounts.has(paper.id)) {
          paperCounts.get(paper.id)!.topics.push(topic);
        } else {
          paperCounts.set(paper.id, { paper, topics: [topic] });
        }
      });
    });
    
    // Return papers that appear in multiple topics
    return Array.from(paperCounts.values())
      .filter(item => item.topics.length > 1)
      .sort((a, b) => b.topics.length - a.topics.length)
      .map(item => ({
        ...item.paper,
        topicsFound: item.topics,
        intersectionScore: item.topics.length
      }));
  }

  // ✅ TEMPORAL RESEARCH ANALYSIS - Track trends over time
  async analyzeResearchTrends(topic: string, startYear?: number, endYear?: number): Promise<any> {
    try {
      const currentYear = new Date().getFullYear();
      const fromYear = startYear || currentYear - 5;
      const toYear = endYear || currentYear;
      
      console.log(`📈 Analyzing research trends for "${topic}" from ${fromYear} to ${toYear}`);
      
      // Get papers by year
      const yearlyData = await this.getPapersByYear(topic, fromYear, toYear);
      
      // Analyze trends
      const trendAnalysis = await this.analyzeTrendPatterns(yearlyData, topic);
      
      // Get emerging authors and concepts
      const emergingElements = await this.identifyEmergingElements(yearlyData);
      
      return {
        topic: topic,
        timeRange: { from: fromYear, to: toYear },
        yearlyBreakdown: yearlyData,
        trends: trendAnalysis,
        emergingAuthors: emergingElements.authors,
        emergingConcepts: emergingElements.concepts,
        keyDevelopments: trendAnalysis.keyDevelopments
      };
      
    } catch (error) {
      console.error('❌ Error in trend analysis:', error);
      throw error;
    }
  }

  // Get papers grouped by year
  private async getPapersByYear(topic: string, fromYear: number, toYear: number): Promise<any[]> {
    try {
      // Get papers by topic first
      const papers = await neo4jService.getPapersByTopic(topic);
      
      // Group papers by year
      const yearlyData = papers
        .filter(paper => paper.year >= fromYear && paper.year <= toYear)
        .reduce((acc: any, paper) => {
          const year = paper.year;
          if (!acc[year]) {
            acc[year] = {
              year,
              paperCount: 0,
              sampleTitles: [],
              avgCitations: 0,
              topAuthors: []
            };
          }
          
          acc[year].paperCount++;
          if (acc[year].sampleTitles.length < 3) {
            acc[year].sampleTitles.push(paper.title);
          }
          acc[year].avgCitations = (acc[year].avgCitations * (acc[year].paperCount - 1) + (paper.citationCount || 0)) / acc[year].paperCount;
          if (paper.authors && paper.authors.length > 0 && acc[year].topAuthors.length < 5) {
            acc[year].topAuthors.push(paper.authors[0]);
          }
          
          return acc;
        }, {});
      
      // Convert to array and sort by year
      return Object.values(yearlyData).sort((a: any, b: any) => a.year - b.year);
      
    } catch (error) {
      console.error('❌ Error getting papers by year:', error);
      return [];
    }
  }

  // Calculate step and overall confidence
  private calculateStepConfidence(papers: any[], passages: any[]): number {
    if (papers.length === 0) return 0;
    
    const factors = {
      paperCount: Math.min(papers.length / 5, 1) * 30,
      contentQuality: papers.filter(p => p.hasFullContent).length / papers.length * 25,
      passageRelevance: passages.length > 0 ? passages.reduce((sum, p) => sum + p.relevance, 0) / passages.length * 30 : 0,
      citationStrength: papers.reduce((sum, p) => sum + (p.citationCount || 0), 0) / papers.length / 100 * 15
    };
    
    return Math.round(Object.values(factors).reduce((sum, val) => sum + val, 0));
  }

  private calculateOverallConfidence(steps: ResearchStep[]): number {
    if (steps.length === 0) return 0;
    
    const avgStepConfidence = steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length;
    const consistencyBonus = steps.length > 1 ? 10 : 0; // Bonus for multi-step analysis
    
    return Math.min(100, Math.round(avgStepConfidence + consistencyBonus));
  }

  // Remove duplicate sources across steps
  private deduplicateSources(allSources: any[]): any[] {
    const seen = new Set<string>();
    return allSources.filter(source => {
      if (seen.has(source.id)) {
        return false;
      }
      seen.add(source.id);
      return true;
    });
  }

  // ✅ RESEARCH METHODOLOGY COMPARISON
  async compareResearchMethodologies(methodologies: string[], researchArea: string): Promise<any> {
    try {
      console.log(`⚖️ Comparing methodologies: ${methodologies.join(' vs ')} in ${researchArea}`);
      
      const comparisons: MethodologyComparison[] = [];
      
      for (const methodology of methodologies) {
        const query = `${methodology} methodology in ${researchArea}`;
        const results = await neo4jService.hybridSearch(query, 5);
        const analysis = await this.analyzeMethodology(methodology, results.combinedResults, researchArea);
        
        comparisons.push({
          methodology: methodology,
          papers: results.combinedResults,
          analysis: analysis,
          strengths: analysis.strengths,
          limitations: analysis.limitations,
          useCases: analysis.useCases
        });
      }
      
      // Generate comparative synthesis
      const synthesis = await this.synthesizeMethodologyComparison(comparisons, researchArea);
      
      return {
        researchArea: researchArea,
        methodologies: methodologies,
        comparisons: comparisons,
        synthesis: synthesis,
        recommendations: synthesis.recommendations
      };
      
    } catch (error) {
      console.error('❌ Error in methodology comparison:', error);
      throw error;
    }
  }

  private async analyzeMethodology(methodology: string, papers: any[], researchArea: string): Promise<any> {
    const paperTitles = papers.slice(0, 3).map(p => p.title).join(', ');
    
    const analysisPrompt = `
Analyze the ${methodology} methodology in ${researchArea} research based on these papers:

Papers: ${paperTitles}

Provide analysis in JSON format:
{
  "strengths": ["Key strength 1", "Key strength 2"],
  "limitations": ["Limitation 1", "Limitation 2"], 
  "useCases": ["Best use case 1", "Best use case 2"],
  "summary": "Brief summary of the methodology's role in this research area"
}
`;

    try {
      const response = await groqService.generateCompletion(analysisPrompt, {
        maxTokens: 300,
        temperature: 0.3
      });
      
      return JSON.parse(response);
    } catch (error) {
      return {
        strengths: [`${methodology} shows promise in ${researchArea}`],
        limitations: ['Limited analysis available'],
        useCases: [`Applied in ${researchArea} research`],
        summary: `${methodology} methodology analysis`
      };
    }
  }

  private async synthesizeMethodologyComparison(comparisons: MethodologyComparison[], researchArea: string): Promise<any> {
    const methodologyNames = comparisons.map(c => c.methodology).join(', ');
    
    const synthesisPrompt = `
Compare these methodologies in ${researchArea}:

${comparisons.map(c => 
  `${c.methodology}: ${c.analysis.summary}`
).join('\n')}

Provide comparative synthesis in JSON:
{
  "summary": "Overall comparison summary",
  "recommendations": ["When to use methodology X", "When to use methodology Y"],
  "trends": "Current trends in methodology adoption"
}
`;

    try {
      const response = await groqService.generateCompletion(synthesisPrompt, {
        maxTokens: 400,
        temperature: 0.3
      });
      
      return JSON.parse(response);
    } catch (error) {
      return {
        summary: `Comparison of ${methodologyNames} in ${researchArea}`,
        recommendations: ['Further analysis needed'],
        trends: 'Mixed adoption across research communities'
      };
    }
  }

  // Add missing methods
  private async analyzeTopicRelationships(topics: string[], intersectionPapers: any[], research_focus?: string): Promise<any> {
    try {
      const prompt = `
Analyze the relationships between these research topics based on the papers that connect them:

Topics: ${topics.join(', ')}
${research_focus ? `Research Focus: ${research_focus}` : ''}

Provide JSON response:
{
  "relationships": [
    {
      "topics": ["topic1", "topic2"],
      "strength": 0.8,
      "description": "How these topics are related",
      "keyPapers": ["paper1", "paper2"]
    }
  ],
  "synthesis": "Overall analysis of topic relationships"
}`;

      const response = await groqService.generateCompletion(prompt, {
        maxTokens: 800,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('❌ Error analyzing topic relationships:', error);
      return {
        relationships: [],
        synthesis: "Unable to analyze topic relationships"
      };
    }
  }

  private async generateSynthesisRecommendations(topics: string[], topicAnalysis: any): Promise<string[]> {
    try {
      const prompt = `
Based on the analysis of these research topics:
${topics.join(', ')}

And their relationships:
${JSON.stringify(topicAnalysis, null, 2)}

Generate specific recommendations for:
1. Research directions
2. Potential collaborations
3. Knowledge gaps to address

Format as a JSON array of recommendation strings.`;

      const response = await groqService.generateCompletion(prompt, {
        maxTokens: 400,
        temperature: 0.4
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('❌ Error generating synthesis recommendations:', error);
      return ["Further analysis needed for specific recommendations"];
    }
  }

  private async analyzeTrendPatterns(yearlyData: any[], topic: string): Promise<any> {
    try {
      const prompt = `
Analyze research trends for "${topic}" based on this yearly data:
${JSON.stringify(yearlyData, null, 2)}

Provide JSON response:
{
  "trends": [
    {
      "pattern": "Description of trend",
      "years": [2020, 2021, 2022],
      "significance": "Why this trend matters"
    }
  ],
  "keyDevelopments": ["Major developments in the field"],
  "futurePredictions": ["Predicted future directions"]
}`;

      const response = await groqService.generateCompletion(prompt, {
        maxTokens: 600,
        temperature: 0.3
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('❌ Error analyzing trend patterns:', error);
      return {
        trends: [],
        keyDevelopments: [],
        futurePredictions: []
      };
    }
  }

  private async identifyEmergingElements(yearlyData: any[]): Promise<{ authors: string[]; concepts: string[] }> {
    try {
      const prompt = `
Identify emerging authors and concepts from this research data:
${JSON.stringify(yearlyData, null, 2)}

Provide JSON response:
{
  "authors": ["List of emerging authors"],
  "concepts": ["List of emerging concepts"]
}`;

      const response = await groqService.generateCompletion(prompt, {
        maxTokens: 400,
        temperature: 0.4
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('❌ Error identifying emerging elements:', error);
      return {
        authors: [],
        concepts: []
      };
    }
  }
}

export default new AdvancedRAGService();