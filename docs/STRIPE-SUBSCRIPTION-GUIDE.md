# Stripe Subscription Integration Guide

## 📋 Overview

This guide covers the complete Stripe subscription system integrated into the Le Petit Davinci API. The system provides:

- **Account-level subscriptions** (one subscription per user, all profiles benefit)
- **Stripe Checkout** for payment processing
- **Customer Portal** for self-service subscription management
- **Webhook handling** for real-time subscription updates
- **Middleware** for protecting premium features

---

## 🎯 Architecture

### Subscription Model

```
Supabase User (auth.users)
    ↓ (one-to-one)
Subscription (subscriptions table)
    ↓ (one-to-many)
Profiles (profiles table)
```

**Key Points:**
- ✅ One subscription per user account
- ✅ All profiles under that account share subscription benefits
- ✅ Matches Netflix/Spotify model
- ✅ Subscription status checked via middleware

### Database Schema

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,              -- Links to auth.users
  stripe_customer_id VARCHAR(255) NOT NULL,  -- Stripe customer ID
  stripe_subscription_id VARCHAR(255),       -- Stripe subscription ID
  stripe_price_id VARCHAR(255),              -- Current price/plan
  status VARCHAR(50) DEFAULT 'inactive',     -- Subscription status
  plan_name VARCHAR(100),                    -- Human-readable plan name
  current_period_start TIMESTAMP,            -- Billing period start
  current_period_end TIMESTAMP,              -- Billing period end
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Subscription Statuses:**
- `active` - Subscription is active
- `trialing` - In trial period
- `past_due` - Payment failed, grace period
- `canceled` - Subscription canceled
- `incomplete` - Payment not completed
- `inactive` - No subscription

---

## 🔧 Setup Instructions

### 1. Stripe Dashboard Setup

#### A. Create Products & Pricing

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Click **"Add Product"**
3. Create your subscription tiers:

**Example: Basic Plan**
- Name: `Basic`
- Description: `Basic subscription plan`
- Pricing: Recurring
- Amount: `$9.99` per month
- Copy the **Price ID** (starts with `price_...`)

**Example: Premium Plan**
- Name: `Premium`
- Description: `Premium subscription plan`
- Pricing: Recurring
- Amount: `$19.99` per month
- Copy the **Price ID**

#### B. Get API Keys

1. Go to **Developers** → **API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_...`)
3. Copy your **Secret Key** (starts with `sk_test_...`)
4. ⚠️ Keep these secure!

#### C. Configure Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **"Add Endpoint"**
3. **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
4. **Select Events:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add Endpoint"**
6. Copy the **Signing Secret** (starts with `whsec_...`)

### 2. Environment Configuration

Add to your `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

### 3. Run Database Migration

Run the SQL migration in your Supabase Dashboard:

```bash
# Location: sql/create-subscriptions-table.sql
```

1. Go to Supabase Dashboard → **SQL Editor**
2. **New Query**
3. Paste contents of `sql/create-subscriptions-table.sql`
4. Click **Run**

Verify:
```sql
SELECT * FROM public.subscriptions;
```

### 4. Install Stripe CLI (for local testing)

**Windows:**
```powershell
# Using Scoop
scoop install stripe

# Or download from:
# https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

**Login:**
```bash
stripe login
```

---

## 📡 API Endpoints

### Authentication Required

All subscription endpoints require Supabase authentication token in header:
```
Authorization: Bearer {supabase_access_token}
```

---

### 1. Create Checkout Session

**Initiate subscription purchase**

```http
POST /api/subscriptions/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "priceId": "price_1ABC...",
  "successUrl": "https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://yourapp.com/canceled"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

**Usage:**
1. Call this endpoint from your frontend
2. Redirect user to the returned `url`
3. User completes payment on Stripe Checkout
4. User redirected back to your `successUrl`
5. Webhook updates subscription status

