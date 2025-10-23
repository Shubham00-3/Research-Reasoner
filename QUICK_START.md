# ⚡ ResearchReasoner Quick Start

Get your research platform running in under 5 minutes!

## 🎯 Fastest Path to Deployment

### 1️⃣ Setup Neo4j Database (2 minutes)

**Option A: Neo4j Aura (Cloud - Recommended)**
```bash
# 1. Go to https://neo4j.com/cloud/aura/
# 2. Sign up (free tier available)
# 3. Click "New Instance" → Select Free tier
# 4. Save credentials shown (you'll need these!)
```

**Option B: Local Neo4j Desktop**
```bash
# 1. Download from https://neo4j.com/download/
# 2. Install and open Neo4j Desktop
# 3. Create new database
# 4. Start the database
# 5. Note the bolt URL (usually bolt://localhost:7687)
```

### 2️⃣ Get Groq API Key (1 minute)

```bash
# 1. Visit https://console.groq.com/
# 2. Sign up (free)
# 3. Go to API Keys section
# 4. Create new key
# 5. Copy your API key (starts with gsk_...)
```

### 3️⃣ Setup Backend (1 minute)

```bash
# Clone and navigate
cd researchreasoner-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your credentials:
nano .env
# NEO4J_URI=bolt://your-neo4j-uri:7687
# NEO4J_USERNAME=neo4j
# NEO4J_PASSWORD=your_password
# GROQ_API_KEY=gsk_your_key_here

# Start backend
npm run dev
```

**✅ Backend should now be running on http://localhost:3002**

### 4️⃣ Setup Frontend (1 minute)

```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env (default values work for local)
nano .env
# VITE_API_BASE_URL=http://localhost:3002/api

# Start frontend
npm run dev
```

**✅ Frontend should now be running on http://localhost:5173**

---

## 🎉 Test Your Setup

1. **Open browser**: http://localhost:5173
2. **Search for**: "machine learning"
3. **Wait 30-60 seconds** for paper discovery
4. **Explore**:
   - Knowledge Map tab (interactive graph)
   - Research Assistant tab (ask questions)
   - Generate Paper tab (create research papers)

---

## 🚀 Deploy to Production (5 minutes)

### Easiest Path: Vercel + Railway

**Deploy Backend:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd researchreasoner-backend
railway init
railway up

# Add environment variables in Railway dashboard:
# NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, GROQ_API_KEY
```

**Deploy Frontend:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend

# Create production config
echo "VITE_API_BASE_URL=https://your-railway-backend.railway.app/api" > .env.production

# Deploy
vercel --prod
```

**Done! Your app is live! 🎊**

---

## 🆘 Quick Troubleshooting

**Backend won't start?**
```bash
# Check Neo4j is running
# Verify credentials in .env
# Check port 3002 is not in use
```

**Frontend can't connect?**
```bash
# Verify backend is running on port 3002
# Check VITE_API_BASE_URL in .env
# Clear browser cache (Ctrl+Shift+R)
```

**No papers showing?**
```bash
# Wait 30-60 seconds for paper discovery
# Check browser console for errors (F12)
# Verify Groq API key is valid
```

---

## 📚 Next Steps

- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide
- Check [README.md](./README.md) for full documentation
- Explore the code structure

---

**Need help?** Check the [Troubleshooting](#-quick-troubleshooting) section or deployment guide.

