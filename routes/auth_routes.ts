import express, { Router } from 'express';
import * as authController from '../controllers/authentication_controller';
import { verifyAccessToken, verifyAuth0Token } from '../middlewares/auth';
import { validate, authSchemas } from '../middlewares/validation';

const router: Router = express.Router();

// ========================
// LEGACY AUTHENTICATION (backward compatibility)
// ========================

// User registration
router.post('/register', validate(authSchemas.register), authController.register);

// Login process - Multi-step authentication
// Step 1: Validate email and password
router.post('/validate-credentials', validate(authSchemas.login), authController.validateCredentials);

// Step 2: Validate PIN
router.post('/validate-pin', validate(authSchemas.validatePin), authController.validatePin);

// Step 3: Validate GeoLocation
router.post('/validate-location', validate(authSchemas.validateLocation), authController.validateGeoLocation);

// Authentication management
router.post('/logout', validate(authSchemas.refreshToken), authController.logout);
router.post('/check-refresh-token', validate(authSchemas.refreshToken), authController.checkRefreshToken);
router.post('/refresh-tokens', validate(authSchemas.refreshToken), authController.refreshTokensFixed);

// Protected routes (require legacy authentication)
router.put('/change-password', verifyAccessToken, validate(authSchemas.changePassword), authController.changePassword);

// ========================
// AUTH0 AUTHENTICATION
// ========================

// Auth0 callback handler (processes Auth0 user after authentication)
router.post('/auth0/callback', verifyAuth0Token, authController.auth0Callback);

// User profile management (Auth0 protected routes)
router.get('/profile', verifyAuth0Token, authController.getProfile);
router.put('/profile', verifyAuth0Token, authController.updateProfile);
router.post('/profile/sync', verifyAuth0Token, authController.syncAuth0Profile);

// Account management
router.delete('/account', verifyAuth0Token, authController.deleteAccount);

// ========================
// SECURITY MONITORING
// ========================

// Security monitoring routes (Auth0 protected)
router.get('/security/events', verifyAuth0Token, authController.getSecurityEvents);
router.post('/security/cleanup', verifyAuth0Token, authController.cleanupSecurityData);

// ========================
// ACCOUNT RECOVERY
// ========================

// Account recovery routes (public)
router.post('/request-unlock', validate(authSchemas.requestUnlock), authController.requestAccountUnlock);
router.post('/unlock-account', validate(authSchemas.unlockAccount), authController.unlockAccount);

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
