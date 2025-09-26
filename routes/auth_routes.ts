import express, { Router } from 'express';
import * as authController from '../controllers/authentication_controller';
import { verifyAccessToken, verifyAuth0Token } from '../middlewares/auth';

const router: Router = express.Router();

// ========================
// LEGACY AUTHENTICATION (backward compatibility)
// ========================

// User registration
router.post('/register', authController.register);

// Login process - Multi-step authentication
// Step 1: Validate email and password
router.post('/validate-credentials', authController.validateCredentials);

// Step 2: Validate PIN codes
router.post('/validate-pins', authController.validatePins);

// Step 3: Validate GeoLocation
router.post('/validate-location', authController.validateGeoLocation);

// Authentication management
router.post('/logout', authController.logout);
router.post('/check-refresh-token', authController.checkRefreshToken);
router.post('/refresh-tokens', authController.refreshTokensFixed);

// Protected routes (require legacy authentication)
router.put('/change-password', verifyAccessToken, authController.changePassword);

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
