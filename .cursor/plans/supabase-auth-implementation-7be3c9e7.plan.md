<!-- 7be3c9e7-6940-4a17-b54b-f6141f332fc1 2d5ffff3-03a9-4062-9605-947fd3c694c9 -->
# Stripe Subscription Implementation Plan

## Overview

Integrate Stripe subscriptions into the existing Supabase + multi-profile authentication system. Each **account** (not profile) will have a subscription that grants access to all profiles under that account.

## Key Architecture Decisions

**Subscription Level: Account-based**

- Subscription is tied to the Supabase user account (not individual profiles)
- All profiles under a subscribed account get access
- This matches Netflix's model: one subscription, multiple profiles

**Database Structure:**

- New `subscriptions` table in Supabase
- Links to `auth.users` (user_id)
- Stores Stripe customer_id, subscription_id, status, plan details

## Required Stripe Setup

### 1. Stripe Dashboard Configuration

**Create Products & Pricing:**

- Go to Stripe Dashboard → Products
- Create subscription tiers (e.g., Basic, Premium, Enterprise)
- Set pricing (monthly/yearly)
- Note down the `price_id` for each plan

**Get API Keys:**

- Dashboard → Developers → API Keys
- Copy Publishable Key (starts with `pk_`)
- Copy Secret Key (starts with `sk_`)

**Set Up Webhook Endpoint:**

- Dashboard → Developers → Webhooks
- Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
- Select events to listen for:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `checkout.session.completed`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `customer.subscription.created`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `customer.subscription.updated`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `customer.subscription.deleted`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `invoice.payment_succeeded`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                - `invoice.payment_failed`
- Copy the Webhook Secret (starts with `whsec_`)

### 2. Local Development Setup

**Install Stripe CLI:**

```bash
# Windows (via Chocolatey)
choco install stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

**Forward Webhooks to Localhost:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This generates a local webhook secret for testing.

## Database Changes

### Create Subscriptions Table

File: `sql/create-subscriptions-table.sql`

```sql
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',
  -- Status: active, past_due, canceled, incomplete, trialing
  plan_name VARCHAR(100),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only backend can insert/update via service role
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');
```

## Code Implementation

### 3. Install Stripe SDK

```bash
npm install stripe
npm install --save-dev @types/stripe
```

### 4. Environment Variables

Add to `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Dashboard)
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PREMIUM=price_...

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

### 5. Create Stripe Client

File: `utils/stripe.ts` (NEW)

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

export const STRIPE_PLANS = {
  BASIC: process.env.STRIPE_PRICE_BASIC || '',
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || '',
};
```

### 6. Create Subscription Model

File: `models/subscription_model.ts` (NEW)

```typescript
import { supabase } from '../utils/init_supabase';

export interface ISubscription {
  id?: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'inactive';
  plan_name?: string | null;
  current_period_start?: Date | null;
  current_period_end?: Date | null;
  cancel_at_period_end: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class Subscription {
  // Find by user_id
  static async findByUserId(userId: string): Promise<ISubscription | null>

  // Find by Stripe customer ID
  static async findByStripeCustomerId(customerId: string): Promise<ISubscription | null>

  // Create new subscription record
  static async create(data: Partial<ISubscription>): Promise<ISubscription>

  // Update subscription
  static async update(userId: string, updates: Partial<ISubscription>): Promise<ISubscription>

  // Check if user has active subscription
  static async hasActiveSubscription(userId: string): Promise<boolean>
}
```

### 7. Create Subscription Service

File: `services/subscriptionService.ts` (NEW)

```typescript
import { stripe, STRIPE_PLANS } from '../utils/stripe';
import { Subscription } from '../models/subscription_model';

export class SubscriptionService {
  /**
   * Create Stripe customer or get existing
   */
  static async getOrCreateCustomer(userId: string, email: string): Promise<string>

  /**
   * Create checkout session for new subscription
   */
  static async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string
  ): Promise<{ sessionId: string; url: string }>

  /**
   * Create customer portal session (manage subscription)
   */
  static async createPortalSession(userId: string): Promise<{ url: string }>

  /**
   * Handle webhook: checkout.session.completed
   */
  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void>

  /**
   * Handle webhook: customer.subscription.updated
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void>

  /**
   * Handle webhook: customer.subscription.deleted
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void>

  /**
   * Get subscription status for user
   */
  static async getSubscriptionStatus(userId: string): Promise<ISubscription | null>

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(userId: string): Promise<void>
}
```

### 8. Create Subscription Controller

File: `controllers/subscription_controller.ts` (NEW)

```typescript
import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Create Stripe checkout session
 * POST /api/subscriptions/checkout
 */
export const createCheckout = async (req: AuthenticatedRequest, res: Response): Promise<void>

/**
 * Get user's subscription status
 * GET /api/subscriptions/status
 */
export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void>

/**
 * Create customer portal session
 * POST /api/subscriptions/portal
 */
export const createPortalSession = async (req: AuthenticatedRequest, res: Response): Promise<void>

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
export const cancelSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void>

