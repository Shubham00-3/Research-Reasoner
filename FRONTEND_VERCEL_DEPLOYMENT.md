# 🚀 Deploy Frontend to Vercel

## ✅ Prerequisites
- GitHub account
- Vercel account (free) - https://vercel.com

---

## 📋 **Step-by-Step Deployment**

### **Step 1: Prepare Frontend for Deployment**

1. **Make sure .env is in .gitignore**:
```bash
# frontend/.gitignore should have:
.env
.env.local
```

2. **Create environment variable for production**:
   - We'll set this in Vercel dashboard (not committed to git)

---

### **Step 2: Push to GitHub**

```bash
# From project root
git add .
git commit -m "Frontend configured for Railway backend deployment"
git push origin main
```

---

### **Step 3: Deploy on Vercel**

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with GitHub
3. **Click "Add New Project"**
4. **Import** your `ResearchReasoner` repository
5. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add variable:
     - **Name**: `VITE_API_BASE_URL`
     - **Value**: `https://researchreasoner-backend-production.up.railway.app/api`
   - Select all environments (Production, Preview, Development)

7. **Click "Deploy"**

8. **Wait 2-3 minutes** for deployment

---

### **Step 4: Test Your Deployment**

Once deployed, Vercel will give you a URL like:
```
https://research-reasoner-xxxx.vercel.app
```

1. **Visit the URL**
2. **Test a search query**
3. **Check browser console** for any errors
4. **Test chat feature**

---

## 🎯 **Expected Result**

- ✅ Frontend deployed and accessible globally
- ✅ Connects to Railway backend automatically
- ✅ SSL certificate (https) included
- ✅ CDN distribution worldwide
- ✅ Auto-deploy on git push

---

## 🔧 **Troubleshooting**

### Build fails:
- Check Vercel build logs
- Ensure `frontend/package.json` has all dependencies
- Verify root directory is set to `frontend`

### API connection fails:
- Verify environment variable is set correctly
- Check Railway backend is running
- Test backend URL directly

### CORS errors:
- Backend already configured for CORS
- Should work automatically

---

## 📝 **Custom Domain (Optional)**

After deployment, you can add a custom domain:
1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS instructions

---

## 🔄 **Auto-Deploy on Git Push**

Every time you push to GitHub:
- Vercel automatically builds and deploys
- No manual steps needed
- Preview deployments for PRs

---

## 💰 **Cost**

- **Free tier includes**:
  - Unlimited personal projects
  - 100GB bandwidth/month
  - SSL certificates
  - Global CDN
  - Automatic deployments

---

## 🆘 **Support**

If issues arise:
1. Check Vercel build logs
2. Verify environment variables
3. Test backend connection
4. Check browser console for errors

