import express, { Router } from 'express';
import { verifySupabaseToken } from '../middlewares/auth';
// import { verifyAccessToken } from '../middlewares/auth'; // DEPRECATED
// import * as userController from '../controllers/user_controller';

const router: Router = express.Router();

// User data routes
// TODO: Uncomment when user controller is converted to TypeScript
// router.get('/fetch/:id', verifySupabaseToken, userController.fetchUserData);

export default router;
