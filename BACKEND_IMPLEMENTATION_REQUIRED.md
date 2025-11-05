# Backend Implementation Required - Complete Guide

## Overview
This document outlines all backend endpoints that need to be implemented for the NeuroSwarm application, including:
1. **Leaderboard with Top 10 + Current User Rank**
2. **Settings Page APIs (Password Reset, Account Deletion)**
3. **Resend SMTP Integration for OTP Emails**

---

## 1. Leaderboard API - Top 10 + Current User

### Current Implementation
- Frontend calls: `GET /api/v1/earnings/leaderboard?limit=100`
- Displays all 100 users
- Highlights current user if in top 100

### Required Changes

#### Endpoint: `GET /api/v1/earnings/leaderboard`

**Query Parameters:**
- `limit` (optional, default: 10) - Number of top users to return

**Response Format:**
```json
{
  "success": true,
  "data": {
    "top10": [
      {
        "rank": 1,
        "user_id": "uuid",
        "username": "dipustn5400",
        "total_earnings": 2007478354.10,
        "total_balance": 2007478354.10
      },
      // ... 9 more entries
    ],
    "currentUser": {
      "rank": 172,
      "user_id": "current-user-uuid",
      "username": "Nimbus",
      "total_earnings": 674700.35,
      "total_balance": 674700.35
    }
  }
}
```

**SQL Implementation:**

```sql
-- Get top 10 users
WITH ranked_users AS (
  SELECT 
    u.id as user_id,
    u.username,
    COALESCE(SUM(e.amount), 0) as total_earnings,
    u.total_balance,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(e.amount), 0) DESC) as rank
  FROM users u
  LEFT JOIN earnings e ON u.id = e.user_id
  GROUP BY u.id, u.username, u.total_balance
)
SELECT * FROM ranked_users
WHERE rank <= 10
ORDER BY rank ASC;

-- Get current user's rank (if not in top 10)
WITH ranked_users AS (
  SELECT 
    u.id as user_id,
    u.username,
    COALESCE(SUM(e.amount), 0) as total_earnings,
    u.total_balance,
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(e.amount), 0) DESC) as rank
  FROM users u
  LEFT JOIN earnings e ON u.id = e.user_id
  GROUP BY u.id, u.username, u.total_balance
)
SELECT * FROM ranked_users
WHERE user_id = :currentUserId;
```

**Node.js/Express Implementation:**

```javascript
// routes/earnings.js
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.id; // From JWT token

    // Get top N users
    const top10Query = `
      WITH ranked_users AS (
        SELECT 
          u.id as user_id,
          u.username,
          COALESCE(SUM(e.amount), 0) as total_earnings,
          u.total_balance,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(e.amount), 0) DESC) as rank
        FROM users u
        LEFT JOIN earnings e ON u.id = e.user_id
        GROUP BY u.id, u.username, u.total_balance
      )
      SELECT * FROM ranked_users
      WHERE rank <= $1
      ORDER BY rank ASC
    `;

    const top10 = await db.query(top10Query, [limit]);

    // Check if current user is in top 10
    const userInTop10 = top10.rows.find(u => u.user_id === userId);

    let currentUser = null;
    if (!userInTop10) {
      // Get current user's rank
      const currentUserQuery = `
        WITH ranked_users AS (
          SELECT 
            u.id as user_id,
            u.username,
            COALESCE(SUM(e.amount), 0) as total_earnings,
            u.total_balance,
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(e.amount), 0) DESC) as rank
          FROM users u
          LEFT JOIN earnings e ON u.id = e.user_id
          GROUP BY u.id, u.username, u.total_balance
        )
        SELECT * FROM ranked_users
        WHERE user_id = $1
      `;

      const result = await db.query(currentUserQuery, [userId]);
      currentUser = result.rows[0] || null;
    }

    res.json({
      success: true,
      data: {
        top10: top10.rows,
        currentUser: currentUser
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});
```

---

## 2. Settings Page APIs

### A. Password Reset Flow (with Resend SMTP)

#### Install Resend SDK
```bash
npm install resend
```

#### Environment Variables (.env)
```env
RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
RESEND_FROM_EMAIL=noreply@neurolov.ai
```

#### Setup Resend Client
```javascript
// config/resend.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;
```

#### Database Schema for OTP
```sql
CREATE TABLE password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_otp_email ON password_reset_otps(email);
CREATE INDEX idx_otp_expires ON password_reset_otps(expires_at);
```

#### Endpoint 1: Send OTP
```javascript
// routes/auth.js
const resend = require('../config/resend');

router.post('/reset-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const userResult = await db.query(
      'SELECT id, username FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    const user = userResult.rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await db.query(
      `INSERT INTO password_reset_otps (user_id, email, otp, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, email, otp, expiresAt]
    );

    // Send OTP via Resend
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@neurolov.ai',
      to: email,
      subject: 'NeuroSwarm - Password Reset OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #0A1A2F; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #112544; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background-color: #0A1A2F; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi ${user.username},</p>
              <p>You requested to reset your password. Use the OTP below to continue:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>This OTP will expire in 5 minutes.</strong></p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 NeuroSwarm. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    res.json({
      success: true,
      message: 'OTP sent to your email'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});
