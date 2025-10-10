/**
 * Subscription Service
 * 
 * Handles all Stripe subscription-related business logic
 * Including customer management, checkout sessions, webhooks, and subscription lifecycle
 */

import Stripe from 'stripe';
import { stripe, getPlanName } from '../utils/stripe';
import { Subscription, ISubscription } from '../models/subscription_model';

export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string | null;
  error?: string;
}

export interface PortalSessionResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface SubscriptionStatusResult {
  success: boolean;
  subscription?: ISubscription;
  error?: string;
}

/**
 * Helper function to create subscription data from Stripe subscription
 */
const buildSubscriptionData = (subscription: any): Partial<ISubscription> => {
  const priceId = subscription.items.data[0]?.price.id || null;
  
  return {
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status as any,
    plan_name: priceId ? getPlanName(priceId) || null : null,
    current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
  };
};

export class SubscriptionService {
  /**
   * Get or create Stripe customer for user
   */
  static async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      // Check if customer already exists in our database
      const existingSubscription = await Subscription.findByUserId(userId);

      if (existingSubscription?.stripe_customer_id) {
        return existingSubscription.stripe_customer_id;
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email,
        ...(name && { name }), // Only include name if it exists
        metadata: {
          supabase_user_id: userId,
        },
      });

      // Save customer ID in our database
      await Subscription.create({
        user_id: userId,
        stripe_customer_id: customer.id,
        status: 'inactive',
        cancel_at_period_end: false,
      });

      return customer.id;
    } catch (error) {
      console.error('Error getting or creating customer:', error);
      throw error;
    }
  }

  /**
   * Create Stripe Checkout Session for subscription
   */
  static async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    name?: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<CheckoutSessionResult> {
    try {
      // Get or create Stripe customer
      const customerId = await this.getOrCreateCustomer(userId, email, name);

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl || `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/subscription/canceled`,
        metadata: {
          supabase_user_id: userId,
        },
        subscription_data: {
          metadata: {
            supabase_user_id: userId,
          },
        },
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url || null,
      };
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      return {
        success: false,
        error: error.message || 'Failed to create checkout session',
      };
    }
  }

  /**
   * Create Stripe Customer Portal session
   * Allows users to manage their subscription, payment methods, etc.
   */
  static async createPortalSession(userId: string, returnUrl?: string): Promise<PortalSessionResult> {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (!subscription?.stripe_customer_id) {
        return {
          success: false,
          error: 'No subscription found',
        };
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/subscription`,
      });

      return {
        success: true,
        url: session.url,
      };
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      return {
        success: false,
        error: error.message || 'Failed to create portal session',
      };
    }
  }

  /**
   * Get subscription status for user
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusResult> {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (!subscription) {
        return {
          success: true,
          subscription: {
            user_id: userId,
            stripe_customer_id: '',
            status: 'inactive',
            cancel_at_period_end: false,
          } as ISubscription,
        };
      }

      return {
        success: true,
        subscription,
      };
    } catch (error: any) {
      console.error('Error getting subscription status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get subscription status',
      };
    }
  }

  /**
   * Cancel subscription at period end
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (!subscription?.stripe_subscription_id) {
        return {
          success: false,
          error: 'No active subscription found',
        };
      }

      // Cancel the subscription at period end in Stripe
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update our database
      await Subscription.update(userId, {
        cancel_at_period_end: true,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  static async reactivateSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await Subscription.findByUserId(userId);

      if (!subscription?.stripe_subscription_id) {
        return {
          success: false,
          error: 'No subscription found',
        };
      }

      // Reactivate in Stripe
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      // Update our database
      await Subscription.update(userId, {
        cancel_at_period_end: false,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      return {
        success: false,
        error: error.message || 'Failed to reactivate subscription',
      };
    }
  }

  // ============================================
  // WEBHOOK HANDLERS
  // ============================================

  /**
   * Handle checkout.session.completed webhook
   * Called when user completes payment
   */
  static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      console.log('Processing checkout.session.completed:', session.id);

      const userId = session.metadata?.supabase_user_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!userId) {
        console.error('No user ID in session metadata');
        return;
      }

      if (!subscriptionId) {
        console.error('No subscription ID in session');
        return;
      }

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Get or create subscription record
      const existingSubscription = await Subscription.findByUserId(userId);

      const subscriptionData = buildSubscriptionData(subscription);

      if (existingSubscription) {
        await Subscription.update(userId, subscriptionData);
      } else {
        await Subscription.create({
          user_id: userId,
          stripe_customer_id: customerId,
          ...subscriptionData,
        });
      }

      console.log('✅ Checkout completed processed for user:', userId);
    } catch (error) {
      console.error('Error handling checkout completed:', error);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.created webhook
   */
  static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log('Processing customer.subscription.created:', subscription.id);

      const userId = subscription.metadata?.supabase_user_id;
      const customerId = subscription.customer as string;

      if (!userId) {
        console.error('No user ID in subscription metadata');
        return;
      }

      const existingSubscription = await Subscription.findByUserId(userId);

      const subscriptionData = buildSubscriptionData(subscription);

      if (existingSubscription) {
        await Subscription.update(userId, subscriptionData);
      } else {
        await Subscription.create({
          user_id: userId,
          stripe_customer_id: customerId,
          ...subscriptionData,
        });
      }

      console.log('✅ Subscription created processed for user:', userId);
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.updated webhook
   */
  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log('Processing customer.subscription.updated:', subscription.id);

      const existingSubscription = await Subscription.findByStripeSubscriptionId(subscription.id);

      if (!existingSubscription) {
        console.error('No subscription found for Stripe subscription ID:', subscription.id);
        return;
      }

      const subscriptionData = buildSubscriptionData(subscription);
      await Subscription.updateByStripeSubscriptionId(subscription.id, subscriptionData);

      console.log('✅ Subscription updated processed:', subscription.id);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.deleted webhook
   */
  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log('Processing customer.subscription.deleted:', subscription.id);

      const existingSubscription = await Subscription.findByStripeSubscriptionId(subscription.id);

      if (!existingSubscription) {
        console.error('No subscription found for Stripe subscription ID:', subscription.id);
        return;
      }

      await Subscription.updateByStripeSubscriptionId(subscription.id, {
        status: 'canceled',
        cancel_at_period_end: false,
      });

      console.log('✅ Subscription deleted processed:', subscription.id);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Handle invoice.payment_succeeded webhook
   */
  static async handlePaymentSucceeded(invoice: any): Promise<void> {
    try {
      console.log('Processing invoice.payment_succeeded:', invoice.id);

      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

      if (!subscriptionId) {
        console.log('No subscription ID in invoice');
        return;
      }

      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update subscription status
      await this.handleSubscriptionUpdated(subscription as any);

      console.log('✅ Payment succeeded processed');
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  /**
   * Handle invoice.payment_failed webhook
   */
  static async handlePaymentFailed(invoice: any): Promise<void> {
    try {
      console.log('Processing invoice.payment_failed:', invoice.id);

      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

      if (!subscriptionId) {
        console.log('No subscription ID in invoice');
        return;
      }

      const existingSubscription = await Subscription.findByStripeSubscriptionId(subscriptionId);

      if (existingSubscription) {
        await Subscription.updateByStripeSubscriptionId(subscriptionId, {
          status: 'past_due',
        });
      }

      console.log('✅ Payment failed processed');
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }
}

