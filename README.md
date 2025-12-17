# 🧠 ResearchReasoner

**AI-Powered Research Discovery Platform**

An advanced research paper discovery and analysis tool that combines knowledge graph visualization, intelligent Q&A, and automated paper management using Neo4j and Large Language Models.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![Neo4j](https://img.shields.io/badge/Neo4j-5.x-008CC1.svg)

---

## ✨ Features

- 🔍 **Multi-Source Paper Discovery** - Search across Semantic Scholar & arXiv (100-700 papers)
- 🕸️ **Interactive Knowledge Graph** - Visualize research connections like Connected Papers
- 💬 **AI Research Assistant** - Chat with your papers using advanced RAG (Retrieval Augmented Generation)
- 🤖 **Multi-Step Reasoning** - Complex research investigations with step-by-step analysis
- 📄 **Automated PDF Downloads** - Bulk paper acquisition with local storage
- 📊 **Research Analytics** - Citation networks, author collaboration, trend analysis
- 🎓 **Auto-Generate Research Papers** - Create literature reviews from your database
- 💾 **Neo4j Graph Database** - Persistent storage with vector embeddings

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Frontend - React + Vite + TypeScript"]
        UI["🔍 Search Interface"]
        Chat["💬 Research Chat"]
        Graph["🕸️ Knowledge Graph<br/>(D3.js Visualization)"]
        Download["📥 Download Manager"]
        Generator["📝 Paper Generator"]
    end

    subgraph Backend["⚙️ Backend - Node.js + Express + TypeScript"]
        API["🔌 REST API Routes"]
        subgraph Services["Core Services"]
            PS["📚 Paper Search Service"]
            RAG["🧠 Graph RAG Service"]
            ARAG["🔬 Advanced RAG Service"]
            DL["⬇️ Download Service"]
            N4J["💾 Neo4j Service"]
            GS["🤖 Groq Service"]
        end
    end

    subgraph External["🌐 External APIs"]
        SS["📖 Semantic Scholar API"]
        AX["📄 arXiv API"]
        GQ["⚡ Groq LLM API<br/>(Llama 3)"]
    end

    subgraph Database["💾 Neo4j Graph Database"]
        Papers[("📑 Papers<br/>+ Embeddings")]
        Authors[("👤 Authors")]
        Topics[("🏷️ Topics")]
        Relations[("🔗 Relationships")]
    end

    Client <--> API
    API --> PS
    API --> RAG
    API --> ARAG
    API --> DL
    PS --> SS
    PS --> AX
    RAG --> GS --> GQ
    ARAG --> GS
    PS --> N4J
    RAG --> N4J
    ARAG --> N4J
    DL --> N4J
    N4J <--> Database
```

---

## 🔄 Data Flow Pipelines

### Paper Discovery Pipeline

```mermaid
flowchart LR
    subgraph Input
        Q[/"🔍 Search Query"/]
    end

    subgraph Discovery["Paper Discovery"]
        SS["Semantic Scholar<br/>100+ papers"]
        AX["arXiv<br/>500+ papers"]
    end

    subgraph Processing["Data Processing"]
        M["🔀 Merge & Deduplicate"]
        E["🧮 Generate Embeddings<br/>(TF-IDF + Semantic)"]
    end

    subgraph Storage["Neo4j Storage"]
        N4J[("💾 Store Papers<br/>+ Vectors")]
        KG["🕸️ Build Knowledge Graph"]
    end

    subgraph Output
        VIZ[/"📊 Interactive<br/>Visualization"/]
    end

    Q --> SS & AX
    SS --> M
    AX --> M
    M --> E --> N4J --> KG --> VIZ
```

### RAG (Retrieval Augmented Generation) Pipeline

```mermaid
flowchart TB
    subgraph Input
        Q[/"❓ User Question"/]
    end

    subgraph Analysis["Question Analysis"]
        A["🔍 Analyze Question<br/>Extract entities, intent"]
    end

    subgraph Search["Hybrid Search"]
        V["📊 Vector Search<br/>(Semantic similarity)"]
        K["🔤 Keyword Search<br/>(BM25-style)"]
        G["🕸️ Graph Traversal<br/>(Related papers)"]
    end

    subgraph Retrieval["Context Retrieval"]
        C["🔀 Combine & Rank Results"]
        P["📄 Extract Relevant Passages"]
    end

    subgraph Generation["LLM Generation"]
        L["🤖 Groq LLM<br/>(Llama 3.3 70B)"]
    end

    subgraph Output
        ANS[/"✅ Answer + Sources<br/>+ Follow-up Questions"/]
    end

    Q --> A
    A --> V & K & G
    V --> C
    K --> C
    G --> C
    C --> P --> L --> ANS
```

### Multi-Step Research Investigation

```mermaid
flowchart TB
    subgraph Input
        Q[/"🔬 Complex Research Question"/]
    end

    subgraph Planning["Research Planning"]
        P["📋 Decompose into<br/>sub-questions"]
    end

    subgraph Execution["Step-by-Step Execution"]
        S1["Step 1: Foundation"]
        S2["Step 2: Methods"]
        S3["Step 3: Findings"]
        S4["Step N: Analysis"]
    end

    subgraph Synthesis["Result Synthesis"]
        SYN["🔄 Synthesize Findings"]
        CON["📊 Draw Conclusions"]
        GAP["🔍 Identify Gaps"]
    end

    subgraph Output
        R[/"📝 Comprehensive Report<br/>+ All Sources"/]
    end

    Q --> P
    P --> S1 --> S2 --> S3 --> S4
    S4 --> SYN --> CON --> GAP --> R
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Neo4j database (local or cloud)
- Groq API key (free at https://console.groq.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ResearchReasoner.git
cd ResearchReasoner

# Setup Backend
cd researchreasoner-backend
npm install
cp .env.example .env
# Edit .env with your Neo4j and Groq credentials
npm run dev

# Setup Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 and start exploring research!

**📖 For detailed setup, see [QUICK_START.md](./QUICK_START.md)**

---

## 🌐 Deployment

Deploy to production in minutes:

**Quick Deploy:**
- Frontend: Vercel (Free tier)
- Backend: Railway ($5/mo)
- Database: Neo4j Aura (Free tier)

**📖 Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## 📁 Project Structure

```
ResearchReasoner/
├── 📂 frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── SearchInterface.tsx       # Paper search
│   │   │   ├── EnhancedResearchChat.tsx  # AI chat interface
│   │   │   ├── BulkDownloadManager.tsx   # PDF downloads
│   │   │   └── ResearchPaperGenerator.tsx # Auto paper gen
│   │   ├── pages/                 # Main pages
│   │   └── types/                 # TypeScript types
│   └── package.json
│
├── 📂 researchreasoner-backend/    # Node.js backend API
│   ├── src/
│   │   ├── routes/                # API route handlers
│   │   ├── services/              # Core business logic
│   │   │   ├── neo4jService.ts           # Database operations
│   │   │   ├── graphRagService.ts        # RAG pipeline
│   │   │   ├── AdvancedRAGService.ts     # Multi-step reasoning
│   │   │   ├── paperSearchService.ts     # Paper discovery
│   │   │   ├── paperDownloadService.ts   # PDF management
│   │   │   └── groqService.ts            # LLM integration
│   │   └── index.ts               # Express server entry
│   └── package.json
│
├── 📄 README.md                    # This file
├── 📄 QUICK_START.md              # Quick setup guide
├── 📄 DEPLOYMENT.md               # Production deployment
└── 📄 BACKEND_API_DOCUMENTATION.md # API reference
```

---

## 🎯 Usage Examples

### 1. Discover Research Papers

```typescript
// Search for papers on any topic
const results = await searchRealPapers("quantum computing");
// Returns: 100-700 papers with full metadata
```

### 2. Ask Research Questions

```typescript
// Simple mode - Quick answers
"What are the main approaches in machine learning?"

// Advanced mode - Deep analysis
"Compare transformer architectures in NLP"

// Investigation mode - Multi-step reasoning
"Investigate the evolution of deep learning from 2015 to 2024"
```

### 3. Visualize Knowledge Graphs

- Interactive force-directed graph
- Click nodes to view paper details
- Download PDFs with one click
- Explore citation networks

### 4. Generate Research Papers

```typescript
// Auto-generate literature reviews
"Generate a survey paper on neural networks"
"Create a technical report on quantum algorithms"
```

---

## 🔧 Configuration

### Backend Environment Variables

```bash
# Required
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
GROQ_API_KEY=gsk_your_key

# Optional
PORT=3002
NODE_ENV=development
MAX_PAPERS_PER_SEARCH=500
```

### Frontend Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:3002/api
```

See `.env.example` files for complete configuration options.

---

## 📊 Key Features Explained

### Advanced RAG (Retrieval Augmented Generation)

```mermaid
flowchart LR
    subgraph Features["RAG Features"]
        HS["🔀 Hybrid Search<br/>Semantic + Keyword + Graph"]
        MS["🔄 Multi-Step<br/>Complex reasoning"]
        SA["📚 Source Attribution<br/>Paper citations"]
        CM["💭 Conversation Memory<br/>Context awareness"]
    end
```

- **Hybrid Search**: Combines semantic, keyword, and graph-based search
- **Multi-Step Reasoning**: Breaks complex questions into research steps
- **Source Attribution**: Every answer includes paper citations
- **Conversation Memory**: Maintains context across chat sessions

### Knowledge Graph

- **Citation Networks**: Map paper-to-paper references
- **Author Collaboration**: Identify research communities
- **Content Similarity**: Find related papers by topic
- **Temporal Analysis**: Track research evolution over time

### Paper Management

- **Automatic Downloads**: PDF acquisition from multiple sources
- **Local Storage**: Papers stored in Neo4j database
- **Full-Text Search**: Query within paper content
- **Batch Operations**: Download hundreds of papers at once

---

## 🧪 API Documentation

### Main Endpoints

```mermaid
flowchart LR
    subgraph Endpoints["API Endpoints"]
        SP["POST /api/search-papers"]
        BK["POST /api/build-knowledge-graph"]
        CH["POST /api/chat"]
        CA["POST /api/chat-advanced"]
        DL["POST /api/download-papers"]
    end
```

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search-papers` | POST | Search for papers on a topic |
| `/api/build-knowledge-graph` | POST | Build and store knowledge graph |
| `/api/chat` | POST | Simple RAG Q&A |
| `/api/chat-advanced` | POST | Multi-step investigation |
| `/api/download-papers` | POST | Bulk PDF download |

**📖 Full API docs: [BACKEND_API_DOCUMENTATION.md](./BACKEND_API_DOCUMENTATION.md)**

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, D3.js |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Neo4j (Graph + Vector Search) |
| **LLM** | Groq (Llama 3.3 70B) |
| **APIs** | Semantic Scholar, arXiv |

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for research enthusiasts and academics
- Powered by Neo4j, Groq, and amazing open-source tools
- Inspired by Connected Papers and research discovery tools

---

## 📞 Support

- 📖 **Documentation**: See [DEPLOYMENT.md](./DEPLOYMENT.md) and [QUICK_START.md](./QUICK_START.md)
- 🐛 **Issues**: Open an issue on GitHub
- 💬 **Discussions**: Use GitHub Discussions

---

**Made with ❤️ for the research community**
