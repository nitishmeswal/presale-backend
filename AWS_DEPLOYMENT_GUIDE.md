# 🚀 AWS DEPLOYMENT GUIDE - NeuroSwarm Backend

**Last Updated:** Nov 2, 2025  
**Version:** 1.0.0  
**Target:** AWS EC2 Instance

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before deploying to AWS, ensure:

- [x] All 3 critical fixes applied (see AWS_PRODUCTION_READINESS.md)
- [x] `npm run build` succeeds locally
- [x] `.env` file has Compute App credentials
- [x] `ecosystem.config.js` created
- [x] Git repository up to date
- [x] Backup of current AWS deployment taken

---

## 🔧 AWS INSTANCE SETUP (First Time Only)

### **1. SSH into AWS Instance**

```bash
ssh -i your-key.pem ubuntu@your-aws-ip
# or
ssh -i your-key.pem ec2-user@your-aws-ip  # Amazon Linux
```

### **2. Install Node.js (if not installed)**

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

### **3. Install PM2 (Process Manager)**

```bash
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions

# Verify
pm2 --version
```

### **4. Install Git (if not installed)**

```bash
sudo apt-get update
sudo apt-get install -y git
```

### **5. Clone Repository**

```bash
# Go to your desired directory
cd /home/ubuntu  # or wherever you want

# Clone your repo
git clone https://github.com/yourusername/neuroswarm-backend.git
cd neuroswarm-backend
```

---

## 🔐 ENVIRONMENT SETUP

### **1. Create .env File**

```bash
cd /home/ubuntu/neuroswarm-backend
nano .env
```

### **2. Add ALL Required Variables:**

```env
# Server Configuration
NODE_ENV=production
PORT=3001
API_VERSION=v1

# CORS Configuration - Frontend URLs
FRONTEND_URL=http://localhost:3000
FRONTEND_PROD_URL=https://swarm.neurolov.ai

# Supabase Configuration (NeuroSwarm)
SUPABASE_URL=https://ewwmyqhciwapfptomyvl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d215cWhjaXdhcGZwdG9teXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NzA0NzksImV4cCI6MjA3NzA0NjQ3OX0.JlZLxzjwm62JOKsIzGCZXtw4elMrefJqexo1UlF11GY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d215cWhjaXdhcGZwdG9teXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQ3MDQ3OSwiZXhwIjoyMDc3MDQ2NDc5fQ.yUQE2yFRvqRPvDrTI0tJx0Jjz13-nG6iXyuLnc_R448

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-change-this-to-random-string
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# AWS Configuration
AWS_REGION=us-east-1

# 🔥 COMPUTE APP INTEGRATION (NEW - REQUIRED!)
COMPUTE_SUPABASE_URL=https://oiqqfyhdvdrsymxtuoyr.supabase.co
COMPUTE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pcXFmeWhkdmRyc3lteHR1b3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxODE5OTEsImV4cCI6MjA0Mjc1Nzk5MX0.qK3KcbJ5ulsFHbJGi6UHPGTnW4-zzGNEBIiVJUlH4nI
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### **3. Secure .env File**

```bash
chmod 600 .env
```

---

## 📦 INSTALLATION & BUILD

### **1. Install Dependencies**

```bash
npm install
```

### **2. Build TypeScript**

```bash
npm run build
```

**Expected output:**
```
> neuroswarm-backend@1.0.0 build
> tsc

# No errors = success!
```

### **3. Verify Build**

```bash
ls -la dist/
# Should see: server.js, app.js, and other compiled files
```

---

## 🚀 DEPLOYMENT

### **Option A: Using Deployment Script (Recommended)**

```bash
# Make script executable
chmod +x deploy-aws.sh

# Run deployment
./deploy-aws.sh
```

### **Option B: Manual Deployment**

```bash
# 1. Build
npm run build

# 2. Start with PM2
pm2 start ecosystem.config.js --env production

# 3. Save PM2 config
pm2 save

# 4. View logs
pm2 logs neuroswarm-backend --lines 50
```

---

## ✅ VERIFICATION

### **1. Check PM2 Status**

```bash
pm2 list
```

**Expected:**
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ mode    │ status  │ cpu      │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ neuroswarm-backend   │ cluster │ online  │ 0%       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

### **2. Check Health Endpoint**

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T15:04:00.000Z",
  "uptime": 12.345,
  "version": "1.0.0"
}
```

### **3. Check Logs**

```bash
pm2 logs neuroswarm-backend --lines 50
```

**Look for:**
```
🚀 Server running on port 3001 in production mode
🕐 Cron jobs started (uptime reset + plan sync)
✅ Plan sync cron job started (every 5 minutes)
```

### **4. Test API from Frontend**

```bash
# From your local machine
curl -X POST https://your-aws-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## 📊 MONITORING

### **Real-Time Monitoring**

```bash
pm2 monit
```

### **View Logs**

```bash
# All logs
pm2 logs neuroswarm-backend

# Last 100 lines
pm2 logs neuroswarm-backend --lines 100

# Only errors
pm2 logs neuroswarm-backend --err

# Follow logs (like tail -f)
pm2 logs neuroswarm-backend --lines 0
```

### **Resource Usage**

```bash
pm2 show neuroswarm-backend
```

---

## 🔄 UPDATES & REDEPLOYMENT

### **When You Make Code Changes:**

```bash
# 1. SSH to AWS
ssh -i your-key.pem ubuntu@your-aws-ip

# 2. Navigate to project
cd /home/ubuntu/neuroswarm-backend

