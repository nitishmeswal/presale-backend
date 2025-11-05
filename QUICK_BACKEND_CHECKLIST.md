# Quick Backend Implementation Checklist

## 🎯 What You Need to Implement

### 1. Leaderboard API (Top 10 + Current User)
**Endpoint:** `GET /api/v1/earnings/leaderboard?limit=10`

**Response:**
```json
{
  "success": true,
  "data": {
    "top10": [...10 users...],
    "currentUser": { "rank": 172, "username": "Nimbus", ... }
  }
}
```

**SQL Query:**
```sql
WITH ranked_users AS (
  SELECT 
    u.id, u.username,
    COALESCE(SUM(e.amount), 0) as total_earnings,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(e.amount), 0) DESC) as rank
  FROM users u
  LEFT JOIN earnings e ON u.id = e.user_id
  GROUP BY u.id
)
SELECT * FROM ranked_users WHERE rank <= 10 OR user_id = :currentUserId
```

---

### 2. Password Reset with Resend SMTP

**Install:**
```bash
npm install resend
```

**Environment Variables:**
```env
RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
RESEND_FROM_EMAIL=noreply@neurolov.ai
```

**Database Table:**
```sql
CREATE TABLE password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**3 Endpoints:**

#### A. Send OTP
```javascript
POST /api/v1/auth/reset-password/send-otp
Body: { email: "user@example.com" }

// Generate 6-digit OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();

// Send via Resend
await resend.emails.send({
  from: 'noreply@neurolov.ai',
  to: email,
  subject: 'Password Reset OTP',
  html: `Your OTP is: ${otp}`
});
```

#### B. Verify OTP
```javascript
POST /api/v1/auth/reset-password/verify-otp
Body: { email: "user@example.com", otp: "123456" }

// Check OTP is valid and not expired
SELECT * FROM password_reset_otps 
WHERE email = $1 AND otp = $2 AND expires_at > NOW()
```

#### C. Update Password
```javascript
POST /api/v1/auth/reset-password/update
Body: { email: "user@example.com", otp: "123456", newPassword: "newpass123" }

// Hash password and update
const hashedPassword = await bcrypt.hash(newPassword, 10);
UPDATE users SET password = $1 WHERE email = $2
```

---

### 3. Account Deletion

**Endpoint:**
```javascript
DELETE /api/v1/auth/account
Headers: Authorization: Bearer <token>

// Delete user and all related data
DELETE FROM earnings WHERE user_id = $1;
DELETE FROM devices WHERE user_id = $1;
DELETE FROM users WHERE id = $1;
```

---

## 📋 Implementation Steps

1. **Install Resend**
   ```bash
   npm install resend
   ```

2. **Create Database Table**
   ```sql
   -- Run password_reset_otps table creation
   ```

3. **Add Environment Variables**
   ```env
   RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
   RESEND_FROM_EMAIL=noreply@neurolov.ai
   ```

4. **Create Routes**
   - `/auth/reset-password/send-otp`
   - `/auth/reset-password/verify-otp`
   - `/auth/reset-password/update`
   - `/auth/account` (DELETE)
   - `/earnings/leaderboard` (UPDATE)

5. **Test Endpoints**
   - Send OTP → Check email
   - Verify OTP → Should succeed
   - Update password → Should work
   - Delete account → Should remove all data

---

## 🔧 Resend Setup Code

```javascript
// config/resend.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
module.exports = resend;

// In your route:
const resend = require('../config/resend');

await resend.emails.send({
  from: 'noreply@neurolov.ai',
  to: userEmail,
  subject: 'Your OTP Code',
  html: `<h1>Your OTP: ${otp}</h1>`
});
```

---

## ✅ Testing

### Leaderboard
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/v1/earnings/leaderboard?limit=10
```

### Send OTP
```bash
curl -X POST http://localhost:3001/api/v1/auth/reset-password/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:3001/api/v1/auth/reset-password/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

### Update Password
```bash
curl -X POST http://localhost:3001/api/v1/auth/reset-password/update \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","newPassword":"newpass123"}'
```

### Delete Account
```bash
curl -X DELETE http://localhost:3001/api/v1/auth/account \
  -H "Authorization: Bearer <token>"
```

---

## 📧 Email Template Example

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; background: #0A1A2F; color: #fff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .otp-box { 
      background: #112544; 
      padding: 20px; 
      text-align: center; 
      font-size: 32px; 
      letter-spacing: 8px; 
      font-weight: bold; 
      border-radius: 8px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Password Reset</h1>
    <p>Your OTP code is:</p>
    <div class="otp-box">${otp}</div>
    <p>This code expires in 5 minutes.</p>
  </div>
</body>
</html>
```

---

## 🚀 Ready to Deploy

Once implemented:
1. ✅ Users can reset password via email OTP
2. ✅ Users can delete their account
3. ✅ Leaderboard shows top 10 + current user rank
4. ✅ All emails sent via Resend SMTP

**See `BACKEND_IMPLEMENTATION_REQUIRED.md` for complete code examples!**
