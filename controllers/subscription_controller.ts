/**
 * Subscription Controller
 * 
 * Handles HTTP requests for subscription-related operations
 * and Stripe webhook events
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { SubscriptionService } from '../services/subscriptionService';
import { stripe } from '../utils/stripe';
import Stripe from 'stripe';

/**
 * Create Stripe Checkout Session
 * POST /api/subscriptions/checkout
 */
export const createCheckout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    const userId = req.userId;
    const user = req.user;

    if (!userId || !user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!priceId) {
      res.status(400).json({
        success: false,
        message: 'Price ID is required',
      });
      return;
    }

    // Get user email
    const email = user.email || '';
    
    // Get name from user metadata (Supabase user)
    let name: string | undefined;
    if ('user_metadata' in user && user.user_metadata) {
      const firstName = user.user_metadata.first_name || '';
      const lastName = user.user_metadata.last_name || '';
      name = `${firstName} ${lastName}`.trim() || undefined;
    }

    // Create checkout session
    const result = await SubscriptionService.createCheckoutSession(
      userId,
      email,
      priceId,
      name,
      successUrl,
      cancelUrl
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create checkout session',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId: result.sessionId,
        url: result.url,
      },
    });
  } catch (error: any) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get User's Subscription Status
 * GET /api/subscriptions/status
 */
export const getSubscriptionStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const result = await SubscriptionService.getSubscriptionStatus(userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to get subscription status',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.subscription,
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Create Customer Portal Session
 * POST /api/subscriptions/portal
 */
export const createPortalSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { returnUrl } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const result = await SubscriptionService.createPortalSession(userId, returnUrl);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create portal session',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        url: result.url,
      },
    });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Cancel Subscription
 * POST /api/subscriptions/cancel
 */
export const cancelSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const result = await SubscriptionService.cancelSubscription(userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to cancel subscription',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Reactivate Subscription
 * POST /api/subscriptions/reactivate
 */
export const reactivateSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const result = await SubscriptionService.reactivateSubscription(userId);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to reactivate subscription',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error: any) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Handle Stripe Webhooks
 * POST /api/webhooks/stripe
 * 
 * IMPORTANT: This endpoint must receive raw body (not JSON parsed)
 * The webhook route must use express.raw() middleware
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.error('No Stripe signature in headers');
    res.status(400).send('No Stripe signature');
    return;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature and construct event
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    console.log('Received Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await SubscriptionService.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await SubscriptionService.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await SubscriptionService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await SubscriptionService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await SubscriptionService.handlePaymentSucceeded(event.data.object as any);
        break;

      case 'invoice.payment_failed':
        await SubscriptionService.handlePaymentFailed(event.data.object as any);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      error: 'Webhook handler failed',
      message: error.message,
    });
  }
};

