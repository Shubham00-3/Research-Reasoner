// ChatTab.tsx - Fixed version
import React, { useState, useEffect } from 'react';
import { MessageCircle, Zap, Database, Brain, TrendingUp, Users, Settings } from 'lucide-react';
import ResearchChat from '../ResearchChat';
import { getApiUrl } from '../../config/api';

interface ChatTabProps {
  data: any;
  topic: string;
}

const ChatTab: React.FC<ChatTabProps> = ({ data, topic }) => {
  const [chatReady, setChatReady] = useState(false);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Check if chat system is ready
  useEffect(() => {
    checkChatReadiness();
  }, []);

  const checkChatReadiness = async () => {
    try {
      console.log('🔍 Checking chat readiness...');
      // ✅ Try database stats first to test if we can get system info
      const response = await fetch(getApiUrl('/database-stats'));
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Database stats result:', result);
        
        // For now, let's just set some basic stats and assume ready if we have database connection
        setSystemStats({
          database: { connected: result.connected || false, papers: result.papers || 0, authors: result.authors || 0 },
          embeddings: { embeddingCoveragePercentage: 0 },
          systemFeatures: { semanticSearch: false, hybridSearch: false, chatAssistanceRAG: false },
          chatReadiness: { readyToChat: false, recommendation: 'Click Initialize AI Features to get started' }
        });
        
        // For testing, let's just check if we need to initialize
        const isReady = true; // Will be true after embeddings are initialized
        setChatReady(isReady);
        
        console.log('✅ Chat ready status:', isReady);
      } else {
        console.error('❌ Health check failed:', response.status);
        setChatReady(false);
      }
    } catch (error) {
      console.warn('❌ Could not check chat readiness:', error);
      setChatReady(false);
    }
  };

  const initializeEmbeddings = async () => {
    if (isInitializing) {
      console.log('⚠️ Already initializing...');
      return;
    }
    
    console.log('🚀 Starting embeddings initialization...');
    setIsInitializing(true);
    
    try {
      const response = await fetch(getApiUrl('/initialize-embeddings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batchSize: 20 })
      });

      console.log('📡 Initialize embeddings response:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Embeddings initialization started:', result);
        
        // Check readiness again after a delay
        setIsInitializing(false);
         setChatReady(true);
      } else {
        console.error('❌ Initialize embeddings failed:', response.status);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setIsInitializing(false);
      }
    } catch (error) {
      console.error('❌ Failed to initialize embeddings:', error);
      setIsInitializing(false);
    }
  };

  // Show setup screen if not ready
  // if (!chatReady && systemStats) {
  //   return (
  //     <div className="p-8">
  //       {/* System Status Header */}
  //       <div className="mb-8">
  //         <h3 className="text-2xl font-semibold text-gray-800 mb-2">
  //           AI Research Assistant
  //         </h3>
  //         <p className="text-gray-600">
  //           Setting up your intelligent research companion...
  //         </p>
  //       </div>

  //       {/* System Status Cards */}
  //       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  //         {/* Database Status */}
  //         <div className="bg-white rounded-xl border border-gray-200 p-6">
  //           <div className="flex items-center space-x-3 mb-4">
  //             <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
  //               systemStats.database?.connected 
  //                 ? 'bg-green-100 text-green-600' 
  //                 : 'bg-red-100 text-red-600'
  //             }`}>
  //               <Database size={20} />
  //             </div>
  //             <div>
  //               <h4 className="font-semibold text-gray-800">Database</h4>
  //               <p className="text-sm text-gray-600">
  //                 {systemStats.database?.connected ? 'Connected' : 'Disconnected'}
  //               </p>
  //             </div>
  //           </div>
  //           <div className="space-y-2 text-sm">
  //             <div className="flex justify-between">
  //               <span className="text-gray-600">Papers:</span>
  //               <span className="font-medium">{systemStats.database?.papers || 0}</span>
  //             </div>
  //             <div className="flex justify-between">
  //               <span className="text-gray-600">Authors:</span>
  //               <span className="font-medium">{systemStats.database?.authors || 0}</span>
  //             </div>
  //           </div>
  //         </div>

  //         {/* Embeddings Status */}
  //         <div className="bg-white rounded-xl border border-gray-200 p-6">
  //           <div className="flex items-center space-x-3 mb-4">
  //             <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
  //               (systemStats.embeddings?.embeddingCoveragePercentage || 0) > 50
  //                 ? 'bg-green-100 text-green-600' 
  //                 : 'bg-yellow-100 text-yellow-600'
  //             }`}>
  //               <Brain size={20} />
  //             </div>
  //             <div>
  //               <h4 className="font-semibold text-gray-800">Vector Search</h4>
  //               <p className="text-sm text-gray-600">
  //                 {(systemStats.embeddings?.embeddingCoveragePercentage || 0) > 50 ? 'Ready' : 'Initializing'}
  //               </p>
  //             </div>
  //           </div>
  //           <div className="space-y-2 text-sm">
  //             <div className="flex justify-between">
  //               <span className="text-gray-600">Coverage:</span>
  //               <span className="font-medium">
  //                 {Math.round(systemStats.embeddings?.embeddingCoveragePercentage || 0)}%
  //               </span>
  //             </div>
  //             <div className="w-full bg-gray-200 rounded-full h-2">
  //               <div 
  //                 className={`h-2 rounded-full ${
  //                   (systemStats.embeddings?.embeddingCoveragePercentage || 0) > 50 
  //                     ? 'bg-green-600' 
  //                     : 'bg-yellow-600'
  //                 }`}
  //                 style={{ width: `${systemStats.embeddings?.embeddingCoveragePercentage || 0}%` }}
  //               ></div>
  //             </div>
  //           </div>
  //         </div>

  //         {/* Chat Features */}
  //         <div className="bg-white rounded-xl border border-gray-200 p-6">
  //           <div className="flex items-center space-x-3 mb-4">
  //             <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
  //               <MessageCircle size={20} />
  //             </div>
  //             <div>
  //               <h4 className="font-semibold text-gray-800">Chat Features</h4>
  //               <p className="text-sm text-gray-600">AI Capabilities</p>
  //             </div>
  //           </div>
  //           <div className="space-y-2 text-sm">
  //             <div className="flex items-center space-x-2">
  //               <div className={`w-2 h-2 rounded-full ${
  //                 systemStats.systemFeatures?.semanticSearch ? 'bg-green-500' : 'bg-gray-300'
  //               }`}></div>
  //               <span className="text-gray-600">Semantic Search</span>
  //             </div>
  //             <div className="flex items-center space-x-2">
  //               <div className={`w-2 h-2 rounded-full ${
  //                 systemStats.systemFeatures?.hybridSearch ? 'bg-green-500' : 'bg-gray-300'
  //               }`}></div>
  //               <span className="text-gray-600">Graph Analysis</span>
  //             </div>
  //             <div className="flex items-center space-x-2">
  //               <div className={`w-2 h-2 rounded-full ${
  //                 systemStats.systemFeatures?.chatAssistanceRAG ? 'bg-green-500' : 'bg-gray-300'
  //               }`}></div>
  //               <span className="text-gray-600">Full Content Access</span>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Setup Instructions */}
  //       <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
  //         <div className="flex items-start space-x-4">
  //           <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
  //             <Zap className="w-6 h-6 text-white" />
  //           </div>
  //           <div className="flex-1">
  //             <h4 className="text-lg font-semibold text-gray-800 mb-2">
  //               Ready to Initialize AI Features?
  //             </h4>
  //             <p className="text-gray-600 mb-4">
  //               {systemStats.chatReadiness?.recommendation || 
  //                'Click below to enable semantic search and unlock the full power of your research assistant.'}
  //             </p>
              
  //             <div className="flex items-center space-x-4">
  //               <button
  //                 onClick={initializeEmbeddings}
  //                 disabled={isInitializing || (systemStats.embeddings?.embeddingCoveragePercentage || 0) > 80}
  //                 className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
  //               >
  //                 {isInitializing ? (
  //                   <>
  //                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
  //                     <span>Initializing...</span>
  //                   </>
  //                 ) : (
  //                   <>
  //                     <Zap size={16} />
  //                     <span>Initialize AI Features</span>
  //                   </>
  //                 )}
  //               </button>
                
  //               <button
  //                 onClick={checkChatReadiness}
  //                 className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
  //               >
  //                 Check Status
  //               </button>
  //             </div>

  //             {isInitializing && (
  //               <div className="mt-4 p-3 bg-blue-100 rounded-lg">
  //                 <p className="text-sm text-blue-800">
  //                   🧠 Generating semantic embeddings for your papers... This may take a few minutes for large databases.
  //                 </p>
  //               </div>
  //             )}
  //           </div>
  //         </div>
  //       </div>

  //       {/* What You'll Get */}
  //       <div className="mt-8">
  //         <h4 className="text-lg font-semibold text-gray-800 mb-4">
  //           What You'll Be Able to Do
  //         </h4>
  //         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //           <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
  //             <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
  //             <div>
  //               <h5 className="font-medium text-gray-800">Semantic Research Queries</h5>
  //               <p className="text-sm text-gray-600">Ask natural language questions and get intelligent answers based on paper content</p>
  //             </div>
  //           </div>
  //           <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
  //             <Users className="w-5 h-5 text-green-600 mt-0.5" />
  //             <div>
  //               <h5 className="font-medium text-gray-800">Author & Citation Analysis</h5>
  //               <p className="text-sm text-gray-600">Discover connections between researchers and trace citation networks</p>
  //             </div>
  //           </div>
  //           <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
  //             <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
  //             <div>
  //               <h5 className="font-medium text-gray-800">Content-Aware Search</h5>
  //               <p className="text-sm text-gray-600">Find papers by meaning and concepts, not just keywords</p>
  //             </div>
  //           </div>
  //           <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-gray-200">
  //             <MessageCircle className="w-5 h-5 text-orange-600 mt-0.5" />
  //             <div>
  //               <h5 className="font-medium text-gray-800">Conversational Interface</h5>
  //               <p className="text-sm text-gray-600">Chat naturally with your research database and get contextual answers</p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // // Show chat interface when ready
  // return (
  //   <div className="p-6 h-full">
  //     {/* Chat Interface Header */}
  //     <div className="mb-6">
  //       <div className="flex items-center justify-between">
  //         <div className="flex items-center space-x-3">
  //           <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
  //             <MessageCircle className="w-6 h-6 text-white" />
  //           </div>
  //           <div>
  //             <h3 className="text-xl font-semibold text-gray-800">
  //               AI Research Assistant
  //             </h3>
  //             <p className="text-gray-600">
  //               Chat with your {data.papersFound || '400+'} research papers
  //             </p>
  //           </div>
  //         </div>
          
  //         {/* Quick Stats */}
  //         <div className="flex items-center space-x-4 text-sm">
  //           <div className="text-center">
  //             <div className="font-semibold text-gray-800">{data.papersFound || '400+'}</div>
  //             <div className="text-gray-600">Papers</div>
  //           </div>
  //           <div className="text-center">
  //             <div className="font-semibold text-gray-800">{data.authorsAnalyzed || '1000+'}</div>
  //             <div className="text-gray-600">Authors</div>
  //           </div>
  //           <div className="text-center">
  //             <div className="font-semibold text-green-600">Ready</div>
  //             <div className="text-gray-600">AI Status</div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>

  //     {/* Main Chat Interface */}
  //     <div className="h-[600px]">
  //       <ResearchChat topic={topic} />
  //     </div>

  //     {/* Tips */}
  //     <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
  //       <h4 className="font-medium text-blue-800 mb-2">💡 Chat Tips</h4>
  //       <div className="text-sm text-blue-700 grid grid-cols-1 md:grid-cols-2 gap-2">
  //         <div>• Ask about specific research topics or methodologies</div>
  //         <div>• Request comparisons between different approaches</div>
  //         <div>• Inquire about author collaborations and citations</div>
  //         <div>• Explore connections between research areas</div>
  //       </div>
  //     </div>
  //   </div>
  // );
  return (
    <div className="p-2 sm:p-4 md:p-6 h-full min-h-[50vh] sm:min-h-[520px]">
      <ResearchChat topic={topic} />
    </div>
  );
};

export default ChatTab;