**Example (JavaScript):**
```javascript
const response = await fetch('/api/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    priceId: 'price_1ABC...'
  })
});

const { data } = await response.json();

// Redirect to Stripe Checkout
window.location.href = data.url;
```

---

### 2. Get Subscription Status

**Check user's current subscription**

```http
GET /api/subscriptions/status
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "stripe_customer_id": "cus_...",
    "stripe_subscription_id": "sub_...",
    "stripe_price_id": "price_...",
    "status": "active",
    "plan_name": "Premium",
    "current_period_start": "2025-10-10T00:00:00Z",
    "current_period_end": "2025-11-10T00:00:00Z",
    "cancel_at_period_end": false,
    "created_at": "2025-10-01T00:00:00Z",
    "updated_at": "2025-10-10T00:00:00Z"
  }
}
```

**If no subscription:**
```json
{
  "success": true,
  "data": {
    "user_id": "user-uuid",
    "stripe_customer_id": "",
    "status": "inactive",
    "cancel_at_period_end": false
  }
}
```

---

### 3. Create Customer Portal Session

**Let users manage their subscription**

```http
POST /api/subscriptions/portal
Authorization: Bearer {token}
Content-Type: application/json

{
  "returnUrl": "https://yourapp.com/settings"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/p/session/..."
  }
}
```

**What users can do in portal:**
- Update payment method
- Change plan
- Cancel subscription
- View invoice history
- Update billing information

**Example (JavaScript):**
```javascript
const response = await fetch('/api/subscriptions/portal', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  }
});

const { data } = await response.json();

// Redirect to Stripe Customer Portal
window.location.href = data.url;
```

---

### 4. Cancel Subscription

**Cancel at end of billing period**

```http
POST /api/subscriptions/cancel
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Too expensive" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Subscription will be canceled at the end of the current billing period"
}
```

**Note:** User retains access until period end date.

---

### 5. Reactivate Subscription

**Cancel the cancellation**

```http
POST /api/subscriptions/reactivate
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Subscription reactivated successfully"
}
```

---

## 🪝 Webhook Integration

### Local Development

**Terminal 1:** Run your server
```bash
npm run dev
```

**Terminal 2:** Forward webhooks
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook secret:
```
> Ready! Your webhook signing secret is whsec_...
```

Add this to your `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhook Endpoint

```http
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: t=...,v1=...

{Stripe Event JSON}
```

**Handled Events:**
- `checkout.session.completed` - Payment completed
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

**How it works:**
1. Stripe sends event to your endpoint
2. Signature is verified using webhook secret
3. Event is processed and database is updated
4. Response sent back to Stripe

---

## 🔒 Protecting Premium Features

### Middleware: requireActiveSubscription

Blocks access if user doesn't have active subscription:

```typescript
import { requireActiveSubscription } from '../middlewares/subscription';

router.post('/premium-feature',
  verifySupabaseToken,
  requireActiveSubscription,  // ← Add this
  handler
);
```

**Response if no subscription (403):**
```json
{
  "success": false,
  "message": "Active subscription required to access this feature",
  "code": "SUBSCRIPTION_REQUIRED"
}
```

### Middleware: checkSubscription

Non-blocking - adds subscription info to request:

```typescript
import { checkSubscription } from '../middlewares/subscription';

router.get('/feature',
  verifySupabaseToken,
  checkSubscription,  // Adds req.hasSubscription
  handler
);

// In handler:
if (req.hasSubscription) {
  // Premium behavior
} else {
  // Free tier behavior
}
```

### Middleware: requirePlan

Require specific plan level:

```typescript
import { requirePlan } from '../middlewares/subscription';

router.post('/enterprise-feature',
  verifySupabaseToken,
  requirePlan('Enterprise'),  // ← Only Enterprise plan
  handler
);

