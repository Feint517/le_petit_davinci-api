import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Enhanced validation middleware factory with input sanitization
 */
export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Sanitize input data
        const sanitizedBody = sanitizeInput(req.body);
        
        const { error, value } = schema.validate(sanitizedBody, {
            abortEarly: false, // Collect all validation errors
            stripUnknown: true, // Remove unknown fields
            convert: true // Convert types when possible
        });
        
        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            
            res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errorDetails
            });
            return;
        }
        
        // Replace request body with validated and sanitized data
        req.body = value;
        next();
    };
};

/**
 * Sanitize input data to prevent XSS and other attacks
 */
const sanitizeInput = (data: any): any => {
    if (typeof data === 'string') {
        // Remove potentially dangerous characters and normalize whitespace
        return data
            .trim()
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .replace(/\s+/g, ' '); // Normalize whitespace
    }
    
    if (Array.isArray(data)) {
        return data.map(item => sanitizeInput(item));
    }
    
    if (data && typeof data === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(data)) {
            // Sanitize keys as well
            const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
            sanitized[cleanKey] = sanitizeInput(value);
        }
        return sanitized;
    }
    
    return data;
};

// Enhanced validation schemas with better security rules
export const authSchemas = {
    register: Joi.object({
        email: Joi.string()
            .email({ tlds: { allow: false } }) // Allow any TLD for flexibility
            .max(254) // RFC 5321 limit
            .lowercase() // Normalize to lowercase
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.max': 'Email address is too long',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(8)
            .max(128) // Reasonable upper limit
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            .required()
            .messages({
                'string.min': 'Password must be at least 8 characters long',
                'string.max': 'Password must not exceed 128 characters',
                'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
                'any.required': 'Password is required'
            }),
        firstName: Joi.string()
            .min(1)
            .max(50)
            .pattern(/^[a-zA-Z\s\-'\.]+$/) // Allow letters, spaces, hyphens, apostrophes, and periods
            .required()
            .messages({
                'string.min': 'First name is required',
                'string.max': 'First name must not exceed 50 characters',
                'string.pattern.base': 'First name can only contain letters, spaces, hyphens, apostrophes, and periods',
                'any.required': 'First name is required'
            }),
        lastName: Joi.string()
            .min(1)
            .max(50)
            .pattern(/^[a-zA-Z\s\-'\.]+$/) // Allow letters, spaces, hyphens, apostrophes, and periods
            .required()
            .messages({
                'string.min': 'Last name is required',
                'string.max': 'Last name must not exceed 50 characters',
                'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods',
                'any.required': 'Last name is required'
            })
    }),

    login: Joi.object({
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .max(254)
            .lowercase()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.max': 'Email address is too long',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(1)
            .max(128)
            .required()
            .messages({
                'string.min': 'Password is required',
                'string.max': 'Password is too long',
                'any.required': 'Password is required'
            })
    }),

    validatePin: Joi.object({
        userId: Joi.string()
            .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) // UUID pattern
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format',
                'any.required': 'User ID is required'
            }),
        pin: Joi.string()
            .length(4)
            .pattern(/^\d{4}$/) // Exactly 4 digits
            .required()
            .messages({
                'string.length': 'PIN must be exactly 4 digits',
                'string.pattern.base': 'PIN must contain only numbers',
                'any.required': 'PIN is required'
            })
    }),

    validateLocation: Joi.object({
        userId: Joi.string()
            .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) // UUID pattern
            .required()
            .messages({
                'string.pattern.base': 'Invalid user ID format',
                'any.required': 'User ID is required'
            }),
        latitude: Joi.number()
            .min(-90)
            .max(90)
            .precision(6) // Limit to 6 decimal places
            .required()
            .messages({
                'number.min': 'Latitude must be between -90 and 90 degrees',
                'number.max': 'Latitude must be between -90 and 90 degrees',
                'number.precision': 'Latitude precision is limited to 6 decimal places',
                'any.required': 'Latitude is required'
            }),
        longitude: Joi.number()
            .min(-180)
            .max(180)
            .precision(6) // Limit to 6 decimal places
            .required()
            .messages({
                'number.min': 'Longitude must be between -180 and 180 degrees',
                'number.max': 'Longitude must be between -180 and 180 degrees',
                'number.precision': 'Longitude precision is limited to 6 decimal places',
                'any.required': 'Longitude is required'
            })
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string()
            .min(1)
            .max(128)
            .required()
            .messages({
                'string.min': 'Current password is required',
                'string.max': 'Current password is too long',
                'any.required': 'Current password is required'
            }),
        newPassword: Joi.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            .required()
            .messages({
                'string.min': 'New password must be at least 8 characters long',
                'string.max': 'New password must not exceed 128 characters',
                'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
                'any.required': 'New password is required'
            })
    }),

    refreshToken: Joi.object({
        refreshToken: Joi.string()
            .min(1)
            .required()
            .messages({
                'string.min': 'Refresh token is required',
                'any.required': 'Refresh token is required'
            })
    }),

    // Additional validation schemas for enhanced security
    unlockAccount: Joi.object({
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .max(254)
            .lowercase()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.max': 'Email address is too long',
                'any.required': 'Email is required'
            }),
        unlockCode: Joi.string()
            .length(6)
            .pattern(/^\d{6}$/) // 6-digit unlock code
            .required()
            .messages({
                'string.length': 'Unlock code must be exactly 6 digits',
                'string.pattern.base': 'Unlock code must contain only numbers',
                'any.required': 'Unlock code is required'
            })
    }),

    requestUnlock: Joi.object({
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .max(254)
            .lowercase()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'string.max': 'Email address is too long',
                'any.required': 'Email is required'
            })
    })
};

