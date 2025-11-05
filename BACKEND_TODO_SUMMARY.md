# Backend Implementation TODO - Visual Summary

## 🎯 Current Status

### ✅ What's Already Working (Frontend)
- Login/Signup with JWT
- Earnings tracking
- Task completion
- Device management
- Referral system
- Global statistics

### ❌ What's Missing (Backend)
1. **Leaderboard** - Shows all 100 users instead of top 10 + current user
2. **Password Reset** - No OTP email system
3. **Account Deletion** - Endpoint returns 404 error
4. **Email Service** - Resend SMTP configured but not integrated

---

## 📊 Issue #1: Leaderboard

### Current Behavior
```
┌─────────────────────────────────┐
│  Leaderboard (100 users)        │
├─────────────────────────────────┤
│  1. dipustn5400  - 2,007,478 SP │
│  2. xowxi3576    - 1,958,624 SP │
│  3. RuBell       - 1,913,229 SP │
│  ...                            │
│  100. lastuser   - 1,000 SP     │
└─────────────────────────────────┘
```

### Desired Behavior (Like Image 2 & 3)
```
┌─────────────────────────────────┐
│  Leaderboard                    │
├─────────────────────────────────┤
│  🥇 dipustn5400  - 2,007,478 SP │
│  🥈 xowxi3576    - 1,958,624 SP │
│  🥉 RuBell       - 1,913,229 SP │
│  4. dh3136       - 911,985 SP   │
│  5. kailas...    - 900,000 SP   │
│  ...                            │
│  10. a5576174    - 735,802 SP   │
├─────────────────────────────────┤
│         . . .                   │
├─────────────────────────────────┤
│  172. Nimbus (You) - 674,700 SP │ ← Highlighted
└─────────────────────────────────┘
```

### Backend Change Required
```javascript
// OLD: Returns all users
GET /api/v1/earnings/leaderboard?limit=100
Response: { data: [...100 users...] }

// NEW: Returns top 10 + current user
GET /api/v1/earnings/leaderboard?limit=10
Response: {
  data: {
    top10: [...10 users...],
    currentUser: { rank: 172, username: "Nimbus", ... }
  }
}
```

---

## 🔐 Issue #2: Password Reset (Image 5)

### Current Behavior
```
User clicks "Reset Password"
  ↓
Frontend calls: POST /auth/reset-password/send-otp
  ↓
❌ Backend returns 404 - Endpoint doesn't exist
```

### Desired Flow
```
User enters email → Click "Send OTP"
  ↓
POST /auth/reset-password/send-otp
  ↓
Backend generates 6-digit OTP (e.g., 482736)
  ↓
Resend SMTP sends email ✉️
  ↓
User receives email with OTP
  ↓
User enters OTP → Click "Verify"
  ↓
POST /auth/reset-password/verify-otp
  ↓
Backend validates OTP
  ↓
User enters new password → Click "Update"
  ↓
POST /auth/reset-password/update
  ↓
Password updated ✅
```

### Backend Endpoints Needed
```javascript
1. POST /api/v1/auth/reset-password/send-otp
   Body: { email: "user@example.com" }
   → Generates OTP, saves to DB, sends email via Resend

2. POST /api/v1/auth/reset-password/verify-otp
   Body: { email: "user@example.com", otp: "482736" }
   → Validates OTP from database

3. POST /api/v1/auth/reset-password/update
   Body: { email: "user@example.com", otp: "482736", newPassword: "newpass" }
   → Updates password in database
```

---

## 🗑️ Issue #3: Account Deletion (Image 4)

### Current Behavior
```
User clicks "Delete My Account"
  ↓
Types "Delete Account" to confirm
  ↓
Frontend calls: DELETE /auth/account
  ↓
❌ Backend returns 404 - Endpoint doesn't exist
```

### Desired Flow
```
User confirms deletion
  ↓
DELETE /auth/account (with JWT token)
  ↓
Backend deletes:
  - User's earnings
  - User's devices
  - User's sessions
  - User's referrals
  - User account
  ↓
✅ Account deleted successfully
  ↓
User logged out and redirected to homepage
```

### Backend Endpoint Needed
```javascript
DELETE /api/v1/auth/account
Headers: Authorization: Bearer <token>

// Delete all user data in transaction
BEGIN TRANSACTION;
  DELETE FROM earnings WHERE user_id = $1;
  DELETE FROM devices WHERE user_id = $1;
  DELETE FROM referrals WHERE referrer_id = $1;
  DELETE FROM users WHERE id = $1;
COMMIT;
```