// Or multiple plans:
router.post('/advanced-feature',
  verifySupabaseToken,
  requirePlan('Premium', 'Enterprise'),
  handler
);
```

---

## 🧪 Testing

### Test with Stripe CLI

**Trigger webhook events:**
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

### Test Cards

**Successful payment:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

**Payment requires authentication:**
```
Card: 4000 0025 0000 3155
```

**Payment declined:**
```
Card: 4000 0000 0000 0002
```

### Test Checkout Flow

```powershell
# 1. Register/Login to get token
$token = "YOUR_SUPABASE_TOKEN"

# 2. Create checkout session
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/subscriptions/checkout" `
  -Method POST `
  -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} `
  -Body '{"priceId":"price_YOUR_PRICE_ID"}'

# 3. Open checkout URL
Start-Process $response.data.url

# 4. Complete payment with test card

# 5. Check subscription status
Invoke-RestMethod -Uri "http://localhost:3000/api/subscriptions/status" `
  -Headers @{"Authorization"="Bearer $token"}
```

---

## 🚀 Frontend Integration

### Complete Subscription Flow

```javascript
// Step 1: Check current subscription
async function checkSubscription() {
  const response = await fetch('/api/subscriptions/status', {
    headers: {
      'Authorization': `Bearer ${supabaseToken}`
    }
  });
  const { data } = await response.json();
  return data;
}

// Step 2: Show pricing plans
function showPricingPlans() {
  const plans = [
    {
      name: 'Basic',
      price: '$9.99/month',
      priceId: 'price_1ABC...',
      features: ['Feature 1', 'Feature 2']
    },
    {
      name: 'Premium',
      price: '$19.99/month',
      priceId: 'price_1XYZ...',
      features: ['Everything in Basic', 'Feature 3', 'Feature 4']
    }
  ];
  
  // Render plans with subscribe buttons
}

// Step 3: Subscribe
async function subscribe(priceId) {
  const response = await fetch('/api/subscriptions/checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ priceId })
  });
  
  const { data } = await response.json();
  
  // Redirect to Stripe Checkout
  window.location.href = data.url;
}

// Step 4: Handle success redirect
// On your success page:
async function handleSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (sessionId) {
    // Poll for subscription status (webhook may take a few seconds)
    setTimeout(async () => {
      const subscription = await checkSubscription();
      if (subscription.status === 'active') {
        showSuccessMessage();
      }
    }, 2000);
  }
}

// Step 5: Manage subscription
async function openCustomerPortal() {
  const response = await fetch('/api/subscriptions/portal', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const { data } = await response.json();
  window.location.href = data.url;
}
```

### React Example

```tsx
import { useState, useEffect } from 'react';

function SubscriptionManager() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    const response = await fetch('/api/subscriptions/status', {
      headers: {
        'Authorization': `Bearer ${supabaseToken}`
      }
    });
    const { data } = await response.json();
    setSubscription(data);
    setLoading(false);
  };

  const handleSubscribe = async (priceId) => {
    const response = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ priceId })
    });
    
    const { data } = await response.json();
    window.location.href = data.url;
  };

  const handleManageSubscription = async () => {
    const response = await fetch('/api/subscriptions/portal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const { data } = await response.json();
    window.location.href = data.url;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {subscription.status === 'active' ? (
        <div>
          <h2>Current Plan: {subscription.plan_name}</h2>
          <p>Status: {subscription.status}</p>
          <p>Renews: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          <button onClick={handleManageSubscription}>
            Manage Subscription
          </button>
        </div>
      ) : (
        <div>
          <h2>Choose a Plan</h2>
          <button onClick={() => handleSubscribe('price_basic')}>
            Subscribe to Basic - $9.99/month
          </button>
          <button onClick={() => handleSubscribe('price_premium')}>
            Subscribe to Premium - $19.99/month
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 🛠️ Troubleshooting

### Webhook Not Receiving Events

**Problem:** Webhooks not triggering locally

**Solution:**
```bash
# Make sure Stripe CLI is running
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Check server logs for webhook events
```

### Signature Verification Failed

**Problem:** `Webhook Error: No signatures found matching the expected signature`

**Causes:**
1. Wrong webhook secret in `.env`
2. Webhook route registered after `express.json()` (must be before!)
3. Body already parsed as JSON

**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` in `.env`
- Check `app.ts` - webhooks registered BEFORE body parser
- Webhook route uses `express.raw({ type: 'application/json' })`

