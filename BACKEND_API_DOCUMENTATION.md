# 🔌 Backend API Documentation

## Base URL
```
https://researchreasoner-backend-production.up.railway.app/api
```

---

## 📋 **All Endpoints**

### **1. Health Check**

#### `GET /health`
Check if backend is running

**Response**:
```json
{
  "status": "ok"
}
```

---

### **2. Search Papers**

#### `POST /api/search-papers`
Search for research papers on a topic

**Request Body**:
```json
{
  "query": "machine learning",
  "limit": 20
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "papers": [
      {
        "id": "paper123",
        "title": "Paper Title",
        "authors": ["Author 1", "Author 2"],
        "year": 2024,
        "abstract": "Paper abstract...",
        "citationCount": 100,
        "venue": "Conference Name",
        "url": "https://...",
        "doi": "10.xxx/xxx"
      }
    ],
    "count": 20
  }
}
```

---

### **3. Build Knowledge Graph**

#### `POST /api/build-knowledge-graph`
Build a knowledge graph from papers

**Request Body**:
```json
{
  "papers": [...], // Array of papers from search-papers
  "topic": "machine learning"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "graphData": {
      "papers": [...],
      "nodes": [...],
      "links": [...]
    },
    "relationships": [
      {
        "source": "paper1",
        "target": "paper2",
        "type": "CITES",
        "weight": 0.8
      }
    ]
  }
}
```

---

### **4. Generate Insights**

#### `POST /api/generate-insights`
Generate AI insights from papers

**Request Body**:
```json
{
  "papers": [...],
  "relationships": [...],
  "topic": "machine learning"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "insights": {
      "summary": "AI-generated summary...",
      "keyFindings": ["Finding 1", "Finding 2"],
      "trends": ["Trend 1", "Trend 2"],
      "gaps": ["Gap 1", "Gap 2"]
    }
  }
}
```

---

### **5. Chat**

#### `POST /api/chat`
Chat with AI about research

**Request Body**:
```json
{
  "question": "What is machine learning?",
  "mode": "simple", // or "advanced", "investigation"
  "conversationId": "conv_123",
  "topic": "machine learning"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "answer": "Machine learning is...",
    "sources": [
      {
        "paperId": "paper123",
        "title": "Paper Title",
        "relevance": 0.95
      }
    ],
    "confidence": 85,
    "suggestedQuestions": [
      "What are the types of ML?",
      "How does deep learning differ?"
    ]
  }
}
```

---

### **6. Start Conversation**

#### `POST /api/conversations/start`
Initialize a conversation

**Request Body**:
```json
{
  "topic": "machine learning",
  "userId": "user_123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_abc123",
    "topic": "machine learning"
  }
}
```

---

### **7. Research Investigation**

#### `POST /api/research/investigate`
Multi-step research investigation

**Request Body**:
```json
{
  "question": "How has transformers architecture evolved?",
  "conversationId": "conv_123",
  "topic": "transformers"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "investigation": {
      "synthesis": "Overall summary...",
      "steps": [
        {
          "question": "Step 1 question",
          "answer": "Step 1 answer",
          "confidence": 90,
          "sources": [...]
        }
      ],
      "totalConfidence": 88
    }
  }
}
```

---

### **8. Generate Research Report**

#### `POST /api/research/generate-report`
Generate comprehensive research report

**Request Body**:
```json
{
  "conversationId": "conv_123",
  "topic": "machine learning"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "report": {
      "title": "Research Report on Machine Learning",
      "sections": [
        {
          "heading": "Introduction",
          "content": "..."
        }
      ],
      "references": [...]
    }
  }
}
```

---

### **9. Generate Research Paper**

#### `POST /api/generate-research-paper`
Generate a full research paper

**Request Body**:
```json
{
  "userRequest": "Write a paper on neural networks",
  "conversationId": "conv_123",
  "existingContent": null
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paper": {
      "title": "Neural Networks: A Comprehensive Study",
      "abstract": "...",
      "introduction": "...",
      "methodology": "...",
      "results": "...",
      "discussion": "...",
      "conclusion": "...",
      "references": [...]
    }
  }
}
```

---

### **10. Download Papers**

#### `POST /api/download-papers`
Bulk download papers

**Request Body**:
```json
{
  "papers": [
    {
      "id": "paper123",
      "title": "Paper Title",
      "url": "https://..."
    }
  ],
  "topic": "machine learning"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "totalPapers": 10
  }
}
```

---

### **11. Download Progress**

#### `GET /api/download-progress/:sessionId`
Check download progress

**Response**:
```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "paperId": "paper123",
        "status": "completed",
        "filePath": "/downloads/paper123.pdf"
      }
    ],
    "completed": 8,
    "total": 10
  }
}
```

---

### **12. Download Status**

#### `GET /api/download-status/:topic`
Check download status for a topic

**Response**:
```json
{
  "success": true,
  "data": {
    "downloadedCount": 15,
    "totalPapers": 20,
    "downloadedPapers": ["paper1", "paper2"]
  }
}
```

---

### **13. Paper Content**

#### `GET /api/paper-content/:paperId`
Get full paper content

**Response**:
```json
{
  "success": true,
  "data": {
    "paperId": "paper123",
    "title": "Paper Title",
    "content": "Full paper content...",
    "downloadUrl": "/downloads/paper123.pdf",
    "downloaded": true
  }
}
```

---

### **14. Paper Download**

#### `GET /api/download/paper/:paperId`
Download a specific paper PDF

**Response**: PDF file stream

---

### **15. Database Stats**

#### `GET /api/database-stats`
Get Neo4j database statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "paperCount": 150,
    "relationshipCount": 450,
    "authorCount": 300
  }
}
```

---

### **16. Initialize Embeddings**

#### `POST /api/initialize-embeddings`
Initialize embeddings for chat

**Request Body**:
```json
{
  "batchSize": 20
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "embeddingsCount": 150
  }
}
```

---

## 🔐 **Authentication**

Currently, no authentication is required. All endpoints are open.

---

## 🌐 **CORS**

CORS is enabled for all origins. Frontend can connect from any domain.

---

## ⚠️ **Error Responses**

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "message": "Detailed error description"
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## 📊 **Rate Limiting**

Currently no rate limiting is implemented.

---

## 🔄 **WebSocket Endpoints**

None currently. All communication is via REST API.

---

## 📝 **Notes for Lovable Prompt**

If recreating frontend on Lovable, ensure:
1. All API calls use the base URL: `https://researchreasoner-backend-production.up.railway.app/api`
2. Handle loading states for all API calls
3. Show errors gracefully
4. Display demo data when API is unavailable
5. Use the exact response structures documented above

