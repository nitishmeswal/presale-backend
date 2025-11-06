# 🎯 TIERED REFERRAL SYSTEM - HOW IT WORKS

## **YOUR CONFUSION:** ❌
You think the `tier` column should be different for each record:
```
A refers B → tier: tier_1
B refers C → tier: tier_2  ← WRONG!
```

## **ACTUAL SYSTEM:** ✅
The `tier` column is **ALWAYS tier_1** because it's the **DIRECT** relationship:
```
A refers B → tier: tier_1
B refers C → tier: tier_1
```

---

## **Example with 3 Users:**

### **Setup:**
1. **User A** (KNIGHTISH) has code `LV00K26T`
2. **User B** (You) uses A's code → Creates referral record
3. **User C** (Alice) uses B's code → Creates another referral record

### **Database After Signup:**

**`referrals` table:**
| id | referrer_id | referred_id | tier | status |
|----|-------------|-------------|------|--------|
| 1 | A (KNIGHTISH) | B (You) | tier_1 | active |
| 2 | B (You) | C (Alice) | tier_1 | active |

**Both are tier_1!** This is correct!

---

## **When Bonuses Are Given:**

### **Scenario 1: Signup Bonuses**

**When B uses A's code:**
- ✅ B gets 500 SP (signup bonus)
- ✅ A gets 250 SP (referrer bonus)

**When C uses B's code:**
- ✅ C gets 500 SP (signup bonus)
- ✅ B gets 250 SP (referrer bonus)

---

### **Scenario 2: Task Completion Royalties**

**When C completes a task and earns 100 SP:**

**Backend logic:**
```javascript
// Step 1: Award C their 100 SP
await createEarning(C, 100);

// Step 2: Find who referred C (Tier 1 royalty)
const tier1 = await findReferrer(C);  // Returns B
await createEarning(B, 10);  // 10% of 100 = 10 SP

// Step 3: Find who referred B (Tier 2 royalty)
const tier2 = await findReferrer(B);  // Returns A
await createEarning(A, 5);  // 5% of 100 = 5 SP

// Step 4: Find who referred A (Tier 3 royalty)
const tier3 = await findReferrer(A);  // Returns NULL
// Stop here
```

**Final distribution:**
- C gets: 100 SP (task earnings)
- B gets: 10 SP (tier 1 royalty - direct referral)
- A gets: 5 SP (tier 2 royalty - indirect referral)

---

## **Why Your Database is CORRECT:**

You have 2 records, both tier_1:
```sql
SELECT * FROM referrals;
```

| referrer_id | referred_id | tier |
|-------------|-------------|------|
| 8f5d39d6... (KNIGHTISH) | 8af63f3b... (You) | tier_1 |
| 8af63f3b... (You) | ba6c087a... (Someone) | tier_1 |

**This is CORRECT!** ✅

The tier calculation happens **dynamically** when distributing royalties, not stored in the database!

---

## **How to Test Tiered Royalties:**

### **Step 1: Setup Chain**
```
A refers B
B refers C
C refers D
```

### **Step 2: D completes a task (earns 100 SP)**

**Expected backend logs:**
```
💸 Distributing royalty earnings - User: D, Amount: 100
💰 Tier 1: Awarding 10 SP to C (10%)
💰 Tier 2: Awarding 5 SP to B (5%)
💰 Tier 3: Awarding 2.5 SP to A (2.5%)
✅ All royalty earnings distributed successfully
```

**Expected database changes:**
```sql
-- earnings table
INSERT INTO earnings (user_id, amount, earning_type, description)
VALUES 
  ('D', 100, 'task_completion', 'Task reward'),
  ('C', 10, 'other', 'Tier 1 royalty'),
  ('B', 5, 'other', 'Tier 2 royalty'),
  ('A', 2.5, 'other', 'Tier 3 royalty');
```

---

## **Common Mistakes:**

### ❌ **Mistake 1: Expecting tier column to be tier_2, tier_3**
The tier column is **ALWAYS tier_1** because it represents the direct relationship.

### ❌ **Mistake 2: Expecting multiple records for one user**
Each user can only be referred ONCE. If B refers C, there's only ONE record.

### ❌ **Mistake 3: Confusing signup bonuses with royalties**
- **Signup bonuses:** One-time payment when relationship is created
- **Royalties:** Recurring payments when referred users complete tasks

---

## **Summary:**

| Event | Who Gets Paid | How Much |
|-------|---------------|----------|
| **B uses A's code** | B gets 500 SP<br>A gets 250 SP | One-time signup bonus |
| **C uses B's code** | C gets 500 SP<br>B gets 250 SP | One-time signup bonus |
| **C completes task (100 SP)** | C gets 100 SP<br>B gets 10 SP (tier 1)<br>A gets 5 SP (tier 2) | Task + Royalties |
| **D completes task (100 SP)** | D gets 100 SP<br>C gets 10 SP (tier 1)<br>B gets 5 SP (tier 2)<br>A gets 2.5 SP (tier 3) | Task + Royalties |

---

## **YOUR ISSUES:**

✅ **Tier logic:** CORRECT - Don't change it!
❌ **Signup bonuses:** NOT WORKING - Earnings not created
❌ **Task royalties:** UNKNOWN - Need to test task completion

**Delete the test referrals, restart backend, and test the complete flow!** 🚀
