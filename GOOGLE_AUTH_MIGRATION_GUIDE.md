# 🔐 **Google Auth & User Migration Guide**

## **Current Setup**

### **✅ What You Have:**
- **Custom Email/Password Auth:** Using `user_profiles` table with bcrypt
- **Google Auth Service:** Already implemented in `googleAuthService.ts`
- **Hybrid System:** Both email and Google auth supported
- **Field:** `auth_provider` ('email' or 'google')

### **❌ What You DON'T Use:**
- Supabase `auth.users` table (not being used for email/password)
- Supabase Auth API for email signups

---

## **Do You Need Supabase Auth Table?**

### **Current Approach: Hybrid System**

```
┌─────────────────────────────────────┐
│   Your Backend Auth System          │
├─────────────────────────────────────┤
│                                     │
│  Email/Password (Custom)            │
│  ├─ user_profiles.password_hash     │
│  ├─ bcrypt hashing                  │
│  └─ JWT tokens                      │
│                                     │
│  Google OAuth (Supabase Auth)       │
│  ├─ auth.users (Google users only)  │
│  ├─ Supabase handles OAuth          │
│  └─ user_profiles (your data)       │
│                                     │
└─────────────────────────────────────┘
```

**Answer:** You need Supabase `auth.users` **ONLY for Google OAuth users**.

---

## **Google Auth - How It Works**

### **1. Frontend Flow:**
```javascript
// User clicks "Sign in with Google"
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:3000/auth/callback'
  }
})
```

### **2. Callback Handler:**
```javascript
// After Google auth, get user from Supabase
const { data: { user } } = await supabase.auth.getUser()

// Send to your backend
const response = await fetch('/api/v1/auth/google', {
  method: 'POST',
  body: JSON.stringify({ 
    googleUser: user 
  })
})
```

### **3. Backend Flow:**
Your `googleAuthService.ts` already handles this:
1. Receives Google user from frontend
2. Checks if email exists in `user_profiles`
3. Creates or updates user
4. Returns your JWT token

---

## **Migration from Old Supabase Project**

### **Step 1: Export Users from Old Project**

#### **Option A: Using Supabase Dashboard (Recommended)**
1. Go to old Supabase project
2. Authentication → Users
3. Click "Export" (if available)
4. Or use SQL:

```sql
-- Export all Google users
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as name,
  raw_user_meta_data->>'avatar_url' as picture,
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE raw_app_meta_data->>'provider' = 'google';
```

#### **Option B: Using Supabase API**
```bash
# Get all users via Supabase Management API
curl -X GET 'https://api.supabase.com/v1/projects/{OLD_PROJECT_REF}/auth/users' \
  -H "Authorization: Bearer {OLD_SERVICE_ROLE_KEY}"
```

---

### **Step 2: Import Users to New Project**

#### **Method 1: Create in New Supabase Auth (Best)**

```sql
-- For each user, create in new auth.users table
-- This requires admin access to auth schema

-- Example: Create users in new project
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  instance_id
) VALUES (
  'user-uuid-from-old-project',
  'user@example.com',
  '', -- Empty for Google users
  NOW(),
  '{"provider": "google", "providers": ["google"]}',
  '{"full_name": "John Doe", "avatar_url": "https://...", "picture": "https://..."}',
  'original-created-at-timestamp',
  NOW(),
  '00000000-0000-0000-0000-000000000000'
);
```

#### **Method 2: Migration Script**

Create `src/scripts/migrateGoogleUsers.ts`:

```typescript
import { supabaseAdmin } from '../config/database';
import fs from 'fs';

// Load exported users from old project
const oldUsers = JSON.parse(fs.readFileSync('./old-users.json', 'utf-8'));

async function migrateUsers() {
  for (const oldUser of oldUsers) {
    try {
      // 1. Create in new Supabase Auth (requires admin API)
      const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: oldUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: oldUser.name,
          avatar_url: oldUser.picture,
          picture: oldUser.picture
        },
        app_metadata: {
          provider: 'google',
          providers: ['google']
        }
      });

      if (authError) {
        console.error(`Failed to create auth user for ${oldUser.email}:`, authError);
        continue;
      }

      // 2. Create in user_profiles
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: newAuthUser.user.id,
          email: oldUser.email,
          user_name: oldUser.name || oldUser.email.split('@')[0],
          auth_provider: 'google',
          profile_image: oldUser.picture,
          referral_code: generateReferralCode(),
          joined_at: oldUser.created_at
        });

      if (profileError) {
        console.error(`Failed to create profile for ${oldUser.email}:`, profileError);
      } else {
        console.log(`✅ Migrated: ${oldUser.email}`);
      }
    } catch (error) {
      console.error(`Error migrating ${oldUser.email}:`, error);
    }
  }
}

migrateUsers();
```

