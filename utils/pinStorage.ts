/**
 * Enhanced PIN storage utility with improved security
 * In production, this should be replaced with Redis or database storage
 */

import crypto from 'crypto';

interface PinData {
    pin: string;
    userId: string;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    lockedUntil?: Date;
    createdAt: Date;
    lastAttempt?: Date;
}

interface PinConfig {
    expirationMinutes: number;
    maxAttempts: number;
    lockoutMinutes: number;
    length: number;
    allowAlphanumeric: boolean;
}

// In-memory storage (replace with Redis in production)
const pinStorage = new Map<string, PinData>();

// Default PIN configuration
const defaultConfig: PinConfig = {
    expirationMinutes: 10,
    maxAttempts: 3,
    lockoutMinutes: 5,
    length: 4,
    allowAlphanumeric: false
};

/**
 * Generate a cryptographically secure PIN
 */
export const generateSecurePin = (config: Partial<PinConfig> = {}): string => {
    const finalConfig = { ...defaultConfig, ...config };
    
    if (finalConfig.allowAlphanumeric) {
        // Generate alphanumeric PIN
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let pin = '';
        for (let i = 0; i < finalConfig.length; i++) {
            pin += chars[crypto.randomInt(0, chars.length)];
        }
        return pin;
    } else {
        // Generate numeric PIN
        const min = Math.pow(10, finalConfig.length - 1);
        const max = Math.pow(10, finalConfig.length) - 1;
        return crypto.randomInt(min, max + 1).toString();
    }
};

/**
 * Store PIN for a user with enhanced security
 */
export const storePin = (
    userId: string, 
    pin?: string, 
    config: Partial<PinConfig> = {}
): string => {
    const finalConfig = { ...defaultConfig, ...config };
    const pinToStore = pin || generateSecurePin(finalConfig);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + finalConfig.expirationMinutes);
    
    const pinData: PinData = {
        pin: pinToStore,
        userId,
        expiresAt,
        attempts: 0,
        maxAttempts: finalConfig.maxAttempts,
        createdAt: new Date()
    };
    
    pinStorage.set(userId, pinData);
    
    console.log(`PIN stored for user ${userId}, expires at ${expiresAt.toISOString()}`);
    return pinToStore;
};

/**
 * Validate PIN for a user with enhanced security
 */
export const validatePin = (userId: string, pin: string): {
    isValid: boolean;
    attemptsRemaining: number;
    lockedUntil?: Date;
    message: string;
} => {
    const pinData = pinStorage.get(userId);
    
    if (!pinData) {
        return {
            isValid: false,
            attemptsRemaining: 0,
            message: 'No PIN found for user'
        };
    }
    
    const now = new Date();
    
    // Check if PIN has expired
    if (now > pinData.expiresAt) {
        pinStorage.delete(userId);
        return {
            isValid: false,
            attemptsRemaining: 0,
            message: 'PIN has expired'
        };
    }
    
    // Check if PIN is locked
    if (pinData.lockedUntil && now < pinData.lockedUntil) {
        return {
            isValid: false,
            attemptsRemaining: 0,
            lockedUntil: pinData.lockedUntil,
            message: 'PIN is temporarily locked due to too many failed attempts'
        };
    }
    
    // Update attempt tracking
    pinData.attempts++;
    pinData.lastAttempt = now;
    
    // Validate PIN using constant-time comparison
    const isValid = crypto.timingSafeEqual(
        Buffer.from(pinData.pin, 'utf8'),
        Buffer.from(pin, 'utf8')
    );
    
    if (isValid) {
        // Remove PIN after successful validation
        pinStorage.delete(userId);
        console.log(`PIN validated successfully for user ${userId}`);
        return {
            isValid: true,
            attemptsRemaining: pinData.maxAttempts,
            message: 'PIN validated successfully'
        };
    } else {
        // Check if max attempts reached
        if (pinData.attempts >= pinData.maxAttempts) {
            pinData.lockedUntil = new Date(now.getTime() + defaultConfig.lockoutMinutes * 60 * 1000);
            console.log(`PIN locked for user ${userId} until ${pinData.lockedUntil.toISOString()}`);
        }
        
        pinStorage.set(userId, pinData);
        
        const attemptsRemaining = Math.max(0, pinData.maxAttempts - pinData.attempts);
        return {
            isValid: false,
            attemptsRemaining,
            ...(pinData.lockedUntil && { lockedUntil: pinData.lockedUntil }),
            message: `Invalid PIN. ${attemptsRemaining} attempts remaining.`
        };
    }
};

