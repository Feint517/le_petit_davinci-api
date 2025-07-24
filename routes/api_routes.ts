import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

console.log('API routes file loaded');

/**
 * Health check endpoint - Check if server is running
 * GET /api/ping
 */
router.get('/ping', (req: Request, res: Response): void => {
    console.log('Ping route hit!');
    res.status(200).json({
        success: true,
        message: 'Server is up and running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        node_version: process.version
    });
});

/**
 * Server status endpoint - Detailed server information
 * GET /api/status
 */
router.get('/status', (req: Request, res: Response): void => {
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
        success: true,
        server: {
            status: 'running',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            node_version: process.version,
            platform: process.platform,
            arch: process.arch
        },
        memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        }
    });
});

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
