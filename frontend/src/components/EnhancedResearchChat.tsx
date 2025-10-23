// EnhancedResearchChat.tsx - Advanced Research Chat with Multi-Step Reasoning
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, FileText, Loader, Lightbulb, Search, BookOpen, Brain,
  Layers, TrendingUp, GitBranch, Download, Settings, BarChart3, MessageSquare,
  ChevronDown, ChevronRight, Clock, Target, Beaker, Zap
} from 'lucide-react';
import API_CONFIG, { getApiUrl } from '../config/api';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'investigation';
  content: string;
  timestamp: Date;
  sources?: any[];
  suggestedQuestions?: string[];
  confidence?: number;
  reasoning?: string;
  investigation?: MultiStepInvestigation;
  advanced?: boolean;
}

interface MultiStepInvestigation {
  originalQuestion: string;
  steps: ResearchStep[];
  synthesis: string;
  conclusions: string[];
  limitationsAndGaps: string[];
  suggestedResearch: string[];
  sources: any[];
  totalConfidence: number;
}

interface ResearchStep {
  id: string;
  question: string;
  reasoning: string;
  findings: any[];
  confidence: number;
  nextSteps: string[];
}

interface EnhancedResearchChatProps {
  topic?: string;
}

const EnhancedResearchChat: React.FC<EnhancedResearchChatProps> = ({ topic }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState<'simple' | 'advanced' | 'investigation'>('simple');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation session
  useEffect(() => {
    initializeConversation();
  }, [topic]);

  // Add enhanced welcome message
  useEffect(() => {
    if (messages.length === 0 && conversationId) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'assistant',
        content: `🧠 **Enhanced AI Research Assistant** activated!\n\nI now have advanced capabilities including:\n• **Multi-step research investigations** for complex questions\n• **Cross-topic synthesis** across research areas\n• **Temporal trend analysis** over time periods\n• **Methodology comparisons** between approaches\n• **Persistent conversation memory**\n\n**Research Modes:**\n• **Simple**: Quick answers from your database\n• **Advanced**: Deeper analysis with multiple sources\n• **Investigation**: Multi-step reasoning for complex research questions\n\nTry asking complex research questions or switch modes using the controls above!`,
        timestamp: new Date(),
        suggestedQuestions: [
          "Investigate the evolution of transformer architectures in NLP",
          "Compare deep learning methodologies in computer vision",
          "Synthesize research across machine learning and robotics",
          "Analyze trends in AI research from 2020 to 2024"
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [conversationId]);

  const initializeConversation = async () => {
    try {
      const response = await fetch(getApiUrl('/conversations/start'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: topic,
          userId: 'user_' + Date.now() // In production, use actual user ID
        })
      });

      if (response.ok) {
        const result = await response.json();
        setConversationId(result.data.conversationId);
        console.log('✅ Conversation initialized:', result.data.conversationId);
      }
    } catch (error) {
      console.warn('Could not initialize conversation:', error);
    }
  };

  const sendMessage = async (messageText?: string, forceMode?: string) => {
    const text = messageText || inputMessage.trim();
    const mode = forceMode || researchMode;
    
    if (!text || isLoading || !conversationId) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response;
      
      if (mode === 'investigation') {
        // Use multi-step research investigation
        response = await fetch(getApiUrl('/research/investigate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            question: text,
            topic: topic
          })
        });
      } else {
        // Use the /api/chat endpoint instead
     const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://researchreasoner-backend-production.up.railway.app/api'}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: text,
        mode: mode,
        conversationId: conversationId,
        topic: topic
      })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from research assistant');
      }

      const result = await response.json();

      // Add assistant response based on mode
      let assistantMessage: ChatMessage;

      if (mode === 'investigation') {
        assistantMessage = {
          id: `investigation-${Date.now()}`,
          type: 'investigation',
          content: result.data.investigation.synthesis,
          timestamp: new Date(),
          investigation: result.data.investigation,
          confidence: result.data.investigation.totalConfidence
        };
      } else {
        const responseData = result.data.response;
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: responseData.type === 'investigation' ? responseData.summary : responseData.answer,
          timestamp: new Date(),
          sources: responseData.sources,
          suggestedQuestions: responseData.suggestedQuestions,
          confidence: responseData.confidence,
          reasoning: responseData.reasoning,
          advanced: mode === 'advanced'
        };
      }

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your question. Please ensure the research system is available and try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <p key={index} className={line.trim() === '' ? 'mb-2' : 'mb-1'}>
        {line.includes('**') ? (
          <span dangerouslySetInnerHTML={{ 
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
          }} />
        ) : (
          line || '\u00A0'
        )}
      </p>
    ));
  };

  const renderInvestigationResult = (investigation: MultiStepInvestigation, messageId: string) => {
    return (
      <div className="mt-4 space-y-4">
        {/* Investigation Steps */}
        <div className="border border-blue-200 rounded-lg">
          <button
            onClick={() => setShowSteps(showSteps === messageId ? null : messageId)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">
                Research Investigation ({investigation.steps.length} steps)
              </span>
            </div>
            {showSteps === messageId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {showSteps === messageId && (
            <div className="p-3 border-t border-blue-200 space-y-3">
              {investigation.steps.map((step, index) => (
                <div key={step.id} className="bg-white rounded border border-gray-200 p-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1">{step.question}</h4>
                      <p className="text-sm text-gray-600 mb-2">{step.reasoning}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{step.findings.length} papers found</span>
                        <span>Confidence: {step.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Key Conclusions */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="font-medium text-green-800 mb-2 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Key Conclusions
          </h4>
          <ul className="space-y-1">
            {investigation.conclusions.map((conclusion, index) => (
              <li key={index} className="text-sm text-green-700">
                • {conclusion}
              </li>
            ))}
          </ul>
        </div>

        {/* Research Gaps */}
        {investigation.limitationsAndGaps.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Research Gaps & Limitations
            </h4>
            <ul className="space-y-1">
              {investigation.limitationsAndGaps.map((gap, index) => (
                <li key={index} className="text-sm text-yellow-700">
                  • {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Future Research */}
        {investigation.suggestedResearch.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h4 className="font-medium text-purple-800 mb-2 flex items-center">
              <Beaker className="w-4 h-4 mr-2" />
              Suggested Future Research
            </h4>
            <div className="space-y-1">
              {investigation.suggestedResearch.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion, 'investigation')}
                  className="block w-full text-left text-sm text-purple-700 hover:text-purple-900 hover:bg-purple-100 p-1 rounded transition-colors"
                  disabled={isLoading}
                >
                  • {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const generateReport = async () => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(getApiUrl('/research/generate-report'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: conversationId,
          title: `Research Report - ${topic || 'General Research'}`,
          includeInvestigations: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Create downloadable report
        const blob = new Blob([result.data.report.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-report-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Research report generated and downloaded');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Enhanced Research Assistant</h3>
            <p className="text-sm text-gray-600">
              {topic ? `Exploring ${topic}` : 'Multi-step reasoning enabled'}
            </p>
          </div>
        </div>
        
        {/* Research Mode Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">Mode:</label>
            <select
              value={researchMode}
              onChange={(e) => setResearchMode(e.target.value as any)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="simple">Simple</option>
              <option value="advanced">Advanced</option>
              <option value="investigation">Investigation</option>
            </select>
          </div>
          
          <button
            onClick={generateReport}
            disabled={messages.length <= 1 || !conversationId}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
            title="Generate Research Report"
          >
            <Download className="w-3 h-3" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Mode Info Banner */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1">
            {researchMode === 'simple' && <MessageSquare className="w-3 h-3 text-blue-600" />}
            {researchMode === 'advanced' && <Layers className="w-3 h-3 text-purple-600" />}
            {researchMode === 'investigation' && <GitBranch className="w-3 h-3 text-green-600" />}
            <span className="font-medium text-gray-700">
              {researchMode === 'simple' && 'Simple Mode: Quick answers from database'}
              {researchMode === 'advanced' && 'Advanced Mode: Deep analysis with multiple sources'}
              {researchMode === 'investigation' && 'Investigation Mode: Multi-step research reasoning'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: '500px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-3 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-blue-600' 
                  : message.type === 'investigation'
                  ? 'bg-gradient-to-br from-green-600 to-blue-600'
                  : 'bg-purple-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : message.type === 'investigation' ? (
                  <GitBranch className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {/* Main message */}
                <div className="text-sm leading-relaxed">
                  {formatMessageContent(message.content)}
                </div>

                {/* Investigation Results */}
                {message.investigation && (
                  renderInvestigationResult(message.investigation, message.id)
                )}

                {/* Traditional Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {message.sources.length} Research Paper{message.sources.length > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {showSources === message.id ? 'Hide' : 'Show'} Sources
                      </button>
                    </div>
                    
                    {showSources === message.id && (
                      <div className="space-y-2">
                        {message.sources.map((source, index) => (
                          <div key={index} className="text-xs bg-white p-2 rounded border border-gray-200">
                            <div className="font-medium text-gray-800">{source.title}</div>
                            <div className="text-gray-600">
                              {source.authors?.slice(0, 2).join(', ')} ({source.year})
                            </div>
                            <div className="text-gray-500">
                              Citations: {source.citationCount} • Relevance: {Math.round((source.relevance || 0) * 100)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Confidence and Advanced Indicators */}
                {(message.confidence || message.advanced) && (
                  <div className="mt-2 flex items-center space-x-3 text-xs text-gray-600">
                    {message.confidence && (
                      <span className="inline-flex items-center">
                        <Search className="w-3 h-3 mr-1" />
                        Confidence: {message.confidence}%
                      </span>
                    )}
                    {message.advanced && (
                      <span className="inline-flex items-center text-purple-600">
                        <Zap className="w-3 h-3 mr-1" />
                        Advanced Analysis
                      </span>
                    )}
                  </div>
                )}

                {/* Suggested Questions */}
                {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Follow-up Questions
                    </div>
                    <div className="space-y-1">
                      {message.suggestedQuestions.map((question, index) => (
                        <button
                          key={index}
                          onClick={() => sendMessage(question)}
                          className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded"
                          disabled={isLoading}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-2 text-xs opacity-70 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                researchMode === 'investigation' 
                  ? 'bg-gradient-to-br from-green-600 to-blue-600'
                  : 'bg-purple-600'
              }`}>
                {researchMode === 'investigation' ? (
                  <GitBranch className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {researchMode === 'investigation' 
                      ? 'Conducting multi-step research investigation...'
                      : researchMode === 'advanced'
                      ? 'Performing advanced analysis...'
                      : 'Searching research papers...'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                researchMode === 'investigation' 
                  ? "Ask a complex research question for multi-step investigation..."
                  : researchMode === 'advanced'
                  ? "Ask for advanced analysis of your research topic..."
                  : "Ask about your research papers..."
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {researchMode === 'investigation' && 'Investigation mode: Complex questions will be broken down into research steps'}
          {researchMode === 'advanced' && 'Advanced mode: Deep analysis with enhanced reasoning'}
          {researchMode === 'simple' && 'Simple mode: Quick answers from your research database'}
        </div>
      </div>
    </div>
  );
};

export default EnhancedResearchChat;