/**
 * Get stored PIN data (for debugging)
 */
export const getPinData = (userId: string): PinData | null => {
    const pinData = pinStorage.get(userId);
    return pinData || null;
};

/**
 * Clean up expired PINs
 */
export const cleanupExpiredPins = (): void => {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [userId, pinData] of pinStorage.entries()) {
        if (now > pinData.expiresAt) {
            pinStorage.delete(userId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired PIN entries`);
    }
};

/**
 * Get storage stats (for monitoring)
 */
export const getStorageStats = (): { 
    totalEntries: number; 
    expiredEntries: number; 
    lockedEntries: number;
    activeEntries: number;
} => {
    const now = new Date();
    let expiredCount = 0;
    let lockedCount = 0;
    let activeCount = 0;
    
    for (const pinData of pinStorage.values()) {
        if (now > pinData.expiresAt) {
            expiredCount++;
        } else if (pinData.lockedUntil && now < pinData.lockedUntil) {
            lockedCount++;
        } else {
            activeCount++;
        }
    }
    
    return {
        totalEntries: pinStorage.size,
        expiredEntries: expiredCount,
        lockedEntries: lockedCount,
        activeEntries: activeCount
    };
};

/**
 * Reset PIN attempts for a user (admin function)
 */
export const resetPinAttempts = (userId: string): boolean => {
    const pinData = pinStorage.get(userId);
    if (!pinData) {
        return false;
    }
    
    pinData.attempts = 0;
    delete pinData.lockedUntil;
    pinStorage.set(userId, pinData);
    
    console.log(`PIN attempts reset for user ${userId}`);
    return true;
};

/**
 * Extend PIN expiration time
 */
export const extendPinExpiration = (userId: string, additionalMinutes: number): boolean => {
    const pinData = pinStorage.get(userId);
    if (!pinData) {
        return false;
    }
    
    pinData.expiresAt = new Date(pinData.expiresAt.getTime() + additionalMinutes * 60 * 1000);
    pinStorage.set(userId, pinData);
    
    console.log(`PIN expiration extended for user ${userId} by ${additionalMinutes} minutes`);
    return true;
};

/**
 * Check if user has an active PIN
 */
export const hasActivePin = (userId: string): boolean => {
    const pinData = pinStorage.get(userId);
    if (!pinData) {
        return false;
    }
    
    const now = new Date();
    return now <= pinData.expiresAt && (!pinData.lockedUntil || now >= pinData.lockedUntil);
};

/**
 * Get PIN status for a user
 */
export const getPinStatus = (userId: string): {
    hasPin: boolean;
    isExpired: boolean;
    isLocked: boolean;
    attemptsRemaining: number;
    expiresAt?: Date;
    lockedUntil?: Date;
} => {
    const pinData = pinStorage.get(userId);
    if (!pinData) {
        return {
            hasPin: false,
            isExpired: false,
            isLocked: false,
            attemptsRemaining: 0
        };
    }
    
    const now = new Date();
    const isExpired = now > pinData.expiresAt;
    const isLocked = pinData.lockedUntil ? now < pinData.lockedUntil : false;
    const attemptsRemaining = Math.max(0, pinData.maxAttempts - pinData.attempts);
    
    return {
        hasPin: true,
        isExpired,
        isLocked,
        attemptsRemaining,
        expiresAt: pinData.expiresAt,
        ...(pinData.lockedUntil && { lockedUntil: pinData.lockedUntil })
    };
};