### Checkout Session Not Creating Subscription

**Problem:** Payment succeeds but no subscription in database

**Causes:**
1. Webhook not configured
2. Webhook handler error
3. Missing user_id in metadata

**Solution:**
- Check server logs for webhook errors
- Verify `metadata.supabase_user_id` is set in checkout session
- Test with `stripe trigger checkout.session.completed`

### Subscription Status Not Updating

**Problem:** Status shows `inactive` even after payment

**Causes:**
1. Webhook event not processed
2. Database RLS policy blocking update

**Solution:**
- Check Stripe Dashboard → Webhooks → Event Log
- Verify service role policy exists in subscriptions table
- Check server logs for webhook processing

---

## 📊 Subscription Lifecycle

```
1. USER SUBSCRIBES
   ↓
2. Checkout session created
   ↓
3. User pays on Stripe Checkout
   ↓
4. checkout.session.completed webhook
   ↓
5. Backend creates/updates subscription record
   ↓
6. status = 'active'
   ↓
7. User can access premium features

BILLING CYCLE:
   ↓
8. invoice.payment_succeeded webhook (monthly)
   ↓
9. Subscription updated with new period dates

USER CANCELS:
   ↓
10. User clicks cancel in Customer Portal
   ↓
11. customer.subscription.updated webhook
   ↓
12. cancel_at_period_end = true
   ↓
13. User retains access until period end
   ↓
14. customer.subscription.deleted webhook at period end
   ↓
15. status = 'canceled'

PAYMENT FAILS:
   ↓
16. invoice.payment_failed webhook
   ↓
17. status = 'past_due'
   ↓
18. User has 3-day grace period
   ↓
19. If not resolved → status = 'canceled'
```

---

## 🔐 Security Best Practices

1. **Never expose secret keys in frontend**
   - Use environment variables
   - Only send to frontend: publishable key

2. **Always verify webhook signatures**
   - Already implemented in webhook handler
   - Never skip signature verification

3. **Use HTTPS in production**
   - Stripe requires HTTPS for webhooks
   - Use valid SSL certificate

4. **Validate user ownership**
   - Middleware checks user_id matches authenticated user
   - RLS policies enforce database-level security

5. **Handle edge cases**
   - Payment failures
   - Subscription cancellations
   - Trial periods
   - Grace periods

---

## 📈 Production Deployment

### Checklist

- [ ] Switch to production Stripe keys (starts with `pk_live_` and `sk_live_`)
- [ ] Configure production webhook endpoint (HTTPS)
- [ ] Test webhook delivery in production
- [ ] Set up monitoring for failed payments
- [ ] Configure Stripe email notifications
- [ ] Set up invoice reminders
- [ ] Configure subscription grace periods
- [ ] Test complete flow in production
- [ ] Monitor Stripe Dashboard for events
- [ ] Set up alerts for webhook failures

### Environment Variables (Production)

```env
# Production Stripe Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production Frontend
FRONTEND_URL=https://yourdomain.com
```

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

## 🎉 Summary

You now have a complete Stripe subscription system:

✅ **Checkout integration** - Accept payments  
✅ **Webhook handling** - Real-time updates  
✅ **Customer portal** - Self-service management  
✅ **Middleware protection** - Guard premium features  
✅ **Account-level subscriptions** - All profiles benefit  
✅ **Database integration** - Synced with Supabase  
✅ **Production ready** - Secure and tested  

**Next steps:**
1. Add your Stripe keys to `.env`
2. Run the database migration
3. Test the checkout flow
4. Implement frontend integration
5. Deploy to production!

