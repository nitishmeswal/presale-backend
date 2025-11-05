# Copy-Paste Backend Code - Ready to Use

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install resend bcrypt
```

### 2. Environment Variables (.env)
```env
RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
RESEND_FROM_EMAIL=noreply@neurolov.ai
```

### 3. Database Migration
```sql
-- Create password_reset_otps table
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON password_reset_otps(expires_at);
```

---

## 📧 Resend Configuration

### config/resend.js
```javascript
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = resend;
```

---

## 🔐 Password Reset Endpoints

### routes/auth.js - Add these routes

```javascript
const resend = require('../config/resend');
const bcrypt = require('bcrypt');

// ============================================
// 1. SEND PASSWORD RESET OTP
// ============================================
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
            body { 
              font-family: Arial, sans-serif; 
              background-color: #0A1A2F; 
              color: #fff; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content { 
              background-color: #112544; 
              padding: 30px; 
              border-radius: 0 0 10px 10px; 
            }
            .otp-box { 
              background-color: #0A1A2F; 
              padding: 20px; 
              text-align: center; 
              font-size: 36px; 
              letter-spacing: 10px; 
              font-weight: bold; 
              border-radius: 8px; 
              margin: 20px 0;
              color: #667eea;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              color: #888; 
              font-size: 12px; 
            }
            p { 
              line-height: 1.6; 
              margin: 10px 0;
            }
            strong {
              color: #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${user.username}</strong>,</p>
              <p>You requested to reset your password. Use the OTP below to continue:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>This OTP will expire in 5 minutes.</strong></p>
              <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© 2024 NeuroSwarm. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log(`✅ OTP sent to ${email}: ${otp}`); // For testing

    res.json({
      success: true,
      message: 'OTP sent to your email'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// ============================================
// 2. VERIFY PASSWORD RESET OTP
// ============================================
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

// ============================================
// 3. UPDATE PASSWORD
// ============================================
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

---

## 🗑️ Account Deletion Endpoint

### routes/auth.js - Add this route

```javascript
// ============================================
// 4. DELETE ACCOUNT
// ============================================
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // From JWT token

    // Start transaction
    await db.query('BEGIN');

    try {
      // Delete user's data in order (due to foreign key constraints)
      console.log(`🗑️ Deleting account for user: ${userId}`);
      
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

      console.log(`✅ Account deleted successfully: ${userId}`);

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

## 📊 Leaderboard Endpoint (Updated)

### routes/earnings.js - Replace existing leaderboard route

```javascript
// ============================================
// GET LEADERBOARD - TOP 10 + CURRENT USER
// ============================================
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

    const top10Result = await db.query(top10Query, [limit]);

    // Check if current user is in top 10
    const userInTop10 = top10Result.rows.find(u => u.user_id === userId);

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

      const currentUserResult = await db.query(currentUserQuery, [userId]);
      currentUser = currentUserResult.rows[0] || null;
    }

    res.json({
      success: true,
      data: {
        top10: top10Result.rows,
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

## 🧪 Testing Commands

### Test Password Reset Flow
```bash
# 1. Send OTP
curl -X POST http://localhost:3001/api/v1/auth/reset-password/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"nitishneswal@gmail.com"}'

# 2. Verify OTP (use OTP from email)
curl -X POST http://localhost:3001/api/v1/auth/reset-password/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"nitishneswal@gmail.com","otp":"123456"}'

# 3. Update Password
curl -X POST http://localhost:3001/api/v1/auth/reset-password/update \
  -H "Content-Type: application/json" \
  -d '{"email":"nitishneswal@gmail.com","otp":"123456","newPassword":"newpassword123"}'
```

### Test Account Deletion
```bash
curl -X DELETE http://localhost:3001/api/v1/auth/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Test Leaderboard
```bash
curl http://localhost:3001/api/v1/earnings/leaderboard?limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## ✅ Checklist

- [ ] Install `resend` and `bcrypt` packages
- [ ] Add environment variables to `.env`
- [ ] Run database migration for `password_reset_otps` table
- [ ] Create `config/resend.js` file
- [ ] Add 3 password reset routes to `routes/auth.js`
- [ ] Add account deletion route to `routes/auth.js`
- [ ] Update leaderboard route in `routes/earnings.js`
- [ ] Test all endpoints locally
- [ ] Deploy to production
- [ ] Test on production with real email

---

## 🎯 Expected Results

### Password Reset
1. User receives email with 6-digit OTP within 30 seconds
2. OTP expires after 5 minutes
3. User can verify OTP successfully
4. User can update password with verified OTP
5. Old password no longer works
6. New password works for login

### Account Deletion
1. User can delete account
2. All user data removed from database
3. User logged out automatically
4. Cannot login with old credentials

### Leaderboard
1. Shows exactly 10 users (or less if fewer users exist)
2. Current user highlighted if in top 10
3. Current user shown below "..." if rank > 10
4. Ranks are correct and sequential

---

## 🚨 Common Issues & Solutions

### Issue: "resend is not defined"
**Solution:** Make sure you created `config/resend.js` and imported it:
```javascript
const resend = require('../config/resend');
```

### Issue: "RESEND_API_KEY is not defined"
**Solution:** Add to `.env` file:
```env
RESEND_API_KEY=re_3pHxxTWp_6zpUCEngatRzeBcDyPfgkr
```

### Issue: "Table password_reset_otps does not exist"
**Solution:** Run the database migration SQL

### Issue: Email not arriving
**Solution:** 
1. Check Resend dashboard for delivery status
2. Check spam folder
3. Verify `RESEND_FROM_EMAIL` is correct
4. Check Resend API key is valid

### Issue: "Cannot delete user - foreign key constraint"
**Solution:** Make sure you delete in the correct order (see account deletion code)

---

## 📚 Additional Resources

- Resend Documentation: https://resend.com/docs
- Bcrypt Documentation: https://www.npmjs.com/package/bcrypt
- PostgreSQL Window Functions: https://www.postgresql.org/docs/current/tutorial-window.html

---

**Ready to implement! Copy-paste the code and test each endpoint. 🚀**
