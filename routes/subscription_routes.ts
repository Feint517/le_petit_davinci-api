/**
 * Subscription Routes
 * 
 * All subscription management endpoints
 * Requires Supabase authentication
 */

import express from 'express';
import { verifySupabaseToken } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import * as subscriptionController from '../controllers/subscription_controller';

const router = express.Router();

/**
 * Create Stripe Checkout Session
 * POST /api/subscriptions/checkout
 * 
 * Body: { priceId: string, successUrl?: string, cancelUrl?: string }
 */
router.post(
  '/checkout',
  verifySupabaseToken,
  subscriptionController.createCheckout
);

/**
 * Get Subscription Status
 * GET /api/subscriptions/status
 */
router.get(
  '/status',
  verifySupabaseToken,
  subscriptionController.getSubscriptionStatus
);

/**
 * Create Customer Portal Session
 * POST /api/subscriptions/portal
 * 
 * Body: { returnUrl?: string }
 */
router.post(
  '/portal',
  verifySupabaseToken,
  subscriptionController.createPortalSession
);

/**
 * Cancel Subscription
 * POST /api/subscriptions/cancel
 * 
 * Cancels subscription at the end of the current billing period
 */
router.post(
  '/cancel',
  verifySupabaseToken,
  subscriptionController.cancelSubscription
);

/**
 * Reactivate Subscription
 * POST /api/subscriptions/reactivate
 * 
 * Reactivates a subscription that was set to cancel
 */
router.post(
  '/reactivate',
  verifySupabaseToken,
  subscriptionController.reactivateSubscription
);

export default router;

