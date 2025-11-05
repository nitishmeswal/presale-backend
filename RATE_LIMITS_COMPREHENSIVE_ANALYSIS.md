# 🚨 RATE LIMITS - COMPREHENSIVE ANALYSIS

**Date:** Nov 4, 2025, 6:55 PM  
**Critical Security Review**

---

## 📊 **CURRENT RATE LIMITING STATUS:**

### **GLOBAL RATE LIMITERS (3 types):**

```typescript
// src/middleware/rateLimiter.ts

1. rateLimiter (GLOBAL - Applied to ALL requests)
   - Window: 15 minutes (900,000ms from .env)
   - Max: 100 requests per window
   - Applied: app.ts line 53 (ALL routes)

2. authLimiter (AUTH ONLY)
   - Window: 15 minutes
   - Max: 5 requests per window
   - Applied: Only /auth routes (signup, login, password reset)
   - Feature: skipSuccessfulRequests: true (only counts failures)

3. apiLimiter (DEFINED BUT NOT USED!)
   - Window: 1 minute
   - Max: 60 requests per minute
   - Applied: NOWHERE ❌
```

---

## 🔍 **ROUTE-BY-ROUTE ANALYSIS:**

### **AUTH ROUTES** `/api/v1/auth/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/auth/signup` | POST | ✅ `authLimiter` (5/15min) | **SECURE** | Keep as is |
| `/auth/login` | POST | ✅ `authLimiter` (5/15min) | **SECURE** | Keep as is |
| `/auth/forgot-password` | POST | ✅ `authLimiter` (5/15min) | **SECURE** | Keep as is |
| `/auth/reset-password` | POST | ✅ `authLimiter` (5/15min) | **SECURE** | Keep as is |
| `/auth/resend-otp` | POST | ✅ `authLimiter` (5/15min) | **SECURE** | Keep as is |
| `/auth/profile` | GET | ❌ Global only (100/15min) | **RISKY** | Add specific limit |
| `/auth/profile` | PUT | ❌ Global only (100/15min) | **RISKY** | Add specific limit |

**Analysis:**
- ✅ Auth endpoints well protected (5 attempts/15 min)
- ✅ Password reset protected against brute force
- ⚠️ Profile endpoints only have global limit

---

### **SETTINGS ROUTES** `/api/v1/settings/*` ⚠️ **CRITICAL**

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/settings/account` | DELETE | ❌ **NONE!** | **CRITICAL** 🚨 | Add strict limit (1/hour) |
| `/settings/password` | PUT | ❌ **NONE!** | **HIGH RISK** 🔴 | Add limit (5/15min) |
| `/settings/profile` | PUT | ❌ **NONE!** | **MEDIUM RISK** 🟡 | Add limit (10/15min) |

**🚨 CRITICAL ISSUES:**
- Account deletion has NO rate limit (could be abused)
- Password change has NO specific limit (brute force risk)
- Only global 100/15min applies

---

### **LEADERBOARD ROUTES** `/api/v1/leaderboard/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/leaderboard` | GET | ❌ Global only (100/15min) | **OK** | Consider caching |
| `/leaderboard/rank` | GET | ❌ Global only (100/15min) | **OK** | Consider caching |

**Analysis:**
- ⚠️ Public endpoint, could be scraped
- 💡 Recommendation: Add caching (1 minute TTL)

---

### **EARNINGS ROUTES** `/api/v1/earnings/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/earnings` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/earnings` | POST | ❌ Global only (100/15min) | **RISKY** 🟡 | Add limit (100/day) |
| `/earnings/stats` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/earnings/history` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/earnings/leaderboard` | GET | ❌ Global only (100/15min) | **OK** | Cache recommended |
| `/earnings/chart` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/earnings/transactions` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |

**Analysis:**
- ⚠️ POST /earnings (claim rewards) could be abused
- 💡 Should have per-user daily limit

---

### **TASKS ROUTES** `/api/v1/complete-task` & `/api/v1/tasks/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/complete-task` | POST | ❌ Global only (100/15min) | **RISKY** 🟡 | Add limit (1000/day) |
| `/tasks/stats` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |

**Analysis:**
- ⚠️ Task completion could be spammed
- Business logic should handle task validation
- Rate limit as secondary protection

---

### **DEVICES ROUTES** `/api/v1/devices/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/devices` | POST | ❌ Global only (100/15min) | **RISKY** 🟡 | Add limit (10/hour) |
| `/devices` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/devices/:id` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/devices/:id` | PUT | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/devices/:id` | DELETE | ❌ Global only (100/15min) | **RISKY** 🟡 | Add limit (5/hour) |

**Analysis:**
- ⚠️ Device registration could be abused (fake devices)
- ⚠️ Device deletion needs stricter limit

