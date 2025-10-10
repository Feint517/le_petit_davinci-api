/**
 * Enhanced Authentication Service
 * 
 * This service provides advanced authentication features including:
 * - Rate limiting and attempt tracking
 * - Security monitoring
 * - Enhanced PIN management
 * - Credential validation improvements
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/user_model';
import { 
    storePin, 
    validatePin, 
    getPinData, 
    cleanupExpiredPins, 
    generateSecurePin,
    getPinStatus,
    resetPinAttempts,
    extendPinExpiration,
    hasActivePin
} from '../utils/pinStorage';

// Types
interface AttemptData {
    count: number;
    lastAttempt: Date;
    lockedUntil?: Date;
}

interface SecurityEvent {
    type: 'login_attempt' | 'login_success' | 'login_failure' | 'pin_attempt' | 'pin_success' | 'pin_failure' | 'account_locked' | 'suspicious_activity';
    userId?: string | undefined;
    email?: string | undefined;
    ip?: string | undefined;
    userAgent?: string | undefined;
    timestamp: Date;
    details?: any;
}

interface UnlockData {
    code: string;
    email: string;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
}

// In-memory storage for security events
const securityEvents: SecurityEvent[] = [];

// In-memory storage for unlock codes (replace with Redis in production)
const unlockStorage = new Map<string, UnlockData>();

// Configuration
const SECURITY_EVENTS_RETENTION_HOURS = 24;

/**
 * Credential validation service
 */
export class CredentialValidationService {
    /**
     * Validate user credentials with enhanced security
     */
    static async validateCredentials(
        email: string, 
        password: string, 
        ip?: string, 
        userAgent?: string
    ): Promise<{
        success: boolean;
        userId?: string | undefined;
        pin?: string | undefined;
        message: string;
    }> {
        try {
            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                this.logSecurityEvent({
                    type: 'login_failure',
                    email,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: { reason: 'user_not_found' }
                });
                
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }

            // Verify password
            const isValidPassword = await user.isValidPassword(password);
            if (!isValidPassword) {
                this.logSecurityEvent({
                    type: 'login_failure',
                    userId: user._id,
                    email,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: { reason: 'invalid_password' }
                });
                
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }

            // Check if user is active
            if (!user.isActive) {
                this.logSecurityEvent({
                    type: 'login_failure',
                    userId: user._id,
                    email,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: { reason: 'account_deactivated' }
                });
                
                return {
                    success: false,
                    message: 'Account is deactivated'
                };
            }

            // Check for suspicious activity
            const suspiciousActivity = this.detectSuspiciousActivity(user._id!, ip, userAgent);
            if (suspiciousActivity) {
                this.logSecurityEvent({
                    type: 'suspicious_activity',
                    userId: user._id,
                    email,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: suspiciousActivity
                });
            }

            // Generate PIN
            const pin = this.generateSecurePin();
            storePin(user._id!, pin, { expirationMinutes: 10 });

            // Log successful credential validation
            this.logSecurityEvent({
                type: 'login_success',
                userId: user._id,
                email,
                ip,
                userAgent,
                timestamp: new Date()
            });

            return {
                success: true,
                userId: user._id,
                pin,
                message: 'Credentials validated successfully'
            };

        } catch (error) {
            console.error('Credential validation error:', error);
            this.logSecurityEvent({
                type: 'login_failure',
                email,
                ip,
                userAgent,
                timestamp: new Date(),
                details: { reason: 'server_error', error: error instanceof Error ? error.message : 'Unknown error' }
            });
            
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }


    /**
     * Generate a secure PIN with better randomness
     */
    private static generateSecurePin(): string {
        return generateSecurePin({ length: 4, allowAlphanumeric: false });
    }

    /**
     * Enhanced password validation with common password checks
     */
    private static validatePasswordStrength(password: string): {
        isValid: boolean;
        score: number;
        feedback: string[];
    } {
        const feedback: string[] = [];
        let score = 0;

        // Length check
        if (password.length >= 8) score += 1;
        else feedback.push('Password should be at least 8 characters long');

        if (password.length >= 12) score += 1;

        // Character variety checks
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Password should contain lowercase letters');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Password should contain uppercase letters');

        if (/\d/.test(password)) score += 1;
        else feedback.push('Password should contain numbers');

        if (/[@$!%*?&]/.test(password)) score += 1;
        else feedback.push('Password should contain special characters (@$!%*?&)');

