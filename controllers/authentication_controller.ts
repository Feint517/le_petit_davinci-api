import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { generateRandomPassword, generateRandomPin } from '../utils/helpers';
import { AuthenticatedRequest, Auth0User, getAuth0UserProfile } from '../middlewares/auth';
import User, { IUser, Auth0UserData } from '../models/user_model';
import { storePin, validatePin as validateStoredPin } from '../utils/pinStorage';
import { CredentialValidationService, PinValidationService, SecurityMonitoringService, AccountRecoveryService } from '../services/authService';


// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface PinValidation {
  userId: string;
  pin: string;
}

interface LocationValidation {
  userId: string;
  latitude: number;
  longitude: number;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

/**
 * User registration
 */
export const register = async (req: Request<{}, {}, RegisterBody>, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Create new user
    const newUserData: IUser = {
      email,
      password: password, // Will be hashed by the User model
      firstName,
      lastName,
      auth0Id: `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique legacy ID
      isActive: true
    };

    const newUser = new User(newUserData);
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isActive: newUser.isActive
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 1: Validate email and password credentials (Enhanced)
 */
export const validateCredentials = async (req: Request<{}, {}, LoginCredentials>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Get client information for security monitoring
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Use enhanced credential validation service
    const result = await CredentialValidationService.validateCredentials(
      email, 
      password, 
      ip, 
      userAgent
    );

    if (!result.success) {
      res.status(401).json({
        success: false,
        message: result.message
      });
      return;
    }

    // TODO: Send PIN via email/SMS
    // await sendPin(email, result.pin);

    // For now, return PIN in response (remove in production)
    console.log(`Generated PIN for user ${result.userId}: ${result.pin}`);

    res.status(200).json({
      success: true,
      message: 'Credentials validated. PIN sent.',
      data: {
        userId: result.userId,
        step: 'pin-validation',
        // Remove this in production - only for testing
        debugPin: result.pin
      }
    });

  } catch (error: any) {
    console.error('Credential validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 2: Validate PIN codes (Enhanced)
 */
export const validatePin = async (req: Request<{}, {}, PinValidation>, res: Response): Promise<void> => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      res.status(400).json({
        success: false,
        message: 'User ID and PIN are required'
      });
      return;
    }

    // Get client information for security monitoring
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Use enhanced PIN validation service
    const result = await PinValidationService.validatePin(
      userId, 
      pin, 
      ip, 
      userAgent
    );

    if (!result.success) {
      res.status(401).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'PIN validated successfully.',
      data: {
        userId,
        step: 'location-validation'
      }
    });

  } catch (error: any) {
    console.error('PIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 3: Validate geolocation and complete login
 */
export const validateGeoLocation = async (req: Request<{}, {}, LocationValidation>, res: Response): Promise<void> => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      res.status(400).json({
        success: false,
        message: 'User ID and location coordinates are required'
      });
      return;
    }

    // Basic location validation (accept any valid coordinates for now)
    // In production, you might want to:
    // - Check if location is within allowed radius of user's registered location
    // - Validate against known safe locations
    // - Check for suspicious location changes
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
      return;
    }

    // For now, accept any valid coordinates
    // TODO: Implement proper location validation logic
    console.log(`Location validation for user ${userId}: lat=${latitude}, lng=${longitude}`);

    // Get user data for token generation
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate tokens
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;

    if (!accessTokenSecret || !refreshTokenSecret) {
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    const accessToken = jwt.sign(
      { userId, email: user.email },
      accessTokenSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId },
      refreshTokenSecret,
      { expiresIn: '7d' }
    );

    // Store refresh token in database
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 days from now

    user.refreshToken = refreshToken;
    user.refreshTokenExpiresAt = refreshTokenExpiresAt;
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive
        }
      }
    });

  } catch (error: any) {
    console.error('Location validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // Remove refresh token from database
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as { userId: string };
      const user = await User.findById(decoded.userId);
      
      if (user && user.refreshToken === refreshToken) {
        user.refreshToken = undefined;
        user.refreshTokenExpiresAt = undefined;
        await user.save();
      }
    } catch (error) {
      // Token might be invalid, but we still want to return success
      console.log('Invalid refresh token during logout:', error);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check if refresh token is valid
 */
export const checkRefreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;

    try {
      const decoded = jwt.verify(refreshToken, refreshTokenSecret) as { userId: string };
      
      // Check if token exists in database
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
        return;
      }

      // Check if token has expired
      if (user.refreshTokenExpiresAt && new Date() > user.refreshTokenExpiresAt) {
        res.status(401).json({
          success: false,
          message: 'Refresh token has expired'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Refresh token is valid',
        data: { userId: decoded.userId }
      });

    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

  } catch (error: any) {
    console.error('Check refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Refresh access and refresh tokens
 */
export const refreshTokensFixed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;

    try {
      const decoded = jwt.verify(refreshToken, refreshTokenSecret) as { userId: string };

      // Verify token exists in database and get user info
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
        return;
      }

      // Check if token has expired
      if (user.refreshTokenExpiresAt && new Date() > user.refreshTokenExpiresAt) {
        res.status(401).json({
          success: false,
          message: 'Refresh token has expired'
        });
        return;
      }

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: decoded.userId, email: user.email },
        accessTokenSecret,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { userId: decoded.userId },
        refreshTokenSecret,
        { expiresIn: '7d' }
      );

      // Update refresh token in database
      const newRefreshTokenExpiresAt = new Date();
      newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + 7);

      user.refreshToken = newRefreshToken;
      user.refreshTokenExpiresAt = newRefreshTokenExpiresAt;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

  } catch (error: any) {
    console.error('Refresh tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Change user password (protected route)
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await user.isValidPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }

    // Update password
    user.password = newPassword;  // Will be hashed by pre-save middleware
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ========================
// AUTH0 CONTROLLERS
// ========================

/**
 * Auth0 callback handler - processes Auth0 user after successful authentication
 */
export const auth0Callback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
      return;
    }

    // Find or create user in our database
    const user = await User.findOrCreateFromAuth0(req.user as Auth0UserData);

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: user._id,
          auth0Id: user.auth0Id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          picture: user.auth0Data?.picture,
          emailVerified: user.auth0Data?.email_verified,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error: any) {
    console.error('Auth0 callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get current user profile (protected route)
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Find user by Auth0 ID
    const user = await User.findOne({ auth0Id: req.userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          auth0Id: user.auth0Id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          picture: user.auth0Data?.picture,
          emailVerified: user.auth0Data?.email_verified,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update user profile (protected route)
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { firstName, lastName } = req.body;

    // Find user by Auth0 ID
    const user = await User.findOne({ auth0Id: req.userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          auth0Id: user.auth0Id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          picture: user.auth0Data?.picture,
          emailVerified: user.auth0Data?.email_verified,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Sync user data from Auth0 Management API (protected route)
 */
export const syncAuth0Profile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get fresh user data from Auth0
    const auth0User = await getAuth0UserProfile(req.userId);
    if (!auth0User) {
      res.status(404).json({
        success: false,
        message: 'Auth0 user not found'
      });
      return;
    }

    // Find local user
    const user = await User.findOne({ auth0Id: req.userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Local user not found'
      });
      return;
    }

    // Sync data
    user.syncFromAuth0(auth0User as Auth0UserData);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile synced successfully',
      data: {
        user: {
          id: user._id,
          auth0Id: user.auth0Id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          picture: user.auth0Data?.picture,
          emailVerified: user.auth0Data?.email_verified,
          lastLogin: user.lastLogin,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error: any) {
    console.error('Sync Auth0 profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete user account (protected route)
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Find user by Auth0 ID
    const user = await User.findOne({ auth0Id: req.userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Soft delete - just mark as inactive
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ========================
// SECURITY MONITORING
// ========================

/**
 * Get security events for current user (protected route)
 */
export const getSecurityEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const hours = parseInt(req.query.hours as string) || 24;
    const events = SecurityMonitoringService.getSecurityEvents(req.userId, hours);

    res.status(200).json({
      success: true,
      data: {
        events,
        period: `${hours} hours`,
        count: events.length
      }
    });

  } catch (error: any) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


/**
 * Clean up expired security data (admin only - for now, just protected)
 */
export const cleanupSecurityData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    SecurityMonitoringService.cleanup();

    res.status(200).json({
      success: true,
      message: 'Security data cleanup completed'
    });

  } catch (error: any) {
    console.error('Cleanup security data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


// ========================
// ACCOUNT RECOVERY
// ========================

/**
 * Request account unlock
 */
export const requestAccountUnlock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Get client information for security monitoring
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await AccountRecoveryService.requestAccountUnlock(email, ip, userAgent);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      // Remove debugUnlockCode in production
      ...(result.unlockCode && { debugUnlockCode: result.unlockCode })
    });

  } catch (error: any) {
    console.error('Request account unlock error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Unlock account with code
 */
export const unlockAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, unlockCode } = req.body;

    if (!email || !unlockCode) {
      res.status(400).json({
        success: false,
        message: 'Email and unlock code are required'
      });
      return;
    }

    // Get client information for security monitoring
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');

    const result = await AccountRecoveryService.unlockAccount(email, unlockCode, ip, userAgent);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    console.error('Unlock account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
