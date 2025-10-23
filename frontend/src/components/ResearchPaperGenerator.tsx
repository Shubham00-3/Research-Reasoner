import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Download, FileText, Eye, Edit, BookOpen, Brain, Zap } from 'lucide-react';
import { getApiUrl } from '../config/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  paperUpdate?: {
    section?: string;
    action?: string;
    content?: string;
  };
}

interface PaperSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface GeneratedPaper {
  title: string;
  abstract: string;
  sections: PaperSection[];
  references: string[];
  metadata: {
    wordCount: number;
    lastUpdated: Date;
    version: number;
  };
}

const ResearchPaperGenerator: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPaper, setCurrentPaper] = useState<GeneratedPaper | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Initialize conversation and welcome message
  useEffect(() => {
    initializeGenerator();
  }, []);

  const initializeGenerator = async () => {
    try {
      // Initialize conversation for paper generation
      const response = await fetch(getApiUrl('/conversations/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'research_paper_generation',
          userId: 'paper_gen_' + Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setConversationId(result.data.conversationId);
        console.log('✅ Paper Generator conversation initialized:', result.data.conversationId);
      }

      // Add welcome message
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: `🧠 **Research Paper Generator Ready!**

I can help you create comprehensive research papers based on your research database and conversations.

**What I can do:**
• Generate complete research papers from scratch
• Edit specific sections (abstract, introduction, methodology, etc.)
• Adjust writing style and tone
• Add citations from your research database
• Modify structure and organization

**To get started, tell me:**
• What research topic would you like to write about?
• What type of paper (survey, empirical study, technical report)?
• Any specific focus or angle you'd prefer?

Example: *"Generate a survey paper on transformer architectures in NLP"*`,
        timestamp: new Date()
      }]);

      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Error initializing paper generator:', error);
      setIsInitialized(true);
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the paper generation API
      const response = await fetch(getApiUrl('/generate-research-paper'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRequest: currentInput,
          conversationId: conversationId,
          currentPaper: currentPaper,
          requestType: currentPaper ? 'edit' : 'generate'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.data.response || 'Paper updated successfully!',
          timestamp: new Date(),
          paperUpdate: data.data.paperUpdate
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update paper if provided
        if (data.data.paper) {
          setCurrentPaper({
            title: data.data.paper.title || 'Research Paper',
            abstract: data.data.paper.abstract || '',
            sections: data.data.paper.sections || [],
            references: data.data.paper.references || [],
            metadata: {
              wordCount: data.data.paper.wordCount || 0,
              lastUpdated: new Date(),
              version: (currentPaper?.metadata.version || 0) + 1
            }
          });
        }
      } else {
        throw new Error(data.message || 'Failed to process request');
      }
    } catch (error) {
      console.error('❌ Paper generation error:', error);
      
      // Fallback: Generate demo paper
      if (!currentPaper && currentInput.toLowerCase().includes('generate')) {
        generateDemoPaper(currentInput);
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I encountered an issue with the API. Let me generate a demo paper for you instead.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoPaper = (userRequest: string) => {
    const topic = extractTopicFromRequest(userRequest);
    
    const demoPaper: GeneratedPaper = {
      title: `AI-Driven Research Discovery and ${topic}: A Comprehensive Analysis`,
      abstract: `This paper presents a comprehensive analysis of AI-driven research methodologies in ${topic}. Through systematic investigation and analysis of research papers, we identify key patterns and propose novel approaches for automated research synthesis. Our findings demonstrate significant advances in semantic search capabilities and knowledge graph construction.`,
      sections: [
        {
          id: 'intro',
          title: '1. Introduction',
          content: `The field of ${topic} has experienced unprecedented growth in recent years. Traditional research methods struggle to cope with the volume and complexity of modern research output, necessitating AI-driven approaches for comprehensive knowledge discovery.\n\nThis study emerges from extensive analysis of research papers and automated discovery systems. We present novel insights into ${topic} research patterns and propose methodologies for AI-driven knowledge synthesis.\n\n### Research Objectives\n\nOur primary objectives include:\n- Systematic analysis of ${topic} research trends\n- Development of automated discovery methodologies\n- Enhancement of semantic search capabilities\n- Novel frameworks for knowledge integration`,
          order: 1
        },
        {
          id: 'related',
          title: '2. Related Work',
          content: `Recent advances in ${topic} have transformed research discovery processes. Machine learning approaches have demonstrated remarkable success in pattern recognition within large-scale research databases.\n\n### Previous Research\n\nNotable works in this area include automated hypothesis generation, research trend prediction, and cross-disciplinary knowledge transfer. Our work builds upon these foundations by integrating conversational AI with knowledge graph construction.\n\n### Research Gaps\n\nDespite significant progress, several gaps remain in ${topic} research, particularly in areas of automated synthesis and real-time knowledge integration.`,
          order: 2
        },
        {
          id: 'methodology',
          title: '3. Methodology',
          content: `Our research methodology combines multiple approaches to provide comprehensive analysis of ${topic}.\n\n### Data Collection\n\nWe utilized a comprehensive dataset comprising research papers across multiple domains related to ${topic}. Papers were selected based on relevance, publication quality, and temporal distribution.\n\n### Analysis Framework\n\nOur analysis framework includes:\n- **Semantic Analysis**: Vector-based similarity search using advanced embeddings\n- **Knowledge Graph Construction**: Relationship modeling using graph databases\n- **Pattern Recognition**: Machine learning approaches for trend identification\n- **Validation**: Cross-validation with expert knowledge\n\n### Implementation\n\nThe system was implemented using modern AI technologies including natural language processing, graph databases, and machine learning frameworks.`,
          order: 3
        },
        {
          id: 'results',
          title: '4. Results and Analysis',
          content: `Our analysis revealed significant patterns in ${topic} research:\n\n### Key Findings\n\n1. **Research Growth**: Exponential increase in ${topic} publications over the past five years\n2. **Collaboration Patterns**: Strong interdisciplinary collaboration networks\n3. **Methodological Evolution**: Shift towards AI-driven approaches\n4. **Geographic Distribution**: Global research participation with regional specializations\n\n### Performance Metrics\n\nSystem performance demonstrated:\n- **Accuracy**: 89.3% across all query types\n- **Coverage**: Successful analysis across 21 distinct research areas\n- **Efficiency**: Real-time processing of large-scale datasets\n\n### Statistical Analysis\n\nComprehensive statistical analysis reveals strong correlations between research productivity and AI adoption rates in ${topic}.`,
          order: 4
        },
        {
          id: 'discussion',
          title: '5. Discussion',
          content: `Our findings demonstrate the transformative potential of AI-driven research discovery in ${topic}. The high accuracy rates and strong semantic coherence suggest that automated research assistance can significantly augment human research capabilities.\n\n### Implications\n\nThe implications extend beyond technical performance to fundamental questions about the future of ${topic} research. Key implications include:\n\n- **Cognitive Load Reduction**: AI systems effectively reduce researcher cognitive burden\n- **Research Acceleration**: Potential for significant acceleration in discovery processes\n- **Quality Enhancement**: Improved comprehensiveness and accuracy of literature synthesis\n\n### Limitations\n\nOur study acknowledges several limitations:\n- Domain specificity in ${topic} research\n- Language bias towards English publications\n- Temporal scope limitations\n\n### Future Directions\n\nPromising directions for future work include multi-modal integration, real-time updates, and personalization algorithms.`,
          order: 5
        },
        {
          id: 'conclusion',
          title: '6. Conclusion',
          content: `This comprehensive analysis of AI-driven research discovery in ${topic} demonstrates significant potential for automated knowledge synthesis. Through systematic evaluation and extensive analysis, we have established benchmarks for research assistant performance.\n\nOur findings indicate that AI research systems can achieve high accuracy while maintaining strong semantic coherence across diverse ${topic} domains. The constructed knowledge graphs reveal important insights into research community structure and interdisciplinary connections.\n\nThe implications extend to fundamental questions about the future of scientific discovery in ${topic}. As AI systems become increasingly sophisticated, they promise to augment human research capabilities in unprecedented ways.\n\nFuture work will focus on expanding domain coverage, enhancing real-time capabilities, and developing more sophisticated personalization algorithms. The continued evolution of AI-driven research discovery represents a critical frontier in ${topic} advancement.`,
          order: 6
        }
      ],
      references: [
        'Chen, S., et al. (2024). "AI-Driven Research Discovery in Modern Science." *Nature AI*, 2(3), 123-135.',
        'Rodriguez, M., et al. (2023). "Knowledge Graph Construction for Scientific Discovery." *Science*, 381(6654), 456-461.',
        'Wang, L., et al. (2024). "Semantic Search in Research Databases." *ACM Computing Surveys*, 56(2), 1-42.',
        'Kumar, A., et al. (2024). "Machine Learning for Scientific Discovery." *Nature Machine Intelligence*, 6(3), 189-203.',
        'Thompson, R., et al. (2023). "Automated Literature Review Systems." *Annual Review of Information Science*, 58, 267-291.'
      ],
      metadata: {
        wordCount: 1250,
        lastUpdated: new Date(),
        version: 1
      }
    };

    setCurrentPaper(demoPaper);
    
    const successMessage: Message = {
      id: (Date.now() + 2).toString(),
      type: 'assistant',
      content: `✅ **Paper Generated Successfully!**

I've created a comprehensive research paper on "${topic}" with the following structure:

**📄 Sections Created:**
• Introduction with research objectives
• Related work and literature review  
• Methodology and implementation details
• Results and analysis with key findings
• Discussion of implications and limitations
• Conclusion and future directions

**📊 Paper Stats:**
• Word count: ~${demoPaper.metadata.wordCount} words
• References: ${demoPaper.references.length} citations
• Sections: ${demoPaper.sections.length} main sections

**✏️ What would you like me to adjust?**
• "Make the abstract longer"
• "Add more technical details to methodology"
• "Expand the results section"
• "Change the writing style to be more formal"
• "Add a new section on [topic]"`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, successMessage]);
  };

  const extractTopicFromRequest = (request: string): string => {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('neural network') || lowerRequest.includes('deep learning')) {
      return 'Neural Networks and Deep Learning';
    } else if (lowerRequest.includes('nlp') || lowerRequest.includes('natural language')) {
      return 'Natural Language Processing';
    } else if (lowerRequest.includes('computer vision') || lowerRequest.includes('image')) {
      return 'Computer Vision';
    } else if (lowerRequest.includes('machine learning') || lowerRequest.includes('ml')) {
      return 'Machine Learning';
    } else if (lowerRequest.includes('quantum')) {
      return 'Quantum Computing';
    } else if (lowerRequest.includes('robotics')) {
      return 'Robotics and Automation';
    } else {
      return 'Artificial Intelligence Research';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const downloadPaper = () => {
    if (!currentPaper) return;

    const paperContent = `# ${currentPaper.title}

## Abstract

${currentPaper.abstract}

${currentPaper.sections.map(section => `## ${section.title}\n\n${section.content}`).join('\n\n')}

## References

${currentPaper.references.map((ref, index) => `[${index + 1}] ${ref}`).join('\n')}

---
*Generated by ResearchReasoner AI Paper Generator*
*Word Count: ${currentPaper.metadata.wordCount} | Version: ${currentPaper.metadata.version}*
*Last Updated: ${currentPaper.metadata.lastUpdated.toLocaleDateString()}*`;

    const element = document.createElement('a');
    const file = new Blob([paperContent], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentPaper.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element && previewRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Research Paper Generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Left Side - Chat Agent (40%) */}
      <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Research Paper Generator</h3>
              <p className="text-sm text-gray-600">AI-powered academic writing assistant</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-purple-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`rounded-lg p-3 max-w-sm ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content.includes('**') ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br>')
                      }} />
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-600">Generating...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tell me what kind of paper to generate or how to modify it..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                rows={2}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>

      {/* Right Side - Paper Preview (60%) */}
      <div className="w-3/5 flex flex-col">
        {/* Preview Header */}
        <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-800">
                {currentPaper ? currentPaper.title : 'Paper Preview'}
              </h3>
              {currentPaper && (
                <p className="text-sm text-gray-600">
                  {currentPaper.metadata.wordCount} words • Version {currentPaper.metadata.version} • 
                  Last updated {currentPaper.metadata.lastUpdated.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          {currentPaper && (
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadPaper}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>

        {/* Paper Content or Empty State */}
        <div className="flex-1 overflow-y-auto bg-white">
          {currentPaper ? (
            <div ref={previewRef} className="max-w-4xl mx-auto p-8">
              {/* Table of Contents */}
              <div className="bg-gray-50 rounded-lg p-4 mb-8 border">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Table of Contents
                </h4>
                <div className="space-y-1">
                  <button
                    onClick={() => scrollToSection('abstract')}
                    className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Abstract
                  </button>
                  {currentPaper.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {section.title}
                    </button>
                  ))}
                  <button
                    onClick={() => scrollToSection('references')}
                    className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    References
                  </button>
                </div>
              </div>

              {/* Paper Title */}
              <h1 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
                {currentPaper.title}
              </h1>

              {/* Abstract */}
              <div id="section-abstract" className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                  Abstract
                </h2>
                <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  {currentPaper.abstract}
                </p>
              </div>

              {/* Sections */}
              {currentPaper.sections.map((section) => (
                <div key={section.id} id={`section-${section.id}`} className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                    {section.title}
                  </h2>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content.split('\n').map((paragraph, index) => {
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={index} className="text-lg font-medium text-gray-800 mt-6 mb-3">
                            {paragraph.replace('### ', '')}
                          </h3>
                        );
                      } else if (paragraph.startsWith('- ')) {
                        return (
                          <li key={index} className="ml-4 mb-1">
                            {paragraph.replace('- ', '')}
                          </li>
                        );
                      } else if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <p key={index} className="font-semibold mt-4 mb-2">
                            {paragraph.replace(/\*\*/g, '')}
                          </p>
                        );
                      } else if (paragraph.trim()) {
                        return (
                          <p key={index} className="mb-4">
                            {paragraph}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}

              {/* References */}
              <div id="section-references" className="mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                  References
                </h2>
                <div className="space-y-2">
                  {currentPaper.references.map((reference, index) => (
                    <p key={index} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                      [{index + 1}] {reference}
                    </p>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-6 mt-8 text-center text-gray-500 text-sm">
                <p>Generated by ResearchReasoner AI Paper Generator</p>
                <p>Word Count: {currentPaper.metadata.wordCount} • Version: {currentPaper.metadata.version}</p>
                <p>Last Updated: {currentPaper.metadata.lastUpdated.toLocaleDateString()}</p>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No Paper Generated Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Chat with the AI assistant on the left to generate your research paper. 
                  You can create new papers or modify existing ones in real-time.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Try asking:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• "Generate a survey paper on machine learning"</div>
                    <div>• "Create a technical report on neural networks"</div>
                    <div>• "Write a research paper about quantum computing"</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearchPaperGenerator;