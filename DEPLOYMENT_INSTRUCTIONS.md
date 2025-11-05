# 🚀 DEPLOYMENT INSTRUCTIONS FOR AWS

**Domain:** https://api.neurolov.ai/api/v1  
**Status:** ✅ All fixes applied - Ready to deploy  
**Date:** Nov 3, 2025

---

## ✅ FIXES APPLIED (JUST NOW)

### **1. CORS Configuration Fixed** ✅
- ❌ Removed hardcoded `localhost:3000`
- ❌ Removed placeholder `your-vercel-app.vercel.app`
- ✅ All origins now from environment variables
- ✅ Logs enabled origins on startup

**Files Changed:**
- `src/config/constants.ts` - Added `ADDITIONAL_CORS_ORIGINS`
- `src/app.ts` - Removed hardcoded origins, added logging

### **2. Request Body Limit Made Configurable** ✅
- ❌ Removed hardcoded `10mb`
- ✅ Now uses `REQUEST_BODY_LIMIT` from .env
- Default: `10mb` (if not set)

**Files Changed:**
- `src/config/constants.ts` - Added `REQUEST_BODY_LIMIT`
- `src/app.ts` - Uses config variable

### **3. API URLs Fixed** ✅
- ❌ Removed hardcoded `localhost` in startup logs
- ✅ Shows production URL in production mode
- Shows: `https://api.neurolov.ai/api/v1`

**Files Changed:**
- `src/server.ts` - Dynamic URL based on environment

### **4. Build Verified** ✅
- ✅ TypeScript compiles successfully
- ✅ No errors
- ✅ dist/ folder generated

---

## 📋 WHAT YOU NEED TO DO NOW

### **STEP 1: Update Your Frontend URLs**

**I need you to tell me:**

1. What is your main NeuroSwarm frontend URL?
   - Example: `https://swarm.neurolov.ai`
   - Or: `https://app.neurolov.ai`
   - Or: Something else?

2. What is your Compute App frontend URL?
   - Example: `https://compute.neurolov.ai`
   - Or: Different domain?

3. Any other domains that need API access?
   - Example: Admin panel, staging sites, etc.

**Once you tell me, I'll give you the exact .env configuration.**

---

### **STEP 2: Update AWS .env File**

SSH to your AWS instance:
```bash
ssh -i your-key.pem ubuntu@your-aws-ip
cd /path/to/neuroswarm-backend
nano .env
```

**Add/Update these lines:**
```env
# CORS Configuration - REPLACE WITH YOUR ACTUAL URLS
FRONTEND_URL=http://localhost:3000
FRONTEND_PROD_URL=https://YOUR-SWARM-FRONTEND.neurolov.ai
ADDITIONAL_CORS_ORIGINS=https://YOUR-COMPUTE-APP.neurolov.ai,https://ANY-OTHER-DOMAIN.com

# Request Body Limit (optional, already has default)
REQUEST_BODY_LIMIT=10mb

# Make sure these are present (from before):
NODE_ENV=production
PORT=3001
COMPUTE_SUPABASE_URL=https://oiqqfyhdvdrsymxtuoyr.supabase.co
COMPUTE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXFmeWhkdmRyc3lteHR1b3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxODE5OTEsImV4cCI6MjA0Mjc1Nzk5MX0.qK3KcbJ5ulsFHbJGi6UHPGTnW4-zzGNEBIiVJUlH4nI
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### **STEP 3: Deploy to AWS**

```bash
# Still in SSH session on AWS:

# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Build
npm run build

# 4. Restart PM2
pm2 restart ecosystem.config.js --env production

# Or if not using ecosystem.config.js:
pm2 restart neuroswarm-backend

# 5. Save PM2 config
pm2 save

# 6. View logs to verify
pm2 logs neuroswarm-backend --lines 50
```

---

### **STEP 4: Verify Deployment**

#### **4.1 Check Startup Logs**

```bash
pm2 logs neuroswarm-backend --lines 50
```

**Look for:**
```
✅ 🚀 Server running on port 3001 in production mode
✅ 📊 API Base URL: https://api.neurolov.ai/api/v1
✅ 🏥 Health Check: https://api.neurolov.ai/health
✅ 🔒 CORS enabled for origins: https://swarm.neurolov.ai, https://compute.neurolov.ai
✅ 🕐 Cron jobs started (uptime reset + plan sync)
✅ ✅ Plan sync cron job started (every 5 minutes)
```

#### **4.2 Test Health Endpoint**

```bash
curl https://api.neurolov.ai/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T10:05:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

