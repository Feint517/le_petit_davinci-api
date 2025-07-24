import jwt from 'jsonwebtoken';

/**
 * Signs an access token for a user
 * @param userId - The user ID to include in the token payload
 * @returns The signed JWT access token
 * @throws Error if ACCESS_TOKEN_SECRET is not configured
 */
export const signAccessToken = (userId: string): string => {
    const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
    
    if (!secret) {
        throw new Error('ACCESS_TOKEN_SECRET environment variable is not configured');
    }
    
    return jwt.sign({ userId }, secret, { expiresIn: '1h' });
};

/**
 * Signs a refresh token for a user
 * @param userId - The user ID to include in the token payload
 * @returns The signed JWT refresh token
 * @throws Error if REFRESH_TOKEN_SECRET is not configured
 */
export const signRefreshToken = (userId: string): string => {
    const secret: string | undefined = process.env.REFRESH_TOKEN_SECRET;
    
    if (!secret) {
        throw new Error('REFRESH_TOKEN_SECRET environment variable is not configured');
    }
    
    return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

/**
 * Verifies an access token
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid or ACCESS_TOKEN_SECRET is not configured
 */
export const verifyAccessToken = (token: string): jwt.JwtPayload => {
    const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
    
    if (!secret) {
        throw new Error('ACCESS_TOKEN_SECRET environment variable is not configured');
    }
    
    return jwt.verify(token, secret) as jwt.JwtPayload;
};

/**
 * Verifies a refresh token
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid or REFRESH_TOKEN_SECRET is not configured
 */
export const verifyRefreshToken = (token: string): jwt.JwtPayload => {
    const secret: string | undefined = process.env.REFRESH_TOKEN_SECRET;
    
    if (!secret) {
        throw new Error('REFRESH_TOKEN_SECRET environment variable is not configured');
    }
    
    return jwt.verify(token, secret) as jwt.JwtPayload;
};

/**
 * JWT payload interface for type safety
 */
export interface TokenPayload extends jwt.JwtPayload {
    userId: string;
}

/**
 * Decodes a JWT token without verification (useful for extracting expired token data)
 * @param token - The JWT token to decode
 * @returns The decoded token payload or null if invalid
 */
export const decodeToken = (token: string): TokenPayload | null => {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch {
        return null;
    }
};
