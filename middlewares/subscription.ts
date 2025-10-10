/**
 * Subscription Middleware
 * 
 * Middleware to check if user has an active subscription
 * Use this to protect premium features and routes
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Subscription } from '../models/subscription_model';

/**
 * Middleware to require active subscription
 * 
 * Usage:
 * router.post('/premium-feature', verifySupabaseToken, requireActiveSubscription, handler);
 * 
 * This will return 403 if user doesn't have an active subscription
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
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check if user has active subscription
    const hasActive = await Subscription.hasActiveSubscription(userId);

    if (!hasActive) {
      res.status(403).json({
        success: false,
        message: 'Active subscription required to access this feature',
        code: 'SUBSCRIPTION_REQUIRED',
      });
      return;
    }

    // User has active subscription, proceed
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription status',
      code: 'SUBSCRIPTION_CHECK_FAILED',
    });
  }
};

/**
 * Optional subscription check
 * 
 * Doesn't block the request, but adds subscription info to request object
 * Useful for features that have different behavior for subscribers
 * 
 * Usage:
 * router.get('/feature', verifySupabaseToken, checkSubscription, handler);
 * 
 * Access subscription status via: req.hasSubscription
 */
export const checkSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (userId) {
      const hasActive = await Subscription.hasActiveSubscription(userId);
      (req as any).hasSubscription = hasActive;

      // Optionally attach full subscription details
      if (hasActive) {
        const subscription = await Subscription.findByUserId(userId);
        (req as any).subscription = subscription;
      }
    } else {
      (req as any).hasSubscription = false;
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    // Don't block the request on error, just continue without subscription info
    (req as any).hasSubscription = false;
    next();
  }
};

/**
 * Require specific plan
 * 
 * Checks if user has a subscription to a specific plan level
 * 
 * Usage:
 * router.post('/enterprise-feature', verifySupabaseToken, requirePlan('Enterprise'), handler);
 */
export const requirePlan = (...allowedPlans: string[]) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const subscription = await Subscription.findByUserId(userId);

      if (!subscription || !subscription.plan_name) {
        res.status(403).json({
          success: false,
          message: 'Subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
        });
        return;
      }

      if (!allowedPlans.includes(subscription.plan_name)) {
        res.status(403).json({
          success: false,
          message: `This feature requires ${allowedPlans.join(' or ')} plan`,
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlans: allowedPlans,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Plan check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify plan',
        code: 'PLAN_CHECK_FAILED',
      });
    }
  };
};

