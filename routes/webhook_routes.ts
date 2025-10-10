/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from external services
 * These routes are NOT authenticated via tokens - they use signature verification
 * 
 * CRITICAL: These routes must be registered BEFORE express.json() middleware
 * because Stripe needs the raw request body to verify signatures
 */

import express from 'express';
import { handleStripeWebhook } from '../controllers/subscription_controller';

const router = express.Router();

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * 
 * Receives events from Stripe:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * 
 * Verification: Uses Stripe signature header and webhook secret
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;

