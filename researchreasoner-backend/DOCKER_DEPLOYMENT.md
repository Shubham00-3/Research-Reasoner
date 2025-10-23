# ResearchReasoner Backend - Docker Deployment

## ðŸ“¦ Docker Hub Repository
- **Repository**: shubhamgangwar/researchreasoner-backend
- **Tags**: latest, 1.0.0

---

## ðŸš€ Quick Start

### 1. Start Docker Desktop
Make sure Docker Desktop is running before proceeding.

### 2. Build the Image
```powershell
cd researchreasoner-backend
docker build -t shubhamgangwar/researchreasoner-backend:latest .
```

### 3. Login to Docker Hub
```powershell
docker login
```

### 4. Push to Docker Hub
```powershell
docker push shubhamgangwar/researchreasoner-backend:latest
```

---

## ðŸ³ Running the Container

### Pull and Run
```bash
docker run -d --name researchreasoner-backend -p 3002:3002 -e NEO4J_URI=bolt://host:7687 -e NEO4J_USERNAME=neo4j -e NEO4J_PASSWORD=password -e GROQ_API_KEY=your_key shubhamgangwar/researchreasoner-backend:latest
```

---

## âœ… Verify
```bash
docker ps
docker logs researchreasoner-backend
curl http://localhost:3002/health
```