# 3. Pull latest code
git pull origin main

# 4. Install new dependencies (if package.json changed)
npm install

# 5. Rebuild
npm run build

# 6. Restart PM2
pm2 restart neuroswarm-backend

# 7. Verify
pm2 logs neuroswarm-backend --lines 50
```

### **Quick Update (One-Liner):**

```bash
cd /home/ubuntu/neuroswarm-backend && git pull && npm install && npm run build && pm2 restart neuroswarm-backend && pm2 logs neuroswarm-backend --lines 50
```

---

## 🛑 STOP/START COMMANDS

### **Stop Server**

```bash
pm2 stop neuroswarm-backend
```

### **Start Server**

```bash
pm2 start neuroswarm-backend
```

### **Restart Server**

```bash
pm2 restart neuroswarm-backend
```

### **Delete Process (Complete Removal)**

```bash
pm2 delete neuroswarm-backend
```

---

## 🐛 TROUBLESHOOTING

### **Issue: Server Won't Start**

**Check logs:**
```bash
pm2 logs neuroswarm-backend --err --lines 100
```

**Common causes:**
- Missing environment variables
- Port 3001 already in use
- Build errors

**Fix:**
```bash
# Check .env file
cat .env | grep COMPUTE_SUPABASE

# Check port
sudo lsof -i :3001

# Rebuild
npm run build
```

### **Issue: "COMPUTE_SUPABASE_URL not found"**

**Problem:** Missing Compute App credentials

**Fix:**
```bash
nano .env
# Add COMPUTE_SUPABASE_URL and COMPUTE_SUPABASE_ANON_KEY
pm2 restart neuroswarm-backend
```

### **Issue: High Memory Usage**

**Check:**
```bash
pm2 monit
```

**Fix:**
```bash
# Restart to clear memory
pm2 restart neuroswarm-backend

# If persistent, adjust in ecosystem.config.js:
max_memory_restart: '1G'  # Increase if needed
```

### **Issue: Cron Job Not Running**

**Check logs for:**
```bash
pm2 logs neuroswarm-backend | grep "Plan sync"
```

**Should see every 5 minutes:**
```
🔄 Starting plan sync cron job...
✅ Plan sync complete: X/Y users updated
```

**If missing:**
```bash
# Check if node-cron is installed
npm list node-cron

# If not:
npm install node-cron @types/node-cron
npm run build
pm2 restart neuroswarm-backend
```

---

## 🔒 SECURITY BEST PRACTICES

### **1. Firewall Configuration**

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3001/tcp  # Backend API
sudo ufw enable
```

### **2. Keep System Updated**

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### **3. Monitor Failed Login Attempts**

```bash
pm2 logs neuroswarm-backend | grep "Invalid credentials"
```

### **4. Regular Backups**

```bash
# Backup .env file
cp .env .env.backup

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

---

## 📈 SCALING

### **Horizontal Scaling (Multiple Instances)**

**Edit ecosystem.config.js:**
```javascript
instances: 'max',  // Use all CPU cores
// or
instances: 4,      // Specific number
```

**Restart:**
```bash
pm2 reload ecosystem.config.js --env production
```

### **Vertical Scaling (Upgrade Instance)**

1. Stop PM2: `pm2 stop neuroswarm-backend`
2. Resize AWS instance (EC2 console)
3. Restart PM2: `pm2 start neuroswarm-backend`

---

## 🆘 EMERGENCY ROLLBACK

### **If Deployment Breaks:**

```bash
# 1. Check current git commit
git log --oneline -5

# 2. Rollback to previous version
git reset --hard COMMIT_HASH

# 3. Rebuild
npm install
npm run build

# 4. Restart
pm2 restart neuroswarm-backend

# 5. Verify
curl http://localhost:3001/health
```

---

## 📋 POST-DEPLOYMENT CHECKLIST

After deployment, verify:

- [ ] `/health` endpoint returns 200
- [ ] PM2 shows `online` status
- [ ] Logs show no errors
- [ ] Cron job running (check logs for "Plan sync")
- [ ] Login works from frontend
- [ ] Plan sync works (check user plan after login)
- [ ] Memory usage < 500MB
- [ ] CPU usage < 50%
- [ ] No repeated restarts

---

## 🎯 USEFUL COMMANDS REFERENCE

```bash
# PM2 Management
pm2 list                        # List all processes
pm2 logs neuroswarm-backend     # View logs
pm2 monit                       # Monitor resources
pm2 restart neuroswarm-backend  # Restart app
pm2 stop neuroswarm-backend     # Stop app
pm2 delete neuroswarm-backend   # Remove app
pm2 save                        # Save current list
pm2 resurrect                   # Restore saved list

# Logs
pm2 logs --lines 100            # Last 100 lines
pm2 logs --err                  # Only errors
pm2 flush                       # Clear logs

# System
sudo systemctl status pm2-ubuntu  # PM2 service status
sudo systemctl restart pm2-ubuntu # Restart PM2 service
df -h                           # Disk usage
free -h                         # Memory usage
htop                            # System monitor
```

---

## 📞 SUPPORT

**If issues persist:**

1. Check logs: `pm2 logs neuroswarm-backend --lines 200`
2. Check system resources: `pm2 monit`
3. Verify .env file: `cat .env | grep COMPUTE`
4. Test health: `curl http://localhost:3001/health`
5. Rebuild: `npm run build && pm2 restart neuroswarm-backend`

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** Nov 2, 2025  
**Tested On:** Ubuntu 22.04 LTS, Amazon Linux 2
