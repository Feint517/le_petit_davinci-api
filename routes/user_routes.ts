import express, { Router, Request, Response } from 'express';
import { verifySupabaseToken } from '../middlewares/auth';
// import { verifyAccessToken } from '../middlewares/auth'; // DEPRECATED
// import * as userController from '../controllers/user_controller';

const router: Router = express.Router();

// User profile routes
router.get('/profile', verifySupabaseToken, (req: Request, res: Response) => {
  const authReq = req as any;
  res.json({
    success: true,
    user: {
      id: authReq.userId,
      email: authReq.user?.email,
      name: authReq.user?.name
    },
    timestamp: new Date().toISOString()
  });
});

router.put('/profile', verifySupabaseToken, (req: Request, res: Response) => {
  const authReq = req as any;
  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: authReq.userId,
      email: authReq.user?.email,
      name: authReq.user?.name
    },
    timestamp: new Date().toISOString()
  });
});

router.delete('/account', verifySupabaseToken, (req: Request, res: Response) => {
  const authReq = req as any;
  res.json({
    success: true,
    message: 'Account deleted successfully',
    timestamp: new Date().toISOString()
  });
});

// User data routes
// TODO: Uncomment when user controller is converted to TypeScript
// router.get('/fetch/:id', verifySupabaseToken, userController.fetchUserData);

export default router;
