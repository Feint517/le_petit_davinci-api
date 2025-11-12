import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import supabase from '../utils/init_supabase';
import { generateRandomPassword, generateRandomPin } from '../utils/helpers';
import { AuthenticatedRequest, SupabaseUser } from '../middlewares/auth';
// import { AuthenticatedRequest, Auth0User, getAuth0UserProfile } from '../middlewares/auth'; // DEPRECATED
import User, { IUser, Auth0UserData } from '../models/user_model'; // DEPRECATED - kept for backward compatibility
import Profile from '../models/profile_model';
import ProfileService from '../services/profileService';
import { storePin, validatePin as validateStoredPin } from '../utils/pinStorage';
import { CredentialValidationService, PinValidationService, SecurityMonitoringService, AccountRecoveryService } from '../services/authService';
import emailService from '../services/emailService';
import verificationService from '../services/verificationService';


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

// ========================
// SUPABASE AUTHENTICATION (PRIMARY)
// ========================

/**
 * User registration with Supabase Auth
 * Creates a new user account and sends verification email
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

    // Register user with Supabase Auth (using custom email verification)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
        // Note: We handle email verification manually via our verification service
      }
    });

    if (signUpError) {
      console.error('Supabase signup error:', signUpError);
      res.status(400).json({
        success: false,
        message: signUpError.message || 'Registration failed'
      });
      return;
    }

    if (!authData.user) {
      res.status(400).json({
        success: false,
        message: 'Registration failed - no user created'
      });
      return;
    }

    // Generate and store verification code
    const verificationCode = verificationService.storeCode(
      email,
      authData.user.id,
      firstName
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, firstName, verificationCode);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway - user can request resend
    }

    res.status(201).json({
      success: true,
      message: 'Compte créé! Vérifiez votre email pour activer votre compte.',
      data: {
        email: authData.user.email,
        requiresVerification: true
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
 * User login with Supabase Auth
 * Returns session and list of available profiles
 */
export const login = async (req: Request<{}, {}, LoginCredentials>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Get user's profiles
    const profilesResult = await ProfileService.getUserProfiles(data.user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata
        },
        profiles: profilesResult.profiles,
        profileCount: profilesResult.count
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Logout user from Supabase
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (token) {
      // Sign out from Supabase
      await supabase.auth.signOut();
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
 * Refresh Supabase session
 */
export const refreshTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // Refresh session with Supabase
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        session: data.session
      }
    });

  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ========================
// EMAIL VERIFICATION
// ========================

/**
 * Verify email with code
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
      return;
    }

    // Verify the code
    const result = verificationService.verifyCode(email, code);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Update email_confirmed_at in the database using our custom function
    const { error: confirmError } = await supabase.rpc('confirm_user_email', { 
      user_id: result.userId 
    });

    if (confirmError) {
      console.error('Error confirming email:', confirmError);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm email. Please try again.'
      });
      return;
    }

    console.log(`✅ Email confirmed for user ${result.userId}`);

    // User has been verified! Now log them in with their password
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: req.body.password || ''
    });

    if (loginError || !loginData.user) {
      console.error('Login error after verification:', loginError);
      res.status(400).json({
        success: false,
        message: 'Email verified but login failed: ' + (loginError?.message || 'Unknown error')
      });
      return;
    }

    // Get first name from user metadata
    const firstName = loginData.user.user_metadata?.first_name || 'User';

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, firstName);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès! Votre compte est maintenant actif.',
      data: {
        email: loginData.user.email,
        verified: true,
        session: loginData.session
      }
    });

  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Resend verification code
 */
export const resendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Check if there's a pending verification
    const storedData = verificationService.getStoredData(email);
    
    if (!storedData) {
      res.status(404).json({
        success: false,
        message: 'Aucune demande de vérification trouvée. Veuillez vous inscrire à nouveau.'
      });
      return;
    }

    // Resend code
    const result = verificationService.resendCode(email);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Send new verification email
    try {
      await emailService.sendVerificationEmail(email, storedData.firstName, result.code!);
      console.log(`✅ Verification code resent to ${email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send email'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Code de vérification renvoyé! Vérifiez votre email.'
    });

  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ========================
// GOOGLE OAUTH AUTHENTICATION
// ========================

/**
 * Initiate Google OAuth login
 * Returns the Google OAuth URL for the client to redirect to
 */
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'io.supabase.lepetitdavinci://login-callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      console.error('Google OAuth error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to initiate Google login'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        url: data.url,
        provider: 'google'
      }
    });

  } catch (error: any) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Handle OAuth callback after Google authentication
 * Exchange code for session and create/update user
 */
export const handleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
      return;
    }

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error('OAuth callback error:', error);
      res.status(400).json({
        success: false,
        message: error?.message || 'Failed to authenticate with Google'
      });
      return;
    }

    // Check if user has profiles
    const profilesResult = await ProfileService.getUserProfiles(data.user.id);

    // If no profiles exist, create a default one
    if (profilesResult.count === 0) {
      const userName = data.user.user_metadata?.full_name || 
                      data.user.user_metadata?.name || 
                      'My Profile';
      const defaultPin = '0000'; // User should change this

      await Profile.create(
        data.user.id,
        userName,
        defaultPin
      );

      // Fetch updated profiles
      const updatedProfiles = await ProfileService.getUserProfiles(data.user.id);
      profilesResult.profiles = updatedProfiles.profiles;
      profilesResult.count = updatedProfiles.count;
    }

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          picture: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          email_verified: data.user.email_confirmed_at !== null
        },
        profiles: profilesResult.profiles,
        profileCount: profilesResult.count
      }
    });

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// ========================
// PROFILE MANAGEMENT
// ========================

/**
 * Get all profiles for authenticated user
 */
export const getProfiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const result = await ProfileService.getUserProfiles(req.userId);

    res.status(200).json({
      success: true,
      data: {
        profiles: result.profiles,
        count: result.count
      }
    });

  } catch (error: any) {
    console.error('Get profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create a new profile
 */
export const createProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { profile_name, pin, avatar } = req.body;

    const result = await ProfileService.createProfile(
      req.userId,
      profile_name,
      pin,
      avatar
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        profile: result.profile
      }
    });

  } catch (error: any) {
    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validate profile PIN and get profile token
 */
export const validateProfilePin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { profile_id, pin } = req.body;

    const result = await ProfileService.validateProfilePin(
      req.userId,
      profile_id,
      pin
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
      message: result.message,
      data: {
        profileToken: result.profileToken,
        profile: result.profile
      }
    });

  } catch (error: any) {
    console.error('Validate profile PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update profile
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

    const { profileId } = req.params;
    
    if (!profileId) {
      res.status(400).json({
        success: false,
        message: 'Profile ID is required'
      });
      return;
    }

    const updates = req.body;

    const result = await ProfileService.updateProfile(
      req.userId,
      profileId,
      updates
    );

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
      data: {
        profile: result.profile
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
 * Delete profile
 */
export const deleteProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const { profileId } = req.params;
    
    if (!profileId) {
      res.status(400).json({
        success: false,
        message: 'Profile ID is required'
      });
      return;
    }

    const result = await ProfileService.deleteProfile(req.userId, profileId);

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
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

 

 
 
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
// ACCOUNT RECOVERY (KEPT - WORKS WITH SUPABASE)
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
