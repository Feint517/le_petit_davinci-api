import express, { Application, Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
import createError from 'http-errors';
import authRoutes from './routes/auth_routes';
import userRoutes from './routes/user_routes';
import apiRoutes from './routes/api_routes';
// import teamRoutes from './routes/teams_routes';
// import projectRoutes from './routes/projects_routes';
import { verifyAccessToken, verifyAuth0Token } from './middlewares/auth';
// import { cleanupExpiredTokens } from './cron/cleanupTokens';
// import './cron/changeSecrets';

//* Load environment variables
config();

//* Initialize Supabase connection
import './utils/init_supabase';

//* Initialize Express app
const app: Application = express();

//* Middleware
app.use(express.json());

// Simple test route FIRST
app.get('/simple-test', (req: Request, res: Response): void => {
    console.log('Simple test route hit!');
    res.json({ message: 'Simple test working!' });
});

//* Routes
console.log('Registering API routes...');
app.use('/api', apiRoutes);
console.log('Registering Auth routes...');
app.use('/auth', authRoutes);
console.log('Registering User routes...');
app.use('/user', userRoutes);

// Test route directly on app
app.get('/test', (req: Request, res: Response): void => {
    console.log('Test route hit!');
    res.json({ message: 'Test route working!' });
});

// Protected root route with Auth0
app.get('/', verifyAuth0Token, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as any;
    res.json({
        success: true,
        message: 'Hello from Le Petit Davinci API with Auth0',
        user: {
            id: authReq.userId,
            email: authReq.user?.email,
            name: authReq.user?.name
        },
        timestamp: new Date().toISOString()
    });
});

// Legacy protected route (for backward compatibility)
app.get('/legacy', verifyAccessToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.json({
        success: true,
        message: 'Hello from Le Petit Davinci API (Legacy)',
        user: (req as any).userId
    });
});

//* 404 handler - route not found
app.use(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    next(createError.NotFound('This route does not exist'));
});

// Error handling middleware
interface CustomError extends Error {
    status?: number;
}

app.use((err: CustomError, req: Request, res: Response, next: NextFunction): void => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    
    console.error(`Error ${status}: ${message}`);
    
    res.status(status).json({
        error: {
            status,
            message
        }
    });
});

//* Server configuration
const PORT: number = parseInt(process.env.PORT as string) || 3000;

const server = app.listen(PORT, (): void => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

//* Graceful shutdown handling
process.on('SIGTERM', (): void => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close((): void => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', (): void => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close((): void => {
        console.log('Process terminated');
        process.exit(0);
    });
});

export default app;
