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

// Google OAuth
router.post('/google', authController.googleLogin);
router.get('/callback', authController.handleOAuthCallback);

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

// ========================
// LEGACY AUTHENTICATION (DEPRECATED - COMMENTED OUT)
// ========================

/*
// User registration
router.post('/register-legacy', validate(authSchemas.register), authController.registerLegacy);

// Login process - Multi-step authentication
// Step 1: Validate email and password
router.post('/validate-credentials', validate(authSchemas.login), authController.validateCredentials);

// Step 2: Validate PIN
router.post('/validate-pin', validate(authSchemas.validatePin), authController.validatePin);

// Step 3: Validate GeoLocation
router.post('/validate-location', validate(authSchemas.validateLocation), authController.validateGeoLocation);

// Authentication management
router.post('/logout-legacy', validate(authSchemas.refreshToken), authController.logoutLegacy);
router.post('/check-refresh-token', validate(authSchemas.refreshToken), authController.checkRefreshToken);
router.post('/refresh-tokens-legacy', validate(authSchemas.refreshToken), authController.refreshTokensFixed);

// Protected routes (require legacy authentication)
router.put('/change-password', verifyAccessToken, validate(authSchemas.changePassword), authController.changePassword);
*/

// ========================
// AUTH0 AUTHENTICATION (DEPRECATED - COMMENTED OUT)
// ========================

/*
// Auth0 callback handler (processes Auth0 user after authentication)
router.post('/auth0/callback', verifyAuth0Token, authController.auth0Callback);

// User profile management (Auth0 protected routes)
router.get('/profile-auth0', verifyAuth0Token, authController.getProfileAuth0);
router.put('/profile-auth0', verifyAuth0Token, authController.updateProfileAuth0);
router.post('/profile/sync', verifyAuth0Token, authController.syncAuth0Profile);

// Account management
router.delete('/account-auth0', verifyAuth0Token, authController.deleteAccountAuth0);
*/

// ========================
// PUBLIC ROUTES
// ========================

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
