# Quick Start

## Prerequisites

- Node.js 18+
- A running Neo4j database
- A Groq API key

## Backend

```bash
cd researchreasoner-backend
npm install
copy .env.example .env
npm run dev
```

Edit `.env` before starting the backend:

- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `GROQ_API_KEY`

The backend runs at:

```text
http://localhost:3002/api/health
```

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev -- --host 127.0.0.1
```

The frontend runs at:

```text
http://127.0.0.1:8080/
```

## Trust Modes

Production mode is the default. It returns only real provider records from arXiv and Semantic Scholar.

Demo records are only enabled when both are intentionally set:

```text
DEMO_MODE=true
VITE_DEMO_MODE=true
```

Do not enable demo mode for real research workflows.
