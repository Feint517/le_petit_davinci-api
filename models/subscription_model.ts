/**
 * Subscription Model
 * 
 * Manages subscription data in Supabase
 * One subscription per user account (not per profile)
 */

import supabase from '../utils/init_supabase';

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
  /**
   * Find subscription by user ID
   */
  static async findByUserId(userId: string): Promise<ISubscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          return null;
        }
        throw error;
      }

      return data as ISubscription;
    } catch (error) {
      console.error('Error finding subscription by user ID:', error);
      throw error;
    }
  }

  /**
   * Find subscription by Stripe customer ID
   */
  static async findByStripeCustomerId(customerId: string): Promise<ISubscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as ISubscription;
    } catch (error) {
      console.error('Error finding subscription by Stripe customer ID:', error);
      throw error;
    }
  }

  /**
   * Find subscription by Stripe subscription ID
   */
  static async findByStripeSubscriptionId(subscriptionId: string): Promise<ISubscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as ISubscription;
    } catch (error) {
      console.error('Error finding subscription by Stripe subscription ID:', error);
      throw error;
    }
  }

  /**
   * Create new subscription record
   */
  static async create(data: Partial<ISubscription>): Promise<ISubscription> {
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      return subscription as ISubscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription by user ID
   */
  static async update(userId: string, updates: Partial<ISubscription>): Promise<ISubscription> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as ISubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription by Stripe subscription ID
   */
  static async updateByStripeSubscriptionId(
    subscriptionId: string,
    updates: Partial<ISubscription>
  ): Promise<ISubscription> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('stripe_subscription_id', subscriptionId)
        .select()
        .single();

      if (error) throw error;

      return data as ISubscription;
    } catch (error) {
      console.error('Error updating subscription by Stripe subscription ID:', error);
      throw error;
    }
  }

  /**
   * Delete subscription by user ID
   */
  static async delete(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
  }

  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.findByUserId(userId);

      if (!subscription) return false;

      // Check if subscription is active or trialing
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        return true;
      }

      // Check if subscription is past_due but still within grace period
      if (subscription.status === 'past_due' && subscription.current_period_end) {
        const periodEnd = new Date(subscription.current_period_end);
        const now = new Date();
        
        // Allow 3 days grace period after period end
        const gracePeriodEnd = new Date(periodEnd);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
        
        if (now < gracePeriodEnd) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking active subscription:', error);
      return false;
    }
  }

  /**
   * Get all active subscriptions (admin use)
   */
  static async getAllActive(): Promise<ISubscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .in('status', ['active', 'trialing']);

      if (error) throw error;

      return data as ISubscription[];
    } catch (error) {
      console.error('Error getting all active subscriptions:', error);
      throw error;
    }
  }
}

