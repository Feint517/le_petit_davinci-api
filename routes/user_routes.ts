import express, { Router } from 'express';
import { verifyAccessToken } from '../middlewares/auth';
// import * as userController from '../controllers/user_controller';

const router: Router = express.Router();

// User data routes
// TODO: Uncomment when user controller is converted to TypeScript
// router.get('/fetch/:id', verifyAccessToken, userController.fetchUserData);

export default router;
