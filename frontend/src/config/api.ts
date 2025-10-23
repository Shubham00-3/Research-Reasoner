/**
 * API Configuration
 * Centralized API endpoint management
 */

// Get the API base URL from environment or use fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://researchreasoner-backend-production.up.railway.app/api';
const API_SERVER_URL = API_BASE_URL.replace(/\/api$/, ''); // Server URL without /api

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  SERVER_URL: API_SERVER_URL,
  ENDPOINTS: {
    SEARCH_PAPERS: '/search-papers',
    BUILD_GRAPH: '/build-knowledge-graph',
    GENERATE_INSIGHTS: '/generate-insights',
    CHAT: '/chat',
    HEALTH: '/health',
    CONVERSATIONS_START: '/conversations/start',
    RESEARCH_INVESTIGATE: '/research/investigate',
    RESEARCH_GENERATE_REPORT: '/research/generate-report',
    GENERATE_RESEARCH_PAPER: '/generate-research-paper',
    DOWNLOAD_PAPERS: '/download-papers',
    DOWNLOAD_PROGRESS: '/download-progress',
    DATABASE_STATS: '/database-stats',
    INITIALIZE_EMBEDDINGS: '/initialize-embeddings'
  }
};

// Helper to get full API URL
export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}${cleanEndpoint}`;
};

// Helper to get paper content URL
export const getPaperContentUrl = (paperId: string) => {
  return `${API_CONFIG.BASE_URL}/paper-content/${paperId}`;
};

// Helper to get download status URL
export const getDownloadStatusUrl = (topic: string) => {
  return `${API_CONFIG.BASE_URL}/download-status/${topic}`;
};

// Helper to get download URL
export const getDownloadUrl = (path: string) => {
  return `${API_CONFIG.SERVER_URL}${path}`;
};

// Helper to get paper download URL
export const getPaperDownloadUrl = (paperId: string) => {
  return `${API_CONFIG.BASE_URL}/download/paper/${paperId}`;
};

export default API_CONFIG;

