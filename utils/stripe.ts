/**
 * Stripe Client Configuration
 * 
 * Initializes the Stripe SDK with API credentials
 * and provides access to configured pricing plans
 */

import Stripe from 'stripe';

// Validate Stripe Secret Key exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set in environment variables');
  console.warn('   Stripe functionality will not work until this is configured');
}

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
  typescript: true,
  appInfo: {
    name: 'Le Petit Davinci API',
    version: '1.0.0',
  },
});

/**
 * Stripe Price IDs for different subscription plans
 * These should be configured in your .env file after creating
 * products and prices in the Stripe Dashboard
 */
export const STRIPE_PLANS = {
  BASIC: process.env.STRIPE_PRICE_BASIC || '',
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

/**
 * Validate Stripe configuration
 * Call this on app startup to ensure Stripe is properly configured
 */
export const validateStripeConfig = (): boolean => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Missing STRIPE_SECRET_KEY');
    return false;
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('⚠️  Missing STRIPE_WEBHOOK_SECRET - Webhooks will not work');
  }

  if (!STRIPE_PLANS.BASIC && !STRIPE_PLANS.PREMIUM) {
    console.warn('⚠️  No Stripe price IDs configured');
    console.warn('   Set STRIPE_PRICE_BASIC and STRIPE_PRICE_PREMIUM in .env');
  }

  return true;
};

/**
 * Get plan name from price ID
 */
export const getPlanName = (priceId: string): string | null => {
  if (priceId === STRIPE_PLANS.BASIC) return 'Basic';
  if (priceId === STRIPE_PLANS.PREMIUM) return 'Premium';
  if (priceId === STRIPE_PLANS.ENTERPRISE) return 'Enterprise';
  return null;
};