---

### **Step 3: Maintain User IDs (Critical!)**

⚠️ **IMPORTANT:** To keep user data intact:

**Option A: Use Same UUIDs (Recommended)**
```typescript
// When creating in new project, use old user IDs
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: oldUser.email,
  email_confirm: true,
  user_metadata: { ... },
  // Force the same UUID from old project
  // NOTE: This requires direct database access
});

// Then manually set ID in auth.users
await supabaseAdmin.rpc('set_user_id', {
  old_id: 'uuid-from-old-project',
  new_id: 'generated-uuid'
});
```

**Option B: ID Mapping Table**
```sql
CREATE TABLE user_id_migrations (
  old_user_id UUID PRIMARY KEY,
  new_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  migrated_at TIMESTAMP DEFAULT NOW()
);
```

---

## **Recommended Setup**

### **1. Enable Google OAuth in New Supabase Project**

1. Go to Authentication → Providers
2. Enable Google
3. Add credentials:
   - Client ID
   - Client Secret
   - Authorized redirect URIs

### **2. Backend Routes (Already Exist)**

```typescript
// src/routes/auth/google.ts
router.post('/google', async (req: Request, res: Response) => {
  const { googleUser } = req.body;
  const result = await googleAuthService.handleGoogleAuth(googleUser);
  sendSuccess(res, 'Google login successful', result);
});
```

### **3. Frontend Implementation**

```typescript
// Sign in with Google
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
};

// Handle callback
const handleCallback = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Send to your backend
    const response = await fetch('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        googleUser: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name,
          picture: user.user_metadata?.avatar_url
        }
      })
    });
    
    const { token } = await response.json();
    localStorage.setItem('token', token);
  }
};
```

---

## **Migration Checklist**

### **Preparation**
- [ ] Export all users from old Supabase project
- [ ] Document all user IDs and emails
- [ ] Backup old database
- [ ] Test migration with 5-10 test users first

### **New Project Setup**
- [ ] Enable Google OAuth provider
- [ ] Add OAuth credentials
- [ ] Configure redirect URIs
- [ ] Test Google auth with new account

### **Migration**
- [ ] Run migration script for all users
- [ ] Verify user count matches
- [ ] Test login with migrated users
- [ ] Check all user data (earnings, referrals, etc.)

### **Post-Migration**
- [ ] Monitor error logs for failed logins
- [ ] Provide support for users who can't log in
- [ ] Keep old project running for 1-2 weeks (readonly)
- [ ] Announce migration to users

---

## **Testing Migration**

### **Test Script:**
```bash
# 1. Create test user in old project
# 2. Export that user
# 3. Import to new project
# 4. Try logging in with Google
# 5. Verify all data exists (earnings, referrals, etc.)
```

---

## **User Experience**

### **Seamless Migration:**
Users won't notice anything if done right:

1. User clicks "Sign in with Google"
2. Google authenticates them
3. Backend checks email
4. Finds existing account → Logs them in
5. All data intact (earnings, referrals, tasks)

### **Edge Cases:**

**Case 1: User had email/password, now wants Google**
- Your `googleAuthService` handles this!
- Updates `auth_provider` from 'email' to 'google'
- Preserves all data

**Case 2: User exists in old project but not migrated yet**
- First login creates account
- They start fresh (no old data)
- **Solution:** Migrate all users BEFORE launch

---

## **Summary**

### **✅ You Already Have:**
- Google auth service implemented
- Hybrid email/Google support
- Migration-friendly architecture

### **✅ What You Need:**
- Export users from old Supabase project
- Import to new auth.users table
- Test with sample users first
- Keep old project as backup

### **✅ Best Approach:**
1. Export all Google users from old project (CSV/JSON)
2. Use Supabase Admin API to create them in new project
3. Preserve UUIDs if possible (requires direct DB access)
4. Or create ID mapping table
5. Test thoroughly before full migration
6. Announce migration window to users

**Your backend is already ready for Google auth! Just need to migrate the users. 🚀**