/**
 * Handle Stripe webhooks
 * POST /api/webhooks/stripe
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void>
```

### 9. Create Subscription Routes

File: `routes/subscription_routes.ts` (NEW)

```typescript
import express from 'express';
import { verifySupabaseToken } from '../middlewares/auth';
import * as subscriptionController from '../controllers/subscription_controller';

const router = express.Router();

// Protected routes (require Supabase auth)
router.post('/checkout', verifySupabaseToken, subscriptionController.createCheckout);
router.get('/status', verifySupabaseToken, subscriptionController.getSubscriptionStatus);
router.post('/portal', verifySupabaseToken, subscriptionController.createPortalSession);
router.post('/cancel', verifySupabaseToken, subscriptionController.cancelSubscription);

export default router;
```

File: `routes/webhook_routes.ts` (NEW)

```typescript
import express from 'express';
import { handleStripeWebhook } from '../controllers/subscription_controller';

const router = express.Router();

// Webhook endpoint (no auth - verified via Stripe signature)
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
```

### 10. Update Main App

File: `app.ts`

```typescript
// Import webhook routes BEFORE body parser
import webhookRoutes from './routes/webhook_routes';

// Register webhook routes BEFORE express.json()
app.use('/api/webhooks', webhookRoutes);

// Then register body parser
app.use(express.json());

// Register other routes
import subscriptionRoutes from './routes/subscription_routes';
app.use('/api/subscriptions', subscriptionRoutes);
```

**Important:** Webhook route must be registered BEFORE `express.json()` because Stripe needs the raw body to verify signatures.

### 11. Add Subscription Validation Schemas

File: `middlewares/validation.ts`

```typescript
export const subscriptionSchemas = {
  createCheckout: Joi.object({
    priceId: Joi.string().required(),
    successUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional()
  }),
  cancelSubscription: Joi.object({
    reason: Joi.string().max(500).optional()
  })
};
```

### 12. Add Subscription Middleware

File: `middlewares/subscription.ts` (NEW)

```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Subscription } from '../models/subscription_model';

/**
 * Middleware to check if user has active subscription
 */
export const requireActiveSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const hasActive = await Subscription.hasActiveSubscription(userId);

    if (!hasActive) {
      res.status(403).json({
        success: false,
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription'
    });
  }
};
```

### 13. Protect Routes with Subscription Check

Update routes that require subscription (example):

```typescript
// Example: Protect profile creation if you want only subscribed users to create multiple profiles
router.post('/profiles',
  verifySupabaseToken,
  requireActiveSubscription,  // NEW
  validate(profileSchemas.create),
  authController.createProfile
);
```

## API Endpoints

### Subscription Management

**1. Create Checkout Session**

```
POST /api/subscriptions/checkout
Authorization: Bearer {supabase_token}
Body: { "priceId": "price_..." }
Response: { "sessionId": "...", "url": "https://checkout.stripe.com/..." }
```

**2. Get Subscription Status**

```
GET /api/subscriptions/status
Authorization: Bearer {supabase_token}
Response: { "status": "active", "plan": "Premium", ... }
```

**3. Create Portal Session**

```
POST /api/subscriptions/portal
Authorization: Bearer {supabase_token}
Response: { "url": "https://billing.stripe.com/..." }
```

**4. Cancel Subscription**

```
POST /api/subscriptions/cancel
Authorization: Bearer {supabase_token}
Body: { "reason": "optional reason" }
Response: { "success": true, "cancelAtPeriodEnd": true }
```

**5. Webhook Handler**

```
POST /api/webhooks/stripe
Headers: stripe-signature
Body: (raw Stripe event)
```

## Testing Strategy

### 1. Local Testing Setup

```bash
# Terminal 1: Run your server
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 2. Test Checkout Flow

```bash
# Get checkout URL
curl -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_YOUR_PRICE_ID"}'
```

Use Stripe test card: `4242 4242 4242 4242`

### 3. Test Webhook Events

```bash
# Trigger test events via Stripe CLI
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### 4. Test Files

Create `tests/test-stripe-subscription.js`:

```javascript
// Test complete subscription flow
// 1. Create checkout session
// 2. Simulate webhook events
// 3. Check subscription status
// 4. Test protected routes
// 5. Cancel subscription
```

## Frontend Integration Notes

**Checkout Flow:**

```javascript
// 1. Call your backend to create checkout session
const response = await fetch('/api/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ priceId: 'price_...' })
});

const { url } = await response.json();

// 2. Redirect to Stripe Checkout
window.location.href = url;
```

**Manage Subscription:**

```javascript
// Open Stripe Customer Portal
const response = await fetch('/api/subscriptions/portal', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${supabaseToken}` }
});

const { url } = await response.json();
window.location.href = url;
```

## Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures
2. **Raw Body for Webhooks**: Webhook endpoint must receive raw body
3. **Service Role for Database**: Use Supabase service role key for webhook operations
4. **Environment Variables**: Never expose secret keys in frontend
5. **HTTPS in Production**: Webhooks require HTTPS endpoint

## Deployment Checklist

- [ ] Set up Stripe products and pricing in Dashboard
- [ ] Get production API keys
- [ ] Configure production webhook endpoint
- [ ] Update environment variables with production keys
- [ ] Test webhook delivery in production
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications for subscription events

## Integration Points

**With Existing Auth:**

- Subscription tied to Supabase `auth.users`
- Check subscription status in profile operations
- All profiles under account share subscription benefits

**Database Relations:**

```
auth.users (Supabase)
    ↓ (one-to-one)
subscriptions
    ↓ (one-to-many)
profiles
```

**Token Flow:**

```
1. User registers/logs in → Supabase token
2. User creates checkout → Backend verifies token
3. User completes payment → Webhook updates DB
4. User accesses features → Middleware checks subscription
```

### To-dos

- [ ] Duplicate - Create SQL migration for profiles table in Supabase with RLS policies