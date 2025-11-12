import jwt, { JwtPayload } from 'jsonwebtoken';
import createError from 'http-errors';
import { Request, Response, NextFunction } from 'express';
import jwksClient from 'jwks-rsa';
import axios from 'axios';
import supabase from '../utils/init_supabase';
import { verifyProfileToken as verifyProfileJWT, ProfileTokenPayload } from '../utils/jwtUtils';
import Profile from '../models/profile_model';

// Extend Request interface to include Auth0 user data and Supabase data
interface AuthenticatedRequest extends Request {
    userId?: string;
    user?: Auth0User | SupabaseUser;
    auth?: {
        sub: string;
        aud: string | string[];
        iat: number;
        exp: number;
        azp?: string | undefined;
        scope?: string | undefined;
    };
    profile?: {
        id: string;
        name: string;
        userId: string;
    };
}

// Supabase User interface
interface SupabaseUser {
    id: string;
    email?: string | undefined;
    user_metadata?: any;
    app_metadata?: any;
}

// Auth0 User interface
interface Auth0User {
    sub: string;
    email?: string | undefined;
    name?: string | undefined;
    picture?: string | undefined;
    email_verified?: boolean | undefined;
    nickname?: string | undefined;
    given_name?: string | undefined;
    family_name?: string | undefined;
}

// Define the JWT payload structure for Auth0
interface Auth0TokenPayload extends JwtPayload {
    sub: string;
    aud: string | string[];
    iat: number;
    exp: number;
    azp?: string;
    scope?: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
    nickname?: string;
    given_name?: string;
    family_name?: string;
}

// Create JWKS client for Auth0
const client = jwksClient({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    requestHeaders: {},
    timeout: 30000,
});

/**
 * Get signing key from Auth0 JWKS
 */
const getKey = (header: any, callback: any) => {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            console.error('Error getting signing key:', err);
            return callback(err);
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
};

// ========================
// SUPABASE AUTHENTICATION (PRIMARY)
// ========================

/**
 * Middleware to verify Supabase JWT tokens (account-level authentication)
 * Verifies the Supabase auth token and attaches user info to the request
 */
export const verifySupabaseToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader: string | undefined = req.headers['authorization'];
        if (!authHeader) {
            throw createError.Unauthorized('Access token is required');
        }

        const tokenParts: string[] = authHeader.split(' ');
        const token: string | undefined = tokenParts[1];
        if (!token) {
            throw createError.Unauthorized('Access token is required');
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            throw createError.Unauthorized('Invalid or expired token');
        }

        // Attach user info to request
        req.userId = user.id;
        req.user = {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
        };

        next();
    } catch (err: any) {
        console.error('Supabase token verification error:', err);

        if (err.status) {
            return next(err);
        }

        next(createError.Unauthorized('Unauthorized access'));
    }
};

/**
 * Middleware to verify profile JWT token (profile-level authentication)
 * Verifies the custom profile token and ensures profile belongs to authenticated user
 * Should be used after verifySupabaseToken
 */
export const verifyProfileTokenMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Check if user is already authenticated
        if (!req.userId) {
            throw createError.Unauthorized('User authentication required');
        }

        // Get profile token from header (X-Profile-Token) or query param
        const profileToken = req.headers['x-profile-token'] as string || req.query.profileToken as string;
        
        if (!profileToken) {
            throw createError.Unauthorized('Profile token is required');
        }

        // Verify profile token
        const decoded: ProfileTokenPayload = verifyProfileJWT(profileToken);

        // Verify the profile belongs to the authenticated user
        if (decoded.userId !== req.userId) {
            throw createError.Forbidden('Profile does not belong to authenticated user');
        }

        // Verify profile exists and is active
        const profile = await Profile.findByIdAndUserId(decoded.profileId, req.userId);
        if (!profile) {
            throw createError.NotFound('Profile not found or inactive');
        }

        // Attach profile info to request
        req.profile = {
            id: decoded.profileId,
            name: decoded.profileName,
            userId: decoded.userId
        };

        next();
    } catch (err: any) {
        console.error('Profile token verification error:', err);

        if (err.name === 'JsonWebTokenError') {
            return next(createError.Unauthorized('Invalid profile token'));
        }
        if (err.name === 'TokenExpiredError') {
            return next(createError.Unauthorized('Profile token has expired'));
        }

        if (err.status) {
            return next(err);
        }

        next(createError.Unauthorized('Profile authentication failed'));
    }
};

/**
 * Combined middleware for routes requiring both account and profile authentication
 */
export const verifyAccountAndProfile = [verifySupabaseToken, verifyProfileTokenMiddleware];

  

// Export types and interfaces
export type { AuthenticatedRequest, Auth0User, Auth0TokenPayload, SupabaseUser };
