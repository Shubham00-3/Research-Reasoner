# 🚀 ResearchReasoner Deployment Guide

## Table of Contents
1. [Quick Deploy (Recommended)](#quick-deploy-recommended)
2. [Manual Deployment](#manual-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Environment Variables](#environment-variables)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Deploy (Recommended)

### Option A: Vercel (Frontend) + Railway (Backend + Neo4j)

**Best for**: Production deployment with minimal setup

#### 1. Deploy Neo4j Database

**Using Neo4j Aura (Cloud):**
```bash
# 1. Create account at https://neo4j.com/cloud/aura/
# 2. Create a new database instance (Free tier available)
# 3. Save your connection URI and credentials
```

**Using Railway:**
```bash
# 1. Go to https://railway.app
# 2. New Project → Deploy Neo4j
# 3. Note the connection details
```

#### 2. Deploy Backend to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Navigate to backend directory
cd researchreasoner-backend

# Initialize and deploy
railway init
railway up

# Set environment variables in Railway dashboard:
# - NEO4J_URI
# - NEO4J_USERNAME
# - NEO4J_PASSWORD
# - GROQ_API_KEY
# - PORT=3002
```

#### 3. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Create .env.production
echo "VITE_API_BASE_URL=https://your-backend.railway.app/api" > .env.production

# Deploy
vercel --prod

# Vercel will automatically detect Vite and configure build settings
```

---

## 🛠️ Manual Deployment

### Option B: AWS / DigitalOcean / VPS

#### Prerequisites
- Ubuntu 22.04 server with root access
- Domain name (optional but recommended)
- SSH access to server

#### Step 1: Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

#### Step 2: Install Neo4j

```bash
# Add Neo4j repository
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update

# Install Neo4j
sudo apt install -y neo4j

# Configure Neo4j
sudo nano /etc/neo4j/neo4j.conf

# Uncomment and set:
# dbms.default_listen_address=0.0.0.0
# dbms.connector.bolt.listen_address=:7687
# dbms.connector.http.listen_address=:7474

# Start Neo4j
sudo systemctl start neo4j
sudo systemctl enable neo4j

# Set initial password
cypher-shell -u neo4j -p neo4j
# Then run: ALTER USER neo4j SET PASSWORD 'your_secure_password';
```

#### Step 3: Deploy Backend

```bash
# Clone your repository
cd /var/www
sudo git clone https://github.com/your-username/ResearchReasoner.git
cd ResearchReasoner/researchreasoner-backend

# Install dependencies
sudo npm install

# Create .env file
sudo nano .env
# Copy contents from .env.example and fill in values

# Build TypeScript
sudo npm run build

# Start with PM2
sudo pm2 start dist/index.js --name researchreasoner-backend
sudo pm2 save
sudo pm2 startup
```

#### Step 4: Deploy Frontend

```bash
# Navigate to frontend
cd /var/www/ResearchReasoner/frontend

# Install dependencies
sudo npm install

# Create production environment file
sudo nano .env.production
# Add: VITE_API_BASE_URL=https://api.yourdomain.com/api

# Build frontend
sudo npm run build

# The dist folder contains your static files
```

#### Step 5: Configure Nginx

```bash
# Create backend config
sudo nano /etc/nginx/sites-available/researchreasoner-backend

# Add:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Create frontend config
sudo nano /etc/nginx/sites-available/researchreasoner-frontend

# Add:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/ResearchReasoner/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3002/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable sites
sudo ln -s /etc/nginx/sites-available/researchreasoner-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/researchreasoner-frontend /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Certbot will automatically configure Nginx for HTTPS
```

---

## 🐳 Docker Deployment

### Option C: Docker Compose

#### Create Docker files:

**Backend Dockerfile:**
```dockerfile
# researchreasoner-backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3002

CMD ["node", "dist/index.js"]
```

**Frontend Dockerfile:**
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx.conf:**
```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3002/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15.0
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/your_password_here
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs

  backend:
    build: ./researchreasoner-backend
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=your_password_here
      - GROQ_API_KEY=${GROQ_API_KEY}
    depends_on:
      - neo4j
    volumes:
      - ./researchreasoner-backend/downloads:/app/downloads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  neo4j_data:
  neo4j_logs:
```

**Deploy with Docker Compose:**
```bash
# Create .env file in project root
echo "GROQ_API_KEY=your_key_here" > .env

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 🔐 Environment Variables

### Required Variables

#### Backend (.env)
```bash
# REQUIRED
NEO4J_URI=bolt://your-neo4j-host:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
GROQ_API_KEY=gsk_xxxxxxxxxxxx

# OPTIONAL
PORT=3002
NODE_ENV=production
OPENAI_API_KEY=sk-xxxx (if using OpenAI instead of Groq)
```

#### Frontend (.env.production)
```bash
VITE_API_BASE_URL=https://your-backend-url.com/api
```

### Getting API Keys

1. **Groq API Key** (Required for LLM features):
   - Sign up at https://console.groq.com
   - Create new API key
   - Free tier available

2. **Neo4j Aura** (Cloud database):
   - Sign up at https://neo4j.com/cloud/aura/
   - Create free instance
   - Get connection URI and credentials

---

## ✅ Post-Deployment

### 1. Health Checks

```bash
# Check backend health
curl https://your-backend-url.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-XX-XX...",
  "port": 3002
}

# Check API endpoint
curl https://your-backend-url.com/api/health
```

### 2. Test Database Connection

```bash
# SSH into server
ssh user@your-server

# Check Neo4j status
sudo systemctl status neo4j

# Test connection
cypher-shell -u neo4j -p your_password
# Run: MATCH (n) RETURN count(n);
```

### 3. Initialize Database (First time only)

```bash
# Visit your backend URL
curl -X POST https://your-backend-url.com/api/initialize-embeddings \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20}'
```

### 4. Test Frontend

```bash
# Visit your frontend URL
# Try searching for "machine learning"
# Check browser console for errors
```

### 5. Setup Monitoring (Recommended)

**Using PM2 Dashboard:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Using Sentry (Error Tracking):**
```bash
# Install in backend
npm install @sentry/node

# Add to index.ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: "your-sentry-dsn" });
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Backend won't start:**
```bash
# Check logs
pm2 logs researchreasoner-backend

# Common issues:
# - Wrong Neo4j credentials → Update .env
# - Port already in use → Change PORT in .env
# - Missing dependencies → Run npm install
```

**2. Frontend can't connect to backend:**
```bash
# Check CORS settings in backend
# Update frontend .env.production with correct backend URL
# Clear browser cache
```

**3. Neo4j connection fails:**
```bash
# Check Neo4j is running
sudo systemctl status neo4j

# Check firewall
sudo ufw allow 7687
sudo ufw allow 7474

# Verify credentials in .env
```

**4. Out of memory errors:**
```bash
# Increase Node.js memory
pm2 delete researchreasoner-backend
pm2 start dist/index.js --name researchreasoner-backend --node-args="--max-old-space-size=4096"
```

**5. SSL certificate issues:**
```bash
# Renew certificates
sudo certbot renew

# Check expiry
sudo certbot certificates
```

---

## 🚀 Deployment Comparison

| Platform | Cost | Setup Time | Scalability | Best For |
|----------|------|------------|-------------|----------|
| **Vercel + Railway** | $5-20/mo | 10 min | High | Quick production |
| **AWS/DigitalOcean** | $10-50/mo | 1-2 hours | Very High | Full control |
| **Docker Compose** | VPS cost | 30 min | Medium | Consistency |
| **Heroku** | $7-25/mo | 20 min | Medium | Simplicity |

---

## 📊 Recommended Setup

**For Development:**
- Local Neo4j Desktop
- Backend: `npm run dev`
- Frontend: `npm run dev`

**For Production (Budget):**
- Frontend: Vercel (Free tier)
- Backend: Railway ($5/mo)
- Database: Neo4j Aura Free

**For Production (Professional):**
- Frontend: Vercel/Netlify ($20/mo)
- Backend: AWS EC2/DigitalOcean ($20/mo)
- Database: Neo4j Aura Pro ($65/mo)
- CDN: Cloudflare (Free)

---

## 🔄 Continuous Deployment

### GitHub Actions (Automated)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd researchreasoner-backend && npm install
      - run: cd researchreasoner-backend && npm run build
      # Add deployment steps for your platform

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 📞 Support

If you encounter issues:
1. Check logs: `pm2 logs` or platform dashboard
2. Verify environment variables
3. Test each service independently
4. Check firewall/security group settings
5. Review Neo4j connection string format

---

**Deployment complete! 🎉**

Your ResearchReasoner should now be live and accessible!

