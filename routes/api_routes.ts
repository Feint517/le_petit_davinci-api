import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

console.log('API routes file loaded');

 
/**
 * API health endpoint - Simple health check
 * GET /api/health
 */
router.get('/health', (req: Request, res: Response): void => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

export default router;
