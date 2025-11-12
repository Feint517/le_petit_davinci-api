import express, { Router } from 'express';
import * as authController from '../controllers/authentication_controller';
import { verifySupabaseToken, verifyAccountAndProfile } from '../middlewares/auth';
// import { verifyAccessToken, verifyAuth0Token } from '../middlewares/auth'; // DEPRECATED
import { validate, authSchemas, profileSchemas } from '../middlewares/validation';

const router: Router = express.Router();

// ========================
// SUPABASE AUTHENTICATION (PRIMARY)
// ========================

// Account management
router.post('/register', validate(authSchemas.register), authController.register);
router.post('/login', validate(authSchemas.login), authController.login);
router.post('/logout', verifySupabaseToken, authController.logout);
router.post('/refresh-tokens', authController.refreshTokens);

// Email verification
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationCode);

// Google OAuth
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.handleOAuthCallback);

// ========================
// PROFILE MANAGEMENT
// ========================

// Profile routes (require Supabase account authentication)
router.get('/profiles', verifySupabaseToken, authController.getProfiles);
router.post('/profiles', verifySupabaseToken, validate(profileSchemas.create), authController.createProfile);
router.post('/profiles/validate-pin', verifySupabaseToken, validate(profileSchemas.validatePin), authController.validateProfilePin);
router.put('/profiles/:profileId', verifyAccountAndProfile, validate(profileSchemas.update), authController.updateProfile);
router.delete('/profiles/:profileId', verifyAccountAndProfile, authController.deleteProfile);

// ========================
// SECURITY MONITORING
// ========================

// Security monitoring routes (Supabase protected)
router.get('/security/events', verifyAccountAndProfile, authController.getSecurityEvents);
router.post('/security/cleanup', verifyAccountAndProfile, authController.cleanupSecurityData);

// ========================
// ACCOUNT RECOVERY
// ========================

// Account recovery routes (public)
router.post('/request-unlock', validate(authSchemas.requestUnlock), authController.requestAccountUnlock);
router.post('/unlock-account', validate(authSchemas.unlockAccount), authController.unlockAccount);

 
// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication service is healthy',
    timestamp: new Date().toISOString(),
    auth0Configured: !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE)
  });
});


export default router;