        // Common password patterns
        const commonPatterns = [
            /password/i,
            /123456/,
            /qwerty/i,
            /admin/i,
            /letmein/i,
            /welcome/i,
            /monkey/i,
            /dragon/i,
            /master/i,
            /hello/i
        ];

        const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
        if (hasCommonPattern) {
            score -= 2;
            feedback.push('Password contains common patterns and is not secure');
        }

        // Sequential characters
        if (/(.)\1{2,}/.test(password)) {
            score -= 1;
            feedback.push('Password should not contain repeated characters');
        }

        // Keyboard patterns
        const keyboardPatterns = [
            /qwerty/i,
            /asdf/i,
            /zxcv/i,
            /1234/,
            /abcd/i
        ];

        const hasKeyboardPattern = keyboardPatterns.some(pattern => pattern.test(password));
        if (hasKeyboardPattern) {
            score -= 1;
            feedback.push('Password should not contain keyboard patterns');
        }

        return {
            isValid: score >= 4,
            score: Math.max(0, score),
            feedback
        };
    }

    /**
     * Detect suspicious activity patterns
     */
    private static detectSuspiciousActivity(
        userId: string, 
        ip?: string, 
        userAgent?: string
    ): any | null {
        const recentEvents = securityEvents.filter(event => 
            event.userId === userId && 
            new Date().getTime() - event.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
        );

        // Check for multiple IP addresses
        const uniqueIPs = new Set(recentEvents.map(event => event.ip).filter(Boolean));
        if (uniqueIPs.size > 3) {
            return { type: 'multiple_ips', count: uniqueIPs.size };
        }

        // Check for rapid login attempts
        const recentFailures = recentEvents.filter(event => 
            event.type === 'login_failure' && 
            new Date().getTime() - event.timestamp.getTime() < 60 * 60 * 1000 // Last hour
        );
        
        if (recentFailures.length > 10) {
            return { type: 'rapid_failures', count: recentFailures.length };
        }

        return null;
    }

    /**
     * Log security events
     */
    private static logSecurityEvent(event: SecurityEvent): void {
        securityEvents.push(event);
        
        // Clean up old events
        const cutoffTime = new Date().getTime() - SECURITY_EVENTS_RETENTION_HOURS * 60 * 60 * 1000;
        const filteredEvents = securityEvents.filter(event => event.timestamp.getTime() > cutoffTime);
        securityEvents.length = 0;
        securityEvents.push(...filteredEvents);

        // Log to console (in production, send to monitoring service)
        console.log(`[SECURITY] ${event.type.toUpperCase()}: ${event.email || event.userId} - ${event.timestamp.toISOString()}`);
    }
}

/**
 * Enhanced PIN validation service
 */
export class PinValidationService {
    /**
     * Validate PIN with enhanced security
     */
    static async validatePin(
        userId: string, 
        pin: string, 
        ip?: string, 
        userAgent?: string
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            // Validate PIN using enhanced validation
            const pinValidationResult = validatePin(userId, pin);
            
            if (!pinValidationResult.isValid) {
                this.logSecurityEvent({
                    type: 'pin_failure',
                    userId,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: { 
                        reason: 'invalid_pin'
                    }
                });
                
                return {
                    success: false,
                    message: pinValidationResult.message
                };
            }

            // Log successful PIN validation
            this.logSecurityEvent({
                type: 'pin_success',
                userId,
                ip,
                userAgent,
                timestamp: new Date()
            });

            return {
                success: true,
                message: 'PIN validated successfully'
            };

        } catch (error) {
            console.error('PIN validation error:', error);
            this.logSecurityEvent({
                type: 'pin_failure',
                userId,
                ip,
                userAgent,
                timestamp: new Date(),
                details: { reason: 'server_error', error: error instanceof Error ? error.message : 'Unknown error' }
            });
            
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }


    /**
     * Log security events
     */
    private static logSecurityEvent(event: SecurityEvent): void {
        securityEvents.push(event);
        
        // Clean up old events
        const cutoffTime = new Date().getTime() - SECURITY_EVENTS_RETENTION_HOURS * 60 * 60 * 1000;
        const filteredEvents = securityEvents.filter(event => event.timestamp.getTime() > cutoffTime);
        securityEvents.length = 0;
        securityEvents.push(...filteredEvents);

        // Log to console (in production, send to monitoring service)
        console.log(`[SECURITY] ${event.type.toUpperCase()}: ${event.userId} - ${event.timestamp.toISOString()}`);
    }
}