---

### **SESSIONS ROUTES** `/api/v1/device-session/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/device-session/register` | POST | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/device-session/stop` | POST | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/device-session/verify` | GET/POST | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/device-session/cleanup` | POST | ❌ Global only (100/15min) | **OK** | Keep as is |

**Analysis:**
- ✅ Session endpoints are authenticated
- ✅ Natural rate limiting through session lifecycle

---

### **SUPPORT ROUTES** `/api/v1/support/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/support/tickets` | POST | ❌ Global only (100/15min) | **RISKY** 🟡 | Add limit (5/hour) |
| `/support/tickets` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |

**Analysis:**
- ⚠️ Ticket creation could be spammed
- 💡 Add strict rate limit (5 tickets per hour)

---

### **REFERRALS ROUTES** `/api/v1/referrals/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/referrals/verify` | POST | ❌ Global only (100/15min) | **OK** | Keep as is (public) |
| `/referrals` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/referrals/stats` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |

**Analysis:**
- ✅ Referral verification is public (needs to be accessible)
- ✅ Other endpoints are authenticated

---

### **DAILY CHECKINS ROUTES** `/api/v1/daily-checkins/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/daily-checkins/streak` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |
| `/daily-checkins` | POST | ❌ Global only (100/15min) | **OK** | Business logic handles daily limit |

**Analysis:**
- ✅ Daily check-in is inherently rate-limited (once per day)
- ✅ Business logic prevents multiple check-ins

---

### **GLOBAL STATS ROUTES** `/api/v1/global-stats/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/global-stats` | GET | ❌ Global only (100/15min) | **OK** | Add caching |
| `/global-stats/compute` | GET | ❌ Global only (100/15min) | **OK** | Add caching |

**Analysis:**
- ⚠️ Public endpoints (no auth required)
- 💡 Should implement caching (expensive queries)

---

### **SUBSCRIPTIONS ROUTES** `/api/v1/subscriptions/*`

| Endpoint | Method | Rate Limit | Status | Recommendation |
|----------|--------|------------|--------|----------------|
| `/subscriptions/current` | GET | ❌ Global only (100/15min) | **OK** | Keep as is |

**Analysis:**
- ✅ Authenticated endpoint
- ✅ Low abuse risk

---

## 🚨 **CRITICAL SECURITY ISSUES:**

### **1. Account Deletion - NO RATE LIMIT** 🔴 **CRITICAL**

```typescript
// Current: DELETE /api/v1/settings/account
// Rate Limit: NONE (only global 100/15min)

⚠️ RISK: User could spam account deletion attempts
⚠️ IMPACT: Could cause database load, DoS
🔧 FIX: Add strict limit (1 attempt per hour)
```

### **2. Password Change - NO RATE LIMIT** 🔴 **HIGH**

```typescript
// Current: PUT /api/v1/settings/password
// Rate Limit: NONE (only global 100/15min)

⚠️ RISK: Brute force password change attempts
⚠️ IMPACT: Account security compromise
🔧 FIX: Add limit (5 attempts per 15 minutes)
```

### **3. Claim Earnings - NO RATE LIMIT** 🟡 **MEDIUM**

```typescript
// Current: POST /api/v1/earnings
// Rate Limit: NONE (only global 100/15min)

⚠️ RISK: Could spam claims (if business logic has gaps)
⚠️ IMPACT: Potential earnings abuse
🔧 FIX: Add limit (100 claims per day)
```

### **4. Support Tickets - NO RATE LIMIT** 🟡 **MEDIUM**

```typescript
// Current: POST /api/v1/support/tickets
// Rate Limit: NONE (only global 100/15min)

⚠️ RISK: Spam tickets
⚠️ IMPACT: Support system overload
🔧 FIX: Add limit (5 tickets per hour)
```

### **5. Device Registration - NO RATE LIMIT** 🟡 **MEDIUM**

```typescript
// Current: POST /api/v1/devices
// Rate Limit: NONE (only global 100/15min)

⚠️ RISK: Fake device registration
⚠️ IMPACT: Database bloat, fake metrics
🔧 FIX: Add limit (10 devices per hour)
```

---

## 🔧 **RECOMMENDED FIXES:**

### **Priority 1: Critical Security (MUST FIX)** 🔴

```typescript
// 1. Settings Rate Limiter
export const settingsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 settings changes per hour
  message: {
    success: false,
    message: 'Too many settings changes, please try again later.',
  },
});

// 2. Deletion Rate Limiter (STRICT)
export const deletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // 1 deletion attempt per hour
  message: {
    success: false,
    message: 'Account deletion can only be attempted once per hour.',
  },
});

// Apply to routes:
router.delete('/account', deletionLimiter, authenticate, settingsController.deleteAccount);
router.put('/password', settingsLimiter, authenticate, settingsController.changePassword);
router.put('/profile', settingsLimiter, authenticate, settingsController.updateSettings);
```

---

### **Priority 2: Abuse Prevention (SHOULD FIX)** 🟡

```typescript
// 1. Earnings Claim Limiter
export const claimLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 100 claims per day
  message: {
    success: false,
    message: 'Daily claim limit reached.',
  },
});

// 2. Support Ticket Limiter
export const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 tickets per hour
  message: {
    success: false,
    message: 'Too many support requests, please try again later.',
  },
});

// 3. Device Registration Limiter
export const deviceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 devices per hour
  message: {
    success: false,
    message: 'Too many device registrations, please slow down.',
  },
});

// Apply to routes:
router.post('/earnings', claimLimiter, authenticate, earningController.claimEarnings);
router.post('/support/tickets', supportLimiter, optionalAuth, supportController.createTicket);
router.post('/devices', deviceLimiter, authenticate, deviceController.registerDevice);
```

---

### **Priority 3: Performance Optimization (NICE TO HAVE)** 🟢

```typescript
// 1. Add caching for expensive queries
import NodeCache from 'node-cache';
const leaderboardCache = new NodeCache({ stdTTL: 60 }); // 1 min TTL

// 2. Add read-only limiter for public endpoints
export const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 reads per minute
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
});

// Apply to:
router.get('/leaderboard', readLimiter, optionalAuth, leaderboardController.getLeaderboard);
router.get('/global-stats', readLimiter, optionalAuth, globalStatsController.getGlobalStats);
```

---

## 📊 **SUMMARY TABLE:**

### **Current Rate Limits:**

| Category | Endpoints | Current Limit | Risk Level | Recommended Limit |
|----------|-----------|---------------|------------|-------------------|
| **Auth** | signup, login, password reset | ✅ 5/15min | Low | Keep as is |
| **Settings** | account, password, profile | ❌ 100/15min | 🔴 **CRITICAL** | 5/hour (1/hour for delete) |
| **Earnings** | claim rewards | ❌ 100/15min | 🟡 Medium | 100/day |
| **Support** | create ticket | ❌ 100/15min | 🟡 Medium | 5/hour |
| **Devices** | register device | ❌ 100/15min | 🟡 Medium | 10/hour |
| **Leaderboard** | get leaderboard | ❌ 100/15min | 🟢 Low | 30/min (+ cache) |
| **Global Stats** | get stats | ❌ 100/15min | 🟢 Low | 30/min (+ cache) |

---

## 🎯 **ACTION ITEMS:**

### **Immediate (Today):**
1. ✅ Add `deletionLimiter` to `/settings/account` (1/hour)
2. ✅ Add `settingsLimiter` to `/settings/password` (5/hour)
3. ✅ Add `settingsLimiter` to `/settings/profile` (5/hour)

### **This Week:**
4. ✅ Add `claimLimiter` to `/earnings` POST (100/day)
5. ✅ Add `supportLimiter` to `/support/tickets` POST (5/hour)
6. ✅ Add `deviceLimiter` to `/devices` POST (10/hour)

### **Nice to Have:**
7. ⚪ Add caching to leaderboard endpoints
8. ⚪ Add caching to global stats endpoints
9. ⚪ Implement Redis for distributed rate limiting

---

## 🔍 **TESTING RATE LIMITS:**

```bash
# Test account deletion rate limit
for i in {1..5}; do
  curl -X DELETE https://api.neurolov.ai/api/v1/settings/account \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"password":"wrong_password"}'
  sleep 1
done

# Should get rate limit error after 1 attempt per hour

# Test password change rate limit
for i in {1..10}; do
  curl -X PUT https://api.neurolov.ai/api/v1/settings/password \
    -H "Authorization: Bearer TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"current_password":"wrong","new_password":"test123"}'
  sleep 1
done

# Should get rate limit error after 5 attempts
```

---

## ✅ **CHECKLIST:**

```
Priority 1 (Critical):
☐ Add deletionLimiter to DELETE /settings/account
☐ Add settingsLimiter to PUT /settings/password
☐ Add settingsLimiter to PUT /settings/profile

Priority 2 (High):
☐ Add claimLimiter to POST /earnings
☐ Add supportLimiter to POST /support/tickets
☐ Add deviceLimiter to POST /devices

Priority 3 (Medium):
☐ Add caching to leaderboard
☐ Add caching to global stats
☐ Monitor rate limit hits

Testing:
☐ Test all new rate limiters
☐ Verify error messages are user-friendly
☐ Check rate limit headers (X-RateLimit-*)
```

---

**SHALL I IMPLEMENT THESE RATE LIMIT FIXES NOW?** 🚀