#### **4.3 Test CORS from Browser**

Open browser console on your frontend (e.g., `https://swarm.neurolov.ai`):

```javascript
fetch('https://api.neurolov.ai/health', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(d => console.log('✅ CORS working:', d))
  .catch(e => console.error('❌ CORS failed:', e));
```

**Expected:** No CORS errors, should see health response

#### **4.4 Test API from Frontend**

Try logging in from your frontend:
- Should NOT see CORS errors
- Should be able to make API requests
- Check browser console for errors

---

## 🎯 QUICK REFERENCE

### **What Changed:**

| File | Change | Why |
|------|--------|-----|
| `src/config/constants.ts` | Added `ADDITIONAL_CORS_ORIGINS` and `REQUEST_BODY_LIMIT` | Support multiple frontend domains from .env |
| `src/app.ts` | Removed hardcoded CORS origins | Production security, flexibility |
| `src/server.ts` | Dynamic API URL in logs | Shows correct production URL |
| `.env.production.template` | Created template | Guide for AWS .env setup |

### **Environment Variables Added:**

```env
# New variables (required):
ADDITIONAL_CORS_ORIGINS=https://compute.neurolov.ai

# New variables (optional):
REQUEST_BODY_LIMIT=10mb

# Must already exist:
FRONTEND_PROD_URL=https://swarm.neurolov.ai
NODE_ENV=production
```

---

## 🚨 TROUBLESHOOTING

### **Issue: CORS errors from frontend**

**Symptoms:**
```
Access to fetch at 'https://api.neurolov.ai/api/v1/auth/login' from origin 'https://swarm.neurolov.ai' has been blocked by CORS policy
```

**Fix:**
1. Check AWS .env has correct `FRONTEND_PROD_URL`
2. Check `ADDITIONAL_CORS_ORIGINS` includes your domain
3. Restart PM2: `pm2 restart neuroswarm-backend`
4. Check logs: `pm2 logs neuroswarm-backend | grep CORS`

Should see:
```
🔒 CORS enabled for origins: http://localhost:3000, https://swarm.neurolov.ai, https://compute.neurolov.ai
```

### **Issue: Build fails**

```bash
# Check for TypeScript errors
npm run build

# If errors, check recent changes
git diff
```

### **Issue: PM2 won't restart**

```bash
# Check PM2 status
pm2 list

# If stuck, delete and restart
pm2 delete neuroswarm-backend
pm2 start ecosystem.config.js --env production

# If still issues, check logs
pm2 logs neuroswarm-backend --err --lines 100
```

---

## 📊 DEPLOYMENT CHECKLIST

### **Pre-Deployment:**
- [x] ✅ CORS hardcoded values removed
- [x] ✅ Request body limit made configurable
- [x] ✅ API URLs use production domain
- [x] ✅ Build succeeds
- [x] ✅ Code committed to git
- [ ] Tell me your frontend URLs
- [ ] Update AWS .env with frontend URLs
- [ ] Push to git if needed

### **Deployment:**
- [ ] SSH to AWS
- [ ] Pull latest code
- [ ] Update .env file
- [ ] Build: `npm run build`
- [ ] Restart PM2
- [ ] Check logs

### **Verification:**
- [ ] Health endpoint returns 200
- [ ] Logs show correct CORS origins
- [ ] No CORS errors from frontend
- [ ] Login works from frontend
- [ ] Plan sync working (check logs after 5 min)

---

## 📞 NEXT STEP: TELL ME YOUR FRONTEND URLs

**Reply with:**

1. **Main NeuroSwarm Frontend URL:** `https://___________.neurolov.ai`
2. **Compute App Frontend URL:** `https://___________.neurolov.ai`
3. **Any other domains?** (optional)

**Then I'll give you the exact .env configuration to copy-paste!** 🚀

---

## 💾 FILES INCLUDED

You now have these files in your project:

1. ✅ `PRODUCTION_DEPLOYMENT_REPORT.md` - Complete audit report
2. ✅ `DEPLOYMENT_INSTRUCTIONS.md` - This file (step-by-step guide)
3. ✅ `.env.production.template` - Template for AWS .env
4. ✅ `AWS_PRODUCTION_READINESS.md` - Production readiness audit
5. ✅ `AWS_DEPLOYMENT_GUIDE.md` - Detailed deployment guide
6. ✅ `COMPUTE_APP_INTEGRATION.md` - Plan sync documentation

---

**Status:** ✅ Code is ready, waiting for your frontend URLs to complete .env configuration!
