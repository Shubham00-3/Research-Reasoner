# Frontend Configuration for Railway Backend

## ✅ Completed Configuration

### 1. **Environment Variables**
Created `frontend/.env` with:
```
VITE_API_BASE_URL=https://researchreasoner-backend-production.up.railway.app/api
```

### 2. **API Configuration Module**
Created `frontend/src/config/api.ts` - Centralized API endpoint management

### 3. **Updated Files**
All hardcoded `localhost:3002` URLs have been replaced:
- ✅ `frontend/src/pages/Index.tsx`
- ✅ `frontend/src/components/ResearchChat.tsx`
- ✅ `frontend/src/components/EnhancedResearchChat.tsx`
- ✅ `frontend/src/components/ResearchPaperGenerator.tsx`
- ✅ `frontend/src/components/tabs/KnowledgeMapTab.tsx`
- ✅ `frontend/src/components/tabs/ChatTab.tsx`
- ✅ `frontend/src/components/BulkDownloadManager.tsx`

---

## 🚀 How to Run Frontend

### Option 1: Development Mode (Local)
```bash
cd frontend
npm install
npm run dev
```
Frontend will run on: `http://localhost:8080`

### Option 2: Production Build
```bash
cd frontend
npm install
npm run build
npm run preview
```

---

## 🌐 Testing the Connection

Once frontend is running:

1. **Open browser**: `http://localhost:8080`
2. **Check browser console** for any connection errors
3. **Try a simple search** to test backend connectivity
4. **Expected**: Frontend will connect to Railway backend automatically

---

## 🔧 Environment Variables

### Development (.env)
```bash
VITE_API_BASE_URL=https://researchreasoner-backend-production.up.railway.app/api
```

### Local Backend (.env.local) - Create this if testing locally
```bash
VITE_API_BASE_URL=http://localhost:3002/api
```

---

## 📊 Backend URL

**Production Backend**: `https://researchreasoner-backend-production.up.railway.app`

**Backend Endpoints**:
- Health: `/health`
- API Health: `/api/health`
- Search Papers: `/api/search-papers`
- Chat: `/api/chat`
- And more... (see `frontend/src/config/api.ts`)

---

## ⚠️ DNS Note

If you can't access the Railway URL:
1. **Wait 5-10 minutes** for DNS propagation
2. **Change DNS** to Google DNS (8.8.8.8, 8.8.4.4)
3. **Try mobile hotspot** for different DNS
4. **Check Railway Dashboard** - ensure service is "ACTIVE"

---

## 🎯 Next Steps

1. ✅ Backend deployed and running on Railway
2. ✅ Neo4j Aura connected successfully
3. ✅ Frontend configured to use Railway backend
4. 🔄 **Now**: Run frontend and test the connection
5. 🚀 **Then**: Deploy frontend to Vercel/Netlify (optional)

---

## 📝 Important Files

- `frontend/.env` - Environment variables
- `frontend/src/config/api.ts` - API configuration
- `DEPLOYMENT.md` - Full deployment guide
- `QUICK_START.md` - Quick start guide

---

## 🆘 Troubleshooting

### Frontend can't connect to backend:
1. Check browser console for errors
2. Verify `.env` file exists with correct URL
3. Restart frontend dev server
4. Test backend directly: `https://researchreasoner-backend-production.up.railway.app/health`

### CORS errors:
- Backend already configured for CORS
- Should work out of the box

### API errors:
- Check Railway logs for backend errors
- Verify Neo4j Aura is connected
- Check environment variables in Railway

---

## 📞 Support

If issues persist:
1. Check Railway deployment logs
2. Test backend health endpoint
3. Verify all environment variables are set
4. Check browser network tab for failed requests

