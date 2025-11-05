# 🔥 MIGRATION & RATE LIMITS - STRAIGHT ANSWERS

---

## **PART 1: YOUR CURRENT AUTH SYSTEM**

### **What You Have Now:**

```
user_profiles table:
- id (UUID)
- email
- password_hash (for email/password users)
- user_name
- auth_provider ('email' or 'google')
- referral_code
- total_balance
- plan
- etc...
```

**Current Auth Flow:**
1. **Email/Password:** User signs up → password hashed → stored in `user_profiles`
2. **Google OAuth:** NOT IMPLEMENTED YET (you only have `auth_provider` field ready)

---

## **PART 2: GOOGLE AUTH MIGRATION - WHAT YOU NEED**

### **From Image 2, Your Old System Has:**

```
OLD DATABASE (Supabase Auth):
- 10,273 users
- Many with "Google" provider (see image)
- Stored in auth.users table (Supabase managed)

NEW DATABASE (swarm-database):
- user_profiles table (your custom table)
- Has auth_provider field but no Google users yet
```

### **⚠️ USERS YOU'LL LOSE IF YOU DON'T MIGRATE:**

All users who signed up with Google in the old system (likely 50%+ of your users based on image 2).

---

## **PART 3: WHAT NEEDS TO BE MIGRATED**

### **Step 1: Export Google Users from Old Database**

Run this SQL on **OLD Supabase project** (phpaoa5gtqsnwohitcvwf):

```sql
-- Export Google OAuth users
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'avatar_url' as avatar_url,
  au.created_at,
  au.provider,
  up.*
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.provider = 'google'
ORDER BY au.created_at DESC;
```

Export to CSV or JSON.

---

### **Step 2: Import Google Users to New Database**

Run this SQL on **NEW Supabase project** (ewwmyqhciwapfptomyvl):

```sql
-- For each Google user from old system:
INSERT INTO user_profiles (
  id,  -- Use SAME UUID from old system (critical!)
  email,
  user_name,
  auth_provider,
  password_hash,  -- NULL for Google users
  referral_code,
  total_balance,
  plan,
  joined_at
)
VALUES (
  'OLD_USER_UUID',  -- Same ID from old system
  'user@gmail.com',
  'User Name',
  'google',  -- Important!
  NULL,  -- No password for Google users
  'REF_CODE',
  0,
  'free',
  'OLD_CREATED_AT'
)
ON CONFLICT (email) DO UPDATE SET
  auth_provider = 'google',
  user_name = EXCLUDED.user_name;
```

**💡 Key Point:** Use the SAME user IDs from old system to preserve all their data (earnings, devices, etc.).

---

### **Step 3: Add Google OAuth to Backend**

Create new file: `src/services/googleAuthService.ts`

```typescript
import { supabaseAdmin } from '../config/database';
import { generateToken } from '../config/auth';
import logger from '../utils/logger';

export const googleAuthService = {
  /**
   * Handle Google OAuth callback
   * This is called when user returns from Google login
   */
  async handleGoogleLogin(googleUser: {
    id: string;
    email: string;
    name: string;
    picture: string;
  }): Promise<{ user: any; token: string }> {
    try {
      // Check if user exists
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', googleUser.email)
        .single();

      let user;

      if (existingUser) {
        // Existing user - just login
        user = existingUser;
        logger.info(`Google user logged in: ${googleUser.email}`);
      } else {
        // New Google user - create account
        const { data: newUser, error } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            email: googleUser.email,
            user_name: googleUser.name,
            auth_provider: 'google',
            password_hash: null, // No password for Google users
            profile_image: googleUser.picture,
          })
          .select()
          .single();

        if (error) throw error;
        user = newUser;
        logger.info(`New Google user created: ${googleUser.email}`);
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      return { user, token };
    } catch (error) {
      logger.error('Google auth error:', error);
      throw error;
    }
  },
};
```

---

### **Step 4: Add Google OAuth Route**

In `src/routes/auth/index.ts`:

