import express, { Router } from 'express';
import * as authController from '../controllers/authentication_controller';
import { verifyAccessToken } from '../middlewares/auth';

const router: Router = express.Router();

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

// Protected routes (require authentication)
router.put('/change-password', verifyAccessToken, authController.changePassword);

export default router;