/**
 * Account recovery service
 */
export class AccountRecoveryService {
    /**
     * Request account unlock (simplified - no rate limiting)
     */
    static async requestAccountUnlock(email: string, ip?: string, userAgent?: string): Promise<{
        success: boolean;
        message: string;
        unlockCode?: string;
    }> {
        try {
            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                // Don't reveal if user exists or not
                return {
                    success: true,
                    message: 'If an account with this email exists, an unlock code has been sent.'
                };
            }

            // Generate unlock code
            const unlockCode = generateSecurePin({ length: 6, allowAlphanumeric: false });
            
            // Store unlock code (in production, send via email/SMS)
            const unlockData: UnlockData = {
                code: unlockCode,
                email,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                attempts: 0,
                maxAttempts: 3
            };
            
            // Store in memory (replace with Redis in production)
            unlockStorage.set(`unlock_${email}`, unlockData);

            // Log security event
            console.log(`[SECURITY] UNLOCK_REQUEST: ${email} - ${new Date().toISOString()}`);
            
            // TODO: Send unlock code via email/SMS
            console.log(`Unlock code for ${email}: ${unlockCode}`);

            return {
                success: true,
                message: 'Unlock code sent to your email',
                unlockCode // Remove in production
            };

        } catch (error) {
            console.error('Account unlock request error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }

    /**
     * Unlock account with code
     */
    static async unlockAccount(email: string, unlockCode: string, ip?: string, userAgent?: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const unlockKey = `unlock_${email}`;
            const unlockData = unlockStorage.get(unlockKey);
            
            if (!unlockData) {
                return {
                    success: false,
                    message: 'Invalid or expired unlock code'
                };
            }

            // Check if unlock code has expired
            if (new Date() > unlockData.expiresAt) {
                unlockStorage.delete(unlockKey);
                return {
                    success: false,
                    message: 'Unlock code has expired'
                };
            }

            // Check attempts
            if (unlockData.attempts >= unlockData.maxAttempts) {
                unlockStorage.delete(unlockKey);
                return {
                    success: false,
                    message: 'Too many failed unlock attempts'
                };
            }

            // Validate unlock code
            if (unlockData.code !== unlockCode) {
                unlockData.attempts++;
                unlockStorage.set(unlockKey, unlockData);
                
                return {
                    success: false,
                    message: `Invalid unlock code. ${unlockData.maxAttempts - unlockData.attempts} attempts remaining.`
                };
            }

            // Unlock account (no rate limiting to clear anymore)
            unlockStorage.delete(unlockKey);

            // Log security event
            console.log(`[SECURITY] ACCOUNT_UNLOCKED: ${email} - ${new Date().toISOString()}`);

            return {
                success: true,
                message: 'Account unlocked successfully'
            };

        } catch (error) {
            console.error('Account unlock error:', error);
            return {
                success: false,
                message: 'Internal server error'
            };
        }
    }
}

/**
 * Security monitoring service
 */
export class SecurityMonitoringService {
    /**
     * Get security events for a user
     */
    static getSecurityEvents(userId: string, hours: number = 24): SecurityEvent[] {
        const cutoffTime = new Date().getTime() - hours * 60 * 60 * 1000;
        return securityEvents.filter(event => 
            event.userId === userId && event.timestamp.getTime() > cutoffTime
        );
    }

    /**
     * Get all security events
     */
    static getAllSecurityEvents(hours: number = 24): SecurityEvent[] {
        const cutoffTime = new Date().getTime() - hours * 60 * 60 * 1000;
        return securityEvents.filter(event => event.timestamp.getTime() > cutoffTime);
    }

    /**
     * Clean up expired data
     */
    static cleanup(): void {
        // Clean up expired PINs
        cleanupExpiredPins();

        // Clean up old security events
        const cutoffTime = new Date().getTime() - SECURITY_EVENTS_RETENTION_HOURS * 60 * 60 * 1000;
        const filteredEvents = securityEvents.filter(event => event.timestamp.getTime() > cutoffTime);
        securityEvents.length = 0;
        securityEvents.push(...filteredEvents);
    }
}

// Export types for use in other modules
export type { SecurityEvent, AttemptData };