```typescript
import { googleAuthService } from '../../services/googleAuthService';

// Google OAuth callback
router.post('/google', authLimiter, async (req: Request, res: Response) => {
  try {
    const { googleToken } = req.body;

    // Verify Google token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleToken,
    });

    if (error) throw error;

    // Handle in our system
    const result = await googleAuthService.handleGoogleLogin({
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.full_name || data.user.email!,
      picture: data.user.user_metadata.avatar_url || '',
    });

    sendSuccess(res, 'Google login successful', result);
  } catch (error: any) {
    sendError(res, 'Google login failed', error.message, 400);
  }
});
```

---

## **PART 4: RATE LIMITS - WHAT I'LL FIX**

### **BACKEND CHANGES (I'll do this):**

```typescript
// src/middleware/rateLimiter.ts - ADD THESE:

// 1. Settings endpoints (CRITICAL)
export const settingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many settings changes, try again later.',
});

export const deletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1,
  message: 'Can only attempt account deletion once per hour.',
});

// 2. Support tickets
export const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many support requests.',
});

// 3. Device registration
export const deviceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many device registrations.',
});

// 4. Earnings claims
export const claimLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100,
  message: 'Daily claim limit reached.',
});
```

**Apply to routes:**
```typescript
// settings/index.ts
router.delete('/account', deletionLimiter, authenticate, settingsController.deleteAccount);
router.put('/password', settingsLimiter, authenticate, settingsController.changePassword);
router.put('/profile', settingsLimiter, authenticate, settingsController.updateSettings);

// support/index.ts
router.post('/tickets', supportLimiter, optionalAuth, supportController.createTicket);

// devices/index.ts
router.post('/', deviceLimiter, authenticate, deviceController.registerDevice);

// earnings/index.ts
router.post('/', claimLimiter, authenticate, earningController.claimEarnings);
```

---

### **FRONTEND CHANGES: NONE! ❌**

**Rate limits are handled 100% by backend.**

Frontend will just receive error responses like:
```json
{
  "success": false,
  "message": "Too many settings changes, try again later.",
  "timestamp": "2025-11-04T..."
}
```

Your frontend already handles API errors correctly, so **NO CHANGES NEEDED.**

---

## **PART 5: SUMMARY - WHAT YOU NEED TO DO**

### **Google Auth Migration:**

```bash
# 1. Export Google users from OLD database
# Run SQL query from Step 1 on old Supabase

# 2. Import to NEW database
# Run SQL inserts from Step 2 on new Supabase

# 3. Add Google OAuth to backend
# Create googleAuthService.ts (I'll do this)
# Add /auth/google route (I'll do this)

# 4. Enable Google OAuth in Supabase
# Go to: https://supabase.com/dashboard/project/ewwmyqhciwapfptomyvl/auth/providers
# Enable Google provider
# Add OAuth credentials
```

### **Rate Limits:**

```bash
# Backend (I'll fix):
✅ Add 5 new rate limiters
✅ Apply to 6 critical routes
✅ Deploy

# Frontend:
❌ No changes needed (already handles errors)
```

---

## **PART 6: WHAT I'LL IMPLEMENT NOW**

### **1. Google Auth Service** ✅
- Create `googleAuthService.ts`
- Handle Google login/signup
- Merge with existing users

### **2. Google Auth Route** ✅
- Add `POST /auth/google`
- Verify Google token
- Return JWT

### **3. Rate Limiters** ✅
- Add 5 new limiters
- Apply to settings, support, devices, earnings

### **4. Migration Script** ✅
- SQL script to migrate old Google users
- Preserves user IDs and data

---

## **FINAL CHECKLIST:**

```
Google Auth:
☐ Export Google users from old DB (YOU DO THIS)
☐ Import Google users to new DB (YOU DO THIS)
☐ Create googleAuthService.ts (I'LL DO THIS)
☐ Add /auth/google route (I'LL DO THIS)
☐ Enable Google in Supabase dashboard (YOU DO THIS)

Rate Limits:
☐ Add 5 rate limiters (I'LL DO THIS)
☐ Apply to routes (I'LL DO THIS)
☐ Test (YOU DO THIS)
☐ Deploy (YOU DO THIS)

Frontend:
☐ Nothing! Already done! ✅
```

---

**READY TO IMPLEMENT? I'LL START NOW!** 🚀
