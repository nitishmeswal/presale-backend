# ✅ **TIERED REFERRAL SYSTEM - COMPLETE**

## **System Overview**

Multi-level referral system with signup bonuses and ongoing royalty earnings.

---

## **Signup Bonuses**

When User B signs up with User A's referral code:
- **Referrer (A):** Gets **250 SP** signup bonus
- **Referred (B):** Gets **500 SP** welcome bonus

---

## **Tiered Royalty System**

### **Example Chain: A → B → C → D**

When **D** completes a task and earns **1000 SP**:

| Person | Tier | Percentage | Earnings | Reason |
|--------|------|------------|----------|--------|
| **D** | - | 100% | 1000 SP | Task completion |
| **C** | Tier 1 | 10% | 100 SP | Direct referral of D |
| **B** | Tier 2 | 5% | 50 SP | D is B's Tier 2 |
| **A** | Tier 3 | 2.5% | 25 SP | D is A's Tier 3 |

**Total distributed:** 1175 SP (1000 + 100 + 50 + 25)

---

## **Tier Breakdown**

### **Tier 1: Direct Referrals**
- **Who:** People you directly referred
- **Earnings:** 10% of their task earnings
- **Privacy:** ✅ **Names shown** in frontend

### **Tier 2: Indirect Referrals (Level 2)**
- **Who:** People your referrals referred
- **Earnings:** 5% of their task earnings
- **Privacy:** ❌ **Names hidden** (count and earnings shown only)

### **Tier 3: Indirect Referrals (Level 3)**
- **Who:** People your Tier 2 referred
- **Earnings:** 2.5% of their task earnings
- **Privacy:** ❌ **Names hidden** (count and earnings shown only)

---

## **APIs Implemented**

### **1. POST /api/v1/referrals/verify**
Verify if referral code is valid (public endpoint).

**Request:**
```json
{
  "referralCode": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "referrerId": "uuid"
  }
}
```

---

### **2. GET /api/v1/referrals** (Protected)
Get all direct referrals (Tier 1).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "referralCode": "ABC123",
      "status": "active",
      "rewardAmount": 250,
      "createdAt": "2025-11-06T12:00:00Z"
    }
  ]
}
```

---

### **3. GET /api/v1/referrals/stats** (Protected)
Get comprehensive referral statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 5,
    "activeReferrals": 5,
    "totalRewards": 2875.50,
    "tier1": {
      "count": 5,
      "earnings": 1250.00
    },
    "tier2": {
      "count": 12,
      "earnings": 625.50
    },
    "tier3": {
      "count": 8,
      "earnings": 200.00
    }
  }
}
```

---

### **4. GET /api/v1/referrals/breakdown** (Protected) ✨ NEW
Get detailed breakdown with Tier 1 names.

**Response:**
```json
{
  "success": true,
  "data": {
    "tier1": [
      {
        "username": "john_doe",
        "earnings": 150.50,
        "joinedAt": "2025-11-01T10:00:00Z"
      },
      {
        "username": "jane_smith",
        "earnings": 225.75,
        "joinedAt": "2025-11-02T14:30:00Z"
      }
    ],
    "tier2": {
      "count": 12,
      "earnings": 625.50
    },
    "tier3": {
      "count": 8,
      "earnings": 200.00
    }
  }
}
```

---

## **Automatic Distribution**

### **When does royalty get distributed?**

Every time a user completes a task:

1. User gets their full task reward
2. System automatically finds their referral chain (up to 3 levels)
3. Distributes royalty to each tier
4. Updates `unclaimed_reward` for all beneficiaries
5. Creates earning records with metadata:
   ```json
   {
     "referral_user_id": "uuid",
     "tier": 1,
     "base_earning": 1000,
     "percentage": 0.10
   }
   ```

---

## **Database Schema**

### **earnings table:**
```sql
- user_id (uuid)
- amount (numeric)
- earning_type ('other')
- reward_type ('task' or 'referral')
- is_claimed (boolean)
- description (text)
- metadata (jsonb)
  - For tasks: { task_id, hardware_tier, multiplier }
  - For referrals: { tier, referral_user_id, base_earning, percentage }
  - For signup: { type: 'signup_bonus' or 'welcome_bonus' }
```

### **referrals table:**
```sql
- id (uuid)
- referrer_id (uuid)
- referred_user_id (uuid)
- referral_code (text)
- status (text)
- reward_amount (numeric)
- created_at (timestamp)
```

---

## **Configuration**

All values in `src/utils/constants.ts`:

```typescript
export const EARNINGS_CONFIG = {
  // Signup Bonuses
  REFERRER_SIGNUP_BONUS: 250,
  REFERRED_SIGNUP_BONUS: 500,
  
  // Royalty Percentages
  TIER_1_PERCENTAGE: 0.10,  // 10%
  TIER_2_PERCENTAGE: 0.05,  // 5%
  TIER_3_PERCENTAGE: 0.025, // 2.5%
};
```

---

## **Example Flow**

### **Scenario:**
- Alice invites Bob (referral code: ALICE123)
- Bob invites Carol (referral code: BOB456)
- Carol invites Dave (referral code: CAROL789)
- Dave completes 10 tasks, earning 300 SP

### **What happens:**

**1. Dave signs up with CAROL789:**
- Carol gets 250 SP signup bonus
- Dave gets 500 SP welcome bonus

**2. Dave completes task #1 (30 SP):**
- Dave: +30 SP (task reward)
- Carol: +3 SP (Tier 1: 10% of 30)
- Bob: +1.5 SP (Tier 2: 5% of 30)
- Alice: +0.75 SP (Tier 3: 2.5% of 30)

**3. After 10 tasks (300 SP total):**
- Dave: 300 SP + 500 SP (welcome) = 800 SP
- Carol: 250 SP (signup) + 30 SP (Tier 1 royalty) = 280 SP
- Bob: 15 SP (Tier 2 royalty)
- Alice: 7.5 SP (Tier 3 royalty)

---

## **Privacy Features**

✅ **What users see:**
- Own direct referrals (names + earnings)
- Tier 2 & 3 counts and total earnings
- NO names for Tier 2/3 (privacy protected)

❌ **What users DON'T see:**
- Who their referrals referred (Tier 2/3 names)
- Detailed breakdown of indirect referrals

---

## **Testing**

### **Test Signup:**
```bash
POST /api/v1/auth/signup
{
  "email": "bob@test.com",
  "password": "password123",
  "username": "bob",
  "referralCode": "ALICE123"
}
```

### **Test Task Completion:**
```bash
POST /api/v1/complete-task
{
  "task_id": "uuid",
  "reward_amount": 30,
  "task_type": "text"
}
```

### **Check Stats:**
```bash
GET /api/v1/referrals/stats
GET /api/v1/referrals/breakdown
```

---

## **Summary**

✅ Signup bonuses: 250 SP (referrer) + 500 SP (referred)  
✅ Tier 1: 10% ongoing royalty (names shown)  
✅ Tier 2: 5% ongoing royalty (hidden)  
✅ Tier 3: 2.5% ongoing royalty (hidden)  
✅ Automatic distribution on every task  
✅ Privacy-protected (only Tier 1 names visible)  
✅ Full stats and breakdown APIs  

**All backend logic implemented and ready!**
