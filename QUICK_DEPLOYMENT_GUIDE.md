# ⚡ QUICK DEPLOYMENT GUIDE - NEW FEATURES

**What's New:** Leaderboard, Settings, Password Reset with Email OTP

---

## 🚀 **DEPLOYMENT IN 3 STEPS:**

### **STEP 1: Add Resend API Key**

```bash
# 1. Get API key from https://resend.com/api-keys
# 2. Add to your .env file:

# Local .env:
RESEND_API_KEY=re_your_actual_api_key_here

# AWS .env (SSH to server):
ssh -i your-key.pem ubuntu@your-aws-ip
cd /path/to/neuroswarm-backend
nano .env
# Add: RESEND_API_KEY=re_your_actual_api_key_here
# Save: Ctrl+X, Y, Enter
```

---

### **STEP 2: Deploy to AWS**

```bash
# Already SSH'd from Step 1

# Pull latest code
git pull origin main

# Install new dependency (resend)
npm install

# Build
npm run build

# Restart PM2
pm2 restart neuroswarm-backend

# Verify
pm2 logs neuroswarm-backend --lines 50
```

---

### **STEP 3: Test Endpoints**

```bash
# Test leaderboard
curl https://api.neurolov.ai/api/v1/leaderboard

# Test password reset (send OTP)
curl -X POST https://api.neurolov.ai/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'

# Check email for OTP!
```

---

## 📋 **NEW API ENDPOINTS:**

```
GET    /api/v1/leaderboard              - Top 10 + user rank
GET    /api/v1/leaderboard/rank         - Current user's rank
DELETE /api/v1/settings/account         - Delete account
PUT    /api/v1/settings/password        - Change password  
PUT    /api/v1/settings/profile         - Update profile
POST   /api/v1/auth/forgot-password     - Send OTP email
POST   /api/v1/auth/reset-password      - Reset with OTP
POST   /api/v1/auth/resend-otp          - Resend OTP
```

---

## ✅ **VERIFICATION:**

After deployment, check:

1. **Leaderboard works:**
   ```bash
   curl https://api.neurolov.ai/api/v1/leaderboard
   # Should return: { top_10: [...], total_users: N }
   ```

2. **Email OTP works:**
   - Request OTP for your email
   - Check inbox/spam for email
   - Email should be beautiful HTML with 6-digit code

3. **Logs look good:**
   ```bash
   pm2 logs neuroswarm-backend | grep ERROR
   # Should see: no recent errors
   ```

---

## 🎨 **FRONTEND INTEGRATION:**

**Tell your frontend dev:**

1. **Leaderboard:**
   - `GET /api/v1/leaderboard` returns top 10 + current user
   - Highlight user if `is_current_user: true`
   - Show `current_user` rank below top 10 if exists

2. **Delete Account:**
   - `DELETE /api/v1/settings/account` with `{password}`
   - Requires auth token
   - Clears all user data

3. **Forgot Password:**
   - User enters email → `POST /api/v1/auth/forgot-password`
   - User receives email with 6-digit OTP
   - User enters OTP + new password → `POST /api/v1/auth/reset-password`

---

## 📧 **EMAIL SETUP (IMPORTANT!):**

### **Development:**
- ✅ Works immediately with any email
- ⚠️ May go to spam
- No domain verification needed

### **Production:**
1. Go to Resend dashboard
2. Add domain: `neurolov.ai`
3. Add DNS records (TXT, MX)
4. Verify domain
5. Emails will be from: `noreply@neurolov.ai`

---

## 🚨 **TROUBLESHOOTING:**

### **"Failed to send OTP email"**
- ✅ Check RESEND_API_KEY is set
- ✅ Check API key is valid (not expired)
- ✅ Check Resend dashboard for errors

### **"OTP expired"**
- ⚠️ OTP expires in 10 minutes
- ⚠️ Server restart clears all OTPs (in-memory)
- ✅ User can request new OTP

### **"Leaderboard empty"**
- ✅ Check `earnings_history` table has data
- ✅ Check Supabase connection

---

## 💾 **FILES CHANGED:**

```
✅ Installed: resend package
✅ Created: 12 new files (services, controllers, routes)
✅ Modified: 4 existing files (routes, config)
✅ Build: Success ✅
```

---

## ⏱️ **DEPLOYMENT TIME:**

- **Step 1 (Add API key):** 2 minutes
- **Step 2 (Deploy):** 3 minutes
- **Step 3 (Test):** 2 minutes
- **Total:** ~7 minutes

---

**STATUS:** ✅ Ready to Deploy!

**Documentation:** See `NEW_FEATURES_DOCUMENTATION.md` for complete API docs.
