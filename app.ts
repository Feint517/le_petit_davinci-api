import express, { Application, Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
import cors from 'cors';
import createError from 'http-errors';
import authRoutes from './routes/auth_routes';
import userRoutes from './routes/user_routes';
import apiRoutes from './routes/api_routes';
import subscriptionRoutes from './routes/subscription_routes';
import webhookRoutes from './routes/webhook_routes';
// import teamRoutes from './routes/teams_routes';
// import projectRoutes from './routes/projects_routes';
import { verifySupabaseToken } from './middlewares/auth';
// import { verifyAccessToken, verifyAuth0Token } from './middlewares/auth'; // DEPRECATED
// import { cleanupExpiredTokens } from './cron/cleanupTokens';
// import './cron/changeSecrets';

//* Load environment variables
config();

//* Initialize Supabase connection
import './utils/init_supabase';

//* Validate Stripe configuration
import { validateStripeConfig } from './utils/stripe';
validateStripeConfig();

//* Initialize Express app
const app: Application = express();

//* CORS Configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/10\.0\.2\.2(:\d+)?$/,  // Android emulator
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https:\/\/lepetitdavinci-api\.vercel\.app$/
    ];
    
    const allowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (allowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

//* Apply CORS middleware
app.use(cors(corsOptions));

//* IMPORTANT: Register webhook routes BEFORE body parser
//* Webhooks need raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

//* Middleware - Body parser for JSON
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
console.log('Registering Subscription routes...');
app.use('/api/subscriptions', subscriptionRoutes);

// Test route directly on app
app.get('/test', (req: Request, res: Response): void => {
    console.log('Test route hit!');
    res.json({ message: 'Test route working!' });
});

// Protected root route with Supabase
app.get('/', verifySupabaseToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as any;
    res.json({
        success: true,
        message: 'Hello from Le Petit Davinci API with Supabase',
        user: {
            id: authReq.userId,
            email: authReq.user?.email
        },
        timestamp: new Date().toISOString()
    });
});

// DEPRECATED: Auth0 protected route (kept for reference)
/* app.get('/auth0', verifyAuth0Token, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
}); */

// DEPRECATED: Legacy protected route (for backward compatibility)
/* app.get('/legacy', verifyAccessToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.json({
        success: true,
        message: 'Hello from Le Petit Davinci API (Legacy)',
        user: (req as any).userId
    });
}); */

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
