import jwt, { JwtPayload } from 'jsonwebtoken';
import createError from 'http-errors';
import { Request, Response, NextFunction } from 'express';
// import User from '../models/user_model';

// Extend Request interface to include userId
interface AuthenticatedRequest extends Request {
    userId?: string;
}

// Define the JWT payload structure
interface TokenPayload extends JwtPayload {
    userId?: string;
    id?: string;
    email?: string;
}

/**
 * Middleware to verify JWT access tokens
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
export const verifyAccessToken = async (
    req: AuthenticatedRequest, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        //* Get the token from the Authorization header
        const authHeader: string | undefined = req.headers['authorization'];
        if (!authHeader) {
            throw createError.Unauthorized('Access token is required');
        }

        const tokenParts: string[] = authHeader.split(' ');
        const token: string | undefined = tokenParts[1]; //? Extract token after "Bearer"
        if (!token) {
            throw createError.Unauthorized('Access token is required');
        }

        //* Verify the token with JWT
        const accessTokenSecret: string = process.env.ACCESS_TOKEN_SECRET as string;
        if (!accessTokenSecret) {
            throw createError.InternalServerError('JWT secret not configured');
        }

        const payload = jwt.verify(token, accessTokenSecret) as TokenPayload;
        console.log('Decoded Payload:', payload);

        // TODO: Uncomment when User model is converted to TypeScript
        // Find the user in the database (DO NOT check `user.accessToken`)
        // const user = await User.findById(payload.userId || payload.id).select('-password');
        // if (!user) {
        //     console.log('No user found for ID:', payload.userId || payload.id);
        //     throw createError.Unauthorized('User not found');
        // }

        //* For now, just use the payload data (remove this when User model is ready)
        const userId: string = payload.userId || payload.id || '';
        if (!userId) {
            throw createError.Unauthorized('Invalid token payload');
        }

        //* Attach userId to the request for route access
        req.userId = userId;
        console.log("User ID attached to req:", req.userId);

        next(); //? Token is valid, proceed to the next middleware or route handler
    } catch (err: any) {
        //* Handle invalid token errors
        if (err.name === 'JsonWebTokenError') {
            return next(createError.Unauthorized('Invalid token'));
        }
        if (err.name === 'TokenExpiredError') {
            return next(createError.Unauthorized('Token has expired'));
        }
        
        //* Handle other errors
        if (err.status) {
            return next(err); //? Pass through HTTP errors
        }
        
        next(createError.Unauthorized('Unauthorized access'));
    }
};

// Export the authenticated request interface for use in other files
export type { AuthenticatedRequest };
