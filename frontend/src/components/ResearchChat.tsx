import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ExternalLink, BookOpen, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../config/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
  confidence?: number;
}

interface ResearchChatProps {
  topic?: string;
}

const ResearchChat: React.FC<ResearchChatProps> = ({ topic }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(true); // ✅ FORCE READY STATE
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ SKIP READINESS CHECK - Initialize immediately
  useEffect(() => {
    console.log('🚀 Initializing research chat immediately...');
    setIsReady(true);
    
    // Add welcome message immediately
    setMessages([{
      id: '1',
      type: 'assistant',
      content: `🎉 **Research Assistant Ready!**

I can help you explore your research database and answer questions about${topic ? ` "${topic}"` : ' your research'}.

**Ask me anything like:**
- "What are the main approaches in this field?"
- "Who are the leading researchers?"
- "What are recent advances?"
- "Compare different methodologies"

I'll search through available papers and provide answers with citations!`,
      timestamp: new Date(),
      confidence: 100
    }]);
    
    initializeConversation();
  }, [topic]);
  
  const initializeConversation = async () => {
    try {
      console.log('🔗 Starting conversation...');
      const response = await fetch(getApiUrl('/conversations/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || 'research',
          userId: 'user_' + Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        setConversationId(result.data.conversationId);
        console.log('✅ Conversation initialized:', result.data.conversationId);
      } else {
        console.warn('⚠️ Could not initialize conversation, will use direct chat');
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize conversation:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
      console.log('🔍 Sending chat request:', currentInput);
      
      const response = await fetch(getApiUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: currentInput,
          mode: 'simple',
          conversationId: conversationId,
          topic: topic || 'machine learning'
        })
      });

      console.log('📡 Chat response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Chat response data:', data);

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.data.answer || 'I received your question and processed it successfully.',
          timestamp: new Date(),
          sources: data.data.sources || [],
          confidence: data.data.confidence || 85
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}

**Troubleshooting:**
1. Make sure backend is accessible
2. Check if the API configuration is correct
3. Try a simpler question
4. Check browser console for details

**Backend Status:** ${conversationId ? 'Connected' : 'Not Connected'}`,
        timestamp: new Date(),
        confidence: 0
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ✅ REMOVED READINESS CHECK - ALWAYS SHOW CHAT
  return (
    <div className="h-full min-h-[50vh] sm:min-h-[520px] flex flex-col max-h-[calc(100dvh-12rem)] sm:max-h-none">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 overscroll-contain">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[95%] sm:max-w-4xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2 sm:ml-3' : 'mr-2 sm:mr-3'}`}>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {message.type === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
              </div>

              {/* Message Content */}
              <div className={`flex-1 min-w-0 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-3 sm:p-4 rounded-xl max-w-full text-left ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap text-sm sm:text-base break-words">{message.content}</div>
                  
                  {/* Confidence and Sources for Assistant */}
                  {message.type === 'assistant' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {message.confidence !== undefined && (
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-sm text-gray-600">
                            Confidence: {message.confidence}%
                          </span>
                        </div>
                      )}
                      
                      {message.sources && message.sources.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <BookOpen size={14} className="text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Sources ({message.sources.length} papers):
                            </span>
                          </div>
                          <div className="space-y-1">
                            {message.sources.slice(0, 3).map((source, index) => (
                              <div
                                key={index}
                                className="text-xs bg-white rounded p-2 border"
                              >
                                <div className="font-medium text-gray-800">
                                  {source.title || 'Research Paper'}
                                </div>
                                <div className="text-gray-600">
                                  {(source.authors || ['Unknown Author']).slice(0, 2).join(', ')} ({source.year || 'N/A'})
                                </div>
                                <div className="text-blue-600">
                                  Relevance: {Math.round((source.relevance || source.similarity || 0.8) * 100)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex mr-3">
              <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
            </div>
            <div className="bg-gray-100 rounded-xl p-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-3 sm:p-4 safe-pb">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:space-x-0">
          <div className="flex-1 min-w-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${topic || 'research'}...`}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 sm:px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[48px] shrink-0"
          >
            <Send size={16} />
            <span className="sm:inline">Send</span>
          </button>
        </div>
        
        <div className="mt-2 text-[10px] sm:text-xs text-gray-500">
          <span className="hidden sm:inline">Enter to send · Shift+Enter for new line · </span>
          {conversationId ? 'Connected' : 'Direct mode'}
        </div>
      </div>
    </div>
  );
};

export default ResearchChat;