// Profile validation schemas for multi-profile system
export const profileSchemas = {
    create: Joi.object({
        profile_name: Joi.string()
            .min(1)
            .max(50)
            .pattern(/^[a-zA-Z0-9\s\-_]+$/) // Allow letters, numbers, spaces, hyphens, and underscores
            .required()
            .messages({
                'string.min': 'Profile name is required',
                'string.max': 'Profile name must not exceed 50 characters',
                'string.pattern.base': 'Profile name can only contain letters, numbers, spaces, hyphens, and underscores',
                'any.required': 'Profile name is required'
            }),
        pin: Joi.string()
            .length(4)
            .pattern(/^\d{4}$/) // Exactly 4 digits
            .required()
            .messages({
                'string.length': 'PIN must be exactly 4 digits',
                'string.pattern.base': 'PIN must contain only numbers',
                'any.required': 'PIN is required'
            }),
        avatar: Joi.string()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Avatar path is too long'
            })
    }),

    validatePin: Joi.object({
        profile_id: Joi.string()
            .pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) // UUID pattern
            .required()
            .messages({
                'string.pattern.base': 'Invalid profile ID format',
                'any.required': 'Profile ID is required'
            }),
        pin: Joi.string()
            .length(4)
            .pattern(/^\d{4}$/) // Exactly 4 digits
            .required()
            .messages({
                'string.length': 'PIN must be exactly 4 digits',
                'string.pattern.base': 'PIN must contain only numbers',
                'any.required': 'PIN is required'
            })
    }),

    update: Joi.object({
        profile_name: Joi.string()
            .min(1)
            .max(50)
            .pattern(/^[a-zA-Z0-9\s\-_]+$/) // Allow letters, numbers, spaces, hyphens, and underscores
            .optional()
            .messages({
                'string.min': 'Profile name cannot be empty',
                'string.max': 'Profile name must not exceed 50 characters',
                'string.pattern.base': 'Profile name can only contain letters, numbers, spaces, hyphens, and underscores'
            }),
        avatar: Joi.string()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Avatar path is too long'
            }),
        pin: Joi.string()
            .length(4)
            .pattern(/^\d{4}$/) // Exactly 4 digits
            .optional()
            .messages({
                'string.length': 'PIN must be exactly 4 digits',
                'string.pattern.base': 'PIN must contain only numbers'
            })
    }).min(1) // At least one field must be present
    .messages({
        'object.min': 'At least one field must be provided for update'
    })
};

/**
 * ================================
 * SUBSCRIPTION VALIDATION SCHEMAS
 * ================================
 */

export const subscriptionSchemas = {
    createCheckout: Joi.object({
        priceId: Joi.string()
            .required()
            .messages({
                'any.required': 'Price ID is required',
                'string.empty': 'Price ID cannot be empty'
            }),
        successUrl: Joi.string()
            .uri()
            .optional()
            .messages({
                'string.uri': 'Success URL must be a valid URL'
            }),
        cancelUrl: Joi.string()
            .uri()
            .optional()
            .messages({
                'string.uri': 'Cancel URL must be a valid URL'
            })
    }),

    createPortal: Joi.object({
        returnUrl: Joi.string()
            .uri()
            .optional()
            .messages({
                'string.uri': 'Return URL must be a valid URL'
            })
    }),

    cancelSubscription: Joi.object({
        reason: Joi.string()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Reason must not exceed 500 characters'
            })
    })
};