---

## 📧 Issue #4: Resend SMTP Integration (Image 1)

### Current Setup (Supabase Dashboard)
```
✅ SMTP Host: smtp.resend.com
✅ Port: 465
✅ Username: resend
✅ Password: re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
```

### What's Missing
Backend code to actually send emails using Resend SDK

### Integration Required
```javascript
// 1. Install Resend
npm install resend

// 2. Create config/resend.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
module.exports = resend;

// 3. Use in password reset
const resend = require('../config/resend');

await resend.emails.send({
  from: 'noreply@neurolov.ai',
  to: userEmail,
  subject: 'Password Reset OTP',
  html: `<h1>Your OTP: ${otp}</h1>`
});
```

---

## 📦 Database Changes Required

### New Table: password_reset_otps
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
CREATE INDEX idx_otp_expires ON password_reset_otps(expires_at);
```

---

## 🚀 Implementation Priority

### High Priority (Blocking Users)
1. ✅ **Password Reset** - Users can't reset forgotten passwords
2. ✅ **Account Deletion** - Users can't delete their accounts

### Medium Priority (UX Improvement)
3. ✅ **Leaderboard Top 10** - Better user experience

### Low Priority (Nice to Have)
4. ⚪ Email verification on signup (optional)

---

## 📝 Step-by-Step Implementation

### Step 1: Install Dependencies
```bash
npm install resend bcrypt
```

### Step 2: Add Environment Variables
```env
RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
RESEND_FROM_EMAIL=noreply@neurolov.ai
```

### Step 3: Create Database Table
```sql
-- Run password_reset_otps table creation
```

### Step 4: Implement Routes
```
routes/
  auth.js
    ✅ POST /signup
    ✅ POST /login
    ✅ GET /profile
    ✅ PUT /profile
    ❌ POST /reset-password/send-otp      ← ADD THIS
    ❌ POST /reset-password/verify-otp    ← ADD THIS
    ❌ POST /reset-password/update        ← ADD THIS
    ❌ DELETE /account                    ← ADD THIS

  earnings.js
    ✅ GET /
    ✅ POST /
    ✅ GET /history
    ⚠️  GET /leaderboard                  ← UPDATE THIS
    ✅ GET /chart
    ✅ GET /transactions
```

### Step 5: Test Each Endpoint
```bash
# Test password reset
curl -X POST http://localhost:3001/api/v1/auth/reset-password/send-otp \
  -d '{"email":"test@example.com"}'

# Test account deletion
curl -X DELETE http://localhost:3001/api/v1/auth/account \
  -H "Authorization: Bearer <token>"

# Test leaderboard
curl http://localhost:3001/api/v1/earnings/leaderboard?limit=10
```

---

## ✅ Success Criteria

### Leaderboard
- [ ] Shows exactly 10 users
- [ ] Current user highlighted if in top 10
- [ ] Current user shown below "..." if rank > 10
- [ ] Medal icons for top 3

### Password Reset
- [ ] OTP email arrives within 30 seconds
- [ ] OTP is 6 digits
- [ ] OTP expires after 5 minutes
- [ ] Can update password with valid OTP
- [ ] Old password no longer works

### Account Deletion
- [ ] Account deleted successfully
- [ ] All user data removed
- [ ] User logged out
- [ ] Cannot login again

---

## 📚 Documentation Files Created

1. **BACKEND_IMPLEMENTATION_REQUIRED.md** - Complete code examples
2. **QUICK_BACKEND_CHECKLIST.md** - Quick reference guide
3. **BACKEND_TODO_SUMMARY.md** - This file (visual overview)

---

## 🎯 Next Steps

1. **Read** `BACKEND_IMPLEMENTATION_REQUIRED.md` for complete code
2. **Implement** the 4 missing endpoints
3. **Test** each endpoint locally
4. **Deploy** to production
5. **Verify** frontend works correctly

**Estimated Time:** 2-3 hours for experienced developer

---

## 💡 Tips

- Use the SQL queries provided in the documentation
- Copy-paste the Resend email code
- Test OTP flow manually before deploying
- Make sure CORS allows your Vercel domain
- Use transactions for account deletion

**Good luck! 🚀**
