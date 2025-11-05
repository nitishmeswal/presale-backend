# 🚀 Backend Implementation Tasks - START HERE

## 📋 What You Need to Do

You have **4 backend endpoints** to implement for NeuroSwarm. The frontend is already configured and waiting for these APIs.

---

## 🎯 Quick Overview

| Task | Priority | Status | Time Estimate |
|------|----------|--------|---------------|
| 1. Leaderboard (Top 10 + Current User) | Medium | ❌ Not Started | 30 min |
| 2. Password Reset (OTP via Resend) | High | ❌ Not Started | 1 hour |
| 3. Account Deletion | High | ❌ Not Started | 20 min |
| 4. Resend SMTP Setup | High | ❌ Not Started | 15 min |

**Total Time:** ~2 hours

---

## 📚 Documentation Files

I've created **4 comprehensive guides** for you:

### 1. **COPY_PASTE_BACKEND_CODE.md** ⭐ START HERE
- Ready-to-use code snippets
- Just copy-paste into your backend
- Includes all 4 endpoints
- Testing commands included

### 2. **BACKEND_IMPLEMENTATION_REQUIRED.md**
- Complete implementation guide
- SQL queries explained
- Database schema
- Email templates

### 3. **QUICK_BACKEND_CHECKLIST.md**
- Quick reference guide
- Step-by-step checklist
- Testing instructions

### 4. **BACKEND_TODO_SUMMARY.md**
- Visual overview
- Current vs desired behavior
- Success criteria

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install resend bcrypt
```

### Step 2: Add Environment Variables
Add to your `.env` file:
```env
RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
RESEND_FROM_EMAIL=noreply@neurolov.ai
```

### Step 3: Create Database Table
Run this SQL in your database:
```sql
CREATE TABLE password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON password_reset_otps(email);
```

### Step 4: Copy-Paste Code
Open **COPY_PASTE_BACKEND_CODE.md** and copy the code for:
1. Resend configuration
2. Password reset endpoints (3 routes)
3. Account deletion endpoint
4. Updated leaderboard endpoint

### Step 5: Test
Use the curl commands in the documentation to test each endpoint.

---

## 🔍 What Each Endpoint Does

### 1. Leaderboard API
**Current:** Returns all 100 users  
**New:** Returns top 10 + current user's rank

```javascript
GET /api/v1/earnings/leaderboard?limit=10

Response:
{
  "top10": [
    { "rank": 1, "username": "dipustn5400", "total_earnings": 2007478 },
    // ... 9 more
  ],
  "currentUser": { "rank": 172, "username": "Nimbus", "total_earnings": 674700 }
}
```

### 2. Password Reset (3 Endpoints)

**A. Send OTP**
```javascript
POST /api/v1/auth/reset-password/send-otp
Body: { "email": "user@example.com" }
→ Sends 6-digit OTP via email
```

**B. Verify OTP**
```javascript
POST /api/v1/auth/reset-password/verify-otp
Body: { "email": "user@example.com", "otp": "123456" }
→ Validates OTP
```

**C. Update Password**
```javascript
POST /api/v1/auth/reset-password/update
Body: { "email": "user@example.com", "otp": "123456", "newPassword": "newpass" }
→ Updates password
```

### 3. Account Deletion
```javascript
DELETE /api/v1/auth/account
Headers: Authorization: Bearer <token>
→ Deletes user and all related data
```

---

## 🎨 Frontend Already Configured

The frontend is **100% ready** and waiting for these APIs:

### Settings Page
- ✅ Calls password reset endpoints
- ✅ Calls account deletion endpoint
- ✅ Shows proper error messages
- ✅ Has OTP verification flow

### Global Statistics Page
- ✅ Calls leaderboard endpoint
- ✅ Displays top 10 users
- ✅ Highlights current user
- ✅ Shows "..." separator for users outside top 10

### Auth Modal
- ✅ Has "Reset Password" button
- ✅ OTP input field ready
- ✅ Password update form ready

**You just need to implement the backend!**

---

## 🧪 Testing Checklist

After implementation, test these scenarios:

### Password Reset
- [ ] Click "Reset Password" in frontend
- [ ] Enter email, click "Send OTP"
- [ ] Check email inbox (should arrive in 30 seconds)
- [ ] Enter OTP, click "Verify"
- [ ] Enter new password, click "Update"
- [ ] Try logging in with new password
- [ ] Verify old password doesn't work

### Account Deletion
- [ ] Go to Settings page
- [ ] Click "Delete My Account"
- [ ] Type "Delete Account" to confirm
- [ ] Click "Permanently Delete"
- [ ] Verify account is deleted
- [ ] Try logging in (should fail)

### Leaderboard
- [ ] Go to Global Statistics page
- [ ] Verify top 10 users are shown
- [ ] If you're in top 10, you should be highlighted
- [ ] If you're outside top 10, you should see "..." then your rank

---

## 🚨 Common Issues

### Issue: Email not arriving
**Solution:** 
1. Check Resend dashboard for delivery status
2. Check spam folder
3. Verify API key is correct

### Issue: "Table does not exist"
**Solution:** Run the database migration SQL

### Issue: "resend is not defined"
**Solution:** Create `config/resend.js` file

### Issue: Account deletion fails
**Solution:** Make sure you delete tables in the correct order (see code)

---

## 📞 Need Help?

1. **Start with:** `COPY_PASTE_BACKEND_CODE.md`
2. **For details:** `BACKEND_IMPLEMENTATION_REQUIRED.md`
3. **For quick reference:** `QUICK_BACKEND_CHECKLIST.md`
4. **For overview:** `BACKEND_TODO_SUMMARY.md`

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Users receive OTP emails within 30 seconds
2. ✅ Users can reset their password
3. ✅ Users can delete their account
4. ✅ Leaderboard shows top 10 + current user rank
5. ✅ No errors in frontend console
6. ✅ All features work in production

---

## 🎯 Next Steps

1. **Read** `COPY_PASTE_BACKEND_CODE.md`
2. **Copy** the code into your backend
3. **Test** locally with curl commands
4. **Deploy** to production
5. **Test** on live site

**Estimated Time:** 2 hours for complete implementation and testing

---

## 📊 Current Status

### Frontend
- ✅ Settings page ready
- ✅ Global Statistics ready
- ✅ Auth modal ready
- ✅ All API calls configured

### Backend
- ❌ Password reset endpoints missing
- ❌ Account deletion endpoint missing
- ❌ Leaderboard needs update
- ❌ Resend SMTP not integrated

**Once you implement the backend, everything will work! 🚀**

---

## 💡 Pro Tips

1. **Test locally first** before deploying to production
2. **Use the provided SQL queries** - they're optimized
3. **Copy-paste the email templates** - they look professional
4. **Test with your own email** to verify delivery
5. **Use transactions** for account deletion to prevent data corruption

---

**Ready to start? Open `COPY_PASTE_BACKEND_CODE.md` and begin! 🎉**