```

#### Endpoint 2: Verify OTP
```javascript
router.post('/reset-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find valid OTP
    const result = await db.query(
      `SELECT * FROM password_reset_otps 
       WHERE email = $1 AND otp = $2 AND expires_at > NOW() AND verified = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark OTP as verified
    await db.query(
      'UPDATE password_reset_otps SET verified = TRUE WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});
```

#### Endpoint 3: Update Password
```javascript
const bcrypt = require('bcrypt');

router.post('/reset-password/update', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Verify OTP is valid and verified
    const otpResult = await db.query(
      `SELECT user_id FROM password_reset_otps 
       WHERE email = $1 AND otp = $2 AND expires_at > NOW() AND verified = TRUE
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const userId = otpResult.rows[0].user_id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    // Delete all OTPs for this user
    await db.query(
      'DELETE FROM password_reset_otps WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }
});
```

### B. Account Deletion

#### Endpoint: Delete Account
```javascript
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // From JWT token

    // Start transaction
    await db.query('BEGIN');

    try {
      // Delete user's data in order (due to foreign key constraints)
      await db.query('DELETE FROM password_reset_otps WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM earnings WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM tasks WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM device_sessions WHERE device_id IN (SELECT id FROM devices WHERE user_id = $1)', [userId]);
      await db.query('DELETE FROM devices WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [userId]);
      await db.query('DELETE FROM daily_checkins WHERE user_id = $1', [userId]);
      
      // Finally delete user
      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});
```

---

## 3. Signup/Login OTP Integration (Optional)

If you want OTP verification during signup/login:

### Endpoint: Send Signup OTP
```javascript
router.post('/signup/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store in temporary table
    await db.query(
      `INSERT INTO signup_otps (email, otp, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET otp = $2, expires_at = $3`,
      [email, otp, expiresAt]
    );

    // Send email
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'NeuroSwarm - Verify Your Email',
      html: `
        <h1>Welcome to NeuroSwarm!</h1>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code expires in 5 minutes.</p>
      `
    });

    res.json({
      success: true,
      message: 'OTP sent to your email'
    });

  } catch (error) {
    console.error('Send signup OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});
```

---

## 4. Frontend Updates Required

### Update GlobalStatistics.tsx
```typescript
// Change from:
apiClient.get('/earnings/leaderboard?limit=100')

// To:
apiClient.get('/earnings/leaderboard?limit=10')

// Update state handling:
const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);

// In handleRefresh:
const leaderboardResponse = await apiClient.get('/earnings/leaderboard?limit=10');

if (leaderboardResponse.data?.data) {
  setLeaderboard(leaderboardResponse.data.data.top10 || []);
  setCurrentUserRank(leaderboardResponse.data.data.currentUser || null);
}
```

---

## 5. Testing Checklist

### Leaderboard
- [ ] Top 10 users display correctly
- [ ] Current user highlighted if in top 10
- [ ] Current user shown below "..." if rank > 10
- [ ] Rank numbers are correct

### Password Reset
- [ ] Send OTP email arrives within 30 seconds
- [ ] OTP is 6 digits
- [ ] OTP expires after 5 minutes
- [ ] Verified OTP allows password update
- [ ] Old password no longer works
- [ ] New password works for login

### Account Deletion
- [ ] Account deleted successfully
- [ ] All user data removed from database
- [ ] User redirected to homepage
- [ ] Cannot login with old credentials

---

## 6. Deployment Steps

1. **Install Dependencies**
   ```bash
   npm install resend bcrypt
   ```

2. **Run Database Migrations**
   ```sql
   -- Run the password_reset_otps table creation
   -- Run the signup_otps table creation (if needed)
   ```

3. **Set Environment Variables**
   ```env
   RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
   RESEND_FROM_EMAIL=noreply@neurolov.ai
   ```

4. **Update CORS Settings**
   ```javascript
   // Make sure Vercel domain is in allowed origins
   const corsOptions = {
     origin: [
       'https://swarmuii.vercel.app',
       'http://localhost:3000'
     ],
     credentials: true
   };
   ```

5. **Deploy Backend**
   - Push changes to your backend repository
   - Restart backend server
   - Test all endpoints

---

## 7. Email Template Customization

You can customize the email templates in the Resend dashboard or use React Email for better templates:

```bash
npm install @react-email/components
```

Then create email templates in `emails/` directory.

---

## Summary

**Endpoints to Implement:**
1. ✅ `GET /api/v1/earnings/leaderboard` - Top 10 + current user
2. ✅ `POST /api/v1/auth/reset-password/send-otp` - Send password reset OTP
3. ✅ `POST /api/v1/auth/reset-password/verify-otp` - Verify OTP
4. ✅ `POST /api/v1/auth/reset-password/update` - Update password
5. ✅ `DELETE /api/v1/auth/account` - Delete user account

**Database Tables:**
- `password_reset_otps` - Store OTPs for password reset
- `signup_otps` (optional) - Store OTPs for email verification

**External Services:**
- Resend SMTP - Email delivery service

**Status:** Ready for backend implementation!
