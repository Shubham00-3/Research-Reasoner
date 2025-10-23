// File: frontend/src/components/BulkDownloadManager.tsx

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, XCircle, Clock, FileText, HardDrive, Trash2 } from 'lucide-react';
import { getApiUrl, getPaperDownloadUrl } from '../config/api';

interface DownloadProgress {
  paperId: string;
  title: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  filePath?: string;
  fileSize?: number;
}

interface BulkDownloadResult {
  sessionId: string;
  totalPapers: number;
  completed: number;
  failed: number;
  totalSize: number;
  downloadPaths: string[];
  progress: DownloadProgress[];
}

interface BulkDownloadManagerProps {
  papers: any[];
  topic: string;
  onDownloadComplete?: (result: BulkDownloadResult) => void;
}

const BulkDownloadManager: React.FC<BulkDownloadManagerProps> = ({ 
  papers, 
  topic, 
  onDownloadComplete 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<BulkDownloadResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Start bulk download
  const startBulkDownload = async () => {
    if (papers.length === 0) return;

    setIsDownloading(true);
    setShowProgress(true);
    
    try {
      console.log(`📥 Starting bulk download of ${papers.length} papers`);
      
      const response = await fetch(getApiUrl('/download-papers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          papers: papers,
          topic: topic 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDownloadResult(result.data);
        setSessionId(result.data.sessionId);
        
        // Start polling for progress if we have a session ID
        if (result.data.sessionId) {
          pollDownloadProgress(result.data.sessionId);
        }

        onDownloadComplete?.(result.data);
        console.log('✅ Bulk download initiated:', result.data);
      } else {
        console.error('❌ Bulk download failed');
      }
    } catch (error) {
      console.error('❌ Bulk download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Poll download progress
  const pollDownloadProgress = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${getApiUrl('/download-progress')}/${sessionId}`);
        
        if (response.ok) {
          const progressData = await response.json();
          setDownloadResult(progressData.data);
          
          // Stop polling when download is complete
          if (progressData.data.completed + progressData.data.failed >= progressData.data.totalPapers) {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.warn('⚠️ Progress polling failed:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'downloading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  // Get overall progress percentage
  const getOverallProgress = (): number => {
    if (!downloadResult || downloadResult.totalPapers === 0) return 0;
    return Math.round(((downloadResult.completed + downloadResult.failed) / downloadResult.totalPapers) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Download Control Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Bulk Paper Download</h3>
            <p className="text-sm text-gray-600">
              Download all {papers.length} papers for offline access and analysis
            </p>
          </div>
          
          <button
            onClick={startBulkDownload}
            disabled={isDownloading || papers.length === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            <span>
              {isDownloading ? 'Downloading...' : `Download All ${papers.length} Papers`}
            </span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{papers.length}</div>
            <div className="text-xs text-blue-800">Total Papers</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {downloadResult?.completed || 0}
            </div>
            <div className="text-xs text-green-800">Downloaded</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {downloadResult?.failed || 0}
            </div>
            <div className="text-xs text-red-800">Failed</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {downloadResult?.totalSize ? formatFileSize(downloadResult.totalSize) : '0 MB'}
            </div>
            <div className="text-xs text-purple-800">Total Size</div>
          </div>
        </div>
      </div>

      {/* Progress Panel */}
      {showProgress && downloadResult && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Progress Header */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-800">Download Progress</h4>
                <p className="text-sm text-gray-600">
                  {downloadResult.completed + downloadResult.failed} of {downloadResult.totalPapers} processed
                </p>
              </div>
              <button
                onClick={() => setShowProgress(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Overall Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{getOverallProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getOverallProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Individual Paper Progress */}
          <div className="max-h-96 overflow-y-auto">
            {downloadResult.progress.map((item, index) => (
              <div
                key={item.paperId}
                className={`px-6 py-3 border-b border-gray-100 ${
                  item.status === 'completed' ? 'bg-green-50' :
                  item.status === 'failed' ? 'bg-red-50' :
                  item.status === 'downloading' ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>Paper {index + 1}</span>
                        {item.fileSize && (
                          <span>{formatFileSize(item.fileSize)}</span>
                        )}
                        {item.error && (
                          <span className="text-red-600">{item.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {item.status === 'completed' && item.filePath && (
                      <button
                        onClick={() => window.open(getPaperDownloadUrl(item.paperId), '_blank')}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="View Downloaded File"
                      >
                        <FileText size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar for Individual Items */}
                {item.status === 'downloading' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Progress Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">
                  Session: {sessionId?.substring(0, 8)}...
                </span>
                <span className="text-gray-600">
                  Topic: {topic}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-green-600 font-medium">
                  ✓ {downloadResult.completed} completed
                </span>
                {downloadResult.failed > 0 && (
                  <span className="text-red-600 font-medium">
                    ✗ {downloadResult.failed} failed
                  </span>
                )}
                <span className="text-blue-600 font-medium">
                  {formatFileSize(downloadResult.totalSize)} total
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Complete Summary */}
      {downloadResult && !isDownloading && getOverallProgress() === 100 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle size={24} className="text-green-500" />
            <h4 className="text-lg font-semibold text-gray-800">Download Complete!</h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{downloadResult.completed}</div>
              <div className="text-sm text-gray-600">Successfully Downloaded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{downloadResult.failed}</div>
              <div className="text-sm text-gray-600">Failed Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatFileSize(downloadResult.totalSize)}
              </div>
              <div className="text-sm text-gray-600">Total Downloaded</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((downloadResult.completed / downloadResult.totalPapers) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              All papers have been processed and are now available for offline access through the knowledge graph.
            </p>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProgress(false)}
                className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hide Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkDownloadManager;