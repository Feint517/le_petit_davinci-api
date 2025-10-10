/**
 * Profile Service
 * 
 * Handles business logic for multi-profile system
 * - Profile creation with limits
 * - PIN validation and security
 * - Profile switching
 * - Custom JWT generation with profile context
 */

import Profile from '../models/profile_model';
import { generateProfileToken } from '../utils/jwtUtils';

// Configuration
const MAX_PROFILES_PER_USER = 5;
const PIN_LENGTH = 4;

// Types
interface ProfileCreationResult {
    success: boolean;
    message: string;
    profile?: any;
}

interface ProfilePinValidationResult {
    success: boolean;
    message: string;
    profileToken?: string;
    profile?: any;
}

/**
 * Profile Management Service
 */
export class ProfileService {
    /**
     * Create a new profile for a user
     */
    static async createProfile(
        userId: string,
        profileName: string,
        pin: string,
        avatar?: string | null
    ): Promise<ProfileCreationResult> {
        try {
            // Validate profile name
            if (!profileName || profileName.trim().length === 0) {
                return {
                    success: false,
                    message: 'Profile name is required'
                };
            }

            if (profileName.length > 50) {
                return {
                    success: false,
                    message: 'Profile name must be 50 characters or less'
                };
            }

            // Validate PIN
            if (!pin || pin.length !== PIN_LENGTH) {
                return {
                    success: false,
                    message: `PIN must be exactly ${PIN_LENGTH} digits`
                };
            }

            if (!/^\d+$/.test(pin)) {
                return {
                    success: false,
                    message: 'PIN must contain only numbers'
                };
            }

            // Check profile limit
            const profileCount = await Profile.countByUserId(userId);
            if (profileCount >= MAX_PROFILES_PER_USER) {
                return {
                    success: false,
                    message: `Maximum ${MAX_PROFILES_PER_USER} profiles allowed per account`
                };
            }

            // Check for duplicate profile name
            const existingProfiles = await Profile.findByUserId(userId);
            const duplicateName = existingProfiles.some(
                p => p.profileName.toLowerCase() === profileName.toLowerCase()
            );

            if (duplicateName) {
                return {
                    success: false,
                    message: 'A profile with this name already exists'
                };
            }

            // Create the profile
            const profile = await Profile.create(userId, profileName, pin, avatar);

            return {
                success: true,
                message: 'Profile created successfully',
                profile: profile.toJSON()
            };

        } catch (error) {
            console.error('Profile creation error:', error);
            return {
                success: false,
                message: 'Failed to create profile'
            };
        }
    }

    /**
     * Validate profile PIN and generate profile token
     */
    static async validateProfilePin(
        userId: string,
        profileId: string,
        pin: string
    ): Promise<ProfilePinValidationResult> {
        try {
            // Find profile
            const profile = await Profile.findByIdAndUserId(profileId, userId);
            
            if (!profile) {
                return {
                    success: false,
                    message: 'Profile not found'
                };
            }

            // Validate PIN
            const isPinValid = await profile.validatePin(pin);
            
            if (!isPinValid) {
                return {
                    success: false,
                    message: 'Invalid PIN'
                };
            }

            // Generate profile token
            const profileToken = generateProfileToken(
                userId,
                profile.id!,
                profile.profileName
            );

            return {
                success: true,
                message: 'PIN validated successfully',
                profileToken,
                profile: profile.toJSON()
            };

        } catch (error) {
            console.error('Profile PIN validation error:', error);
            return {
                success: false,
                message: 'Failed to validate PIN'
            };
        }
    }

    /**
     * Get all profiles for a user
     */
    static async getUserProfiles(userId: string): Promise<{
        success: boolean;
        profiles: any[];
        count: number;
    }> {
        try {
            const profiles = await Profile.findByUserId(userId);
            
            return {
                success: true,
                profiles: profiles.map(p => p.toJSON()),
                count: profiles.length
            };

        } catch (error) {
            console.error('Get user profiles error:', error);
            return {
                success: false,
                profiles: [],
                count: 0
            };
        }
    }

    /**
     * Update profile details
     */
    static async updateProfile(
        userId: string,
        profileId: string,
        updates: {
            profile_name?: string;
            avatar?: string;
            pin?: string;
        }
    ): Promise<{
        success: boolean;
        message: string;
        profile?: any;
    }> {
        try {
            // Find profile
            const profile = await Profile.findByIdAndUserId(profileId, userId);
            
            if (!profile) {
                return {
                    success: false,
                    message: 'Profile not found'
                };
            }

            // Update profile name if provided
            if (updates.profile_name !== undefined) {
                if (updates.profile_name.trim().length === 0) {
                    return {
                        success: false,
                        message: 'Profile name cannot be empty'
                    };
                }

                if (updates.profile_name.length > 50) {
                    return {
                        success: false,
                        message: 'Profile name must be 50 characters or less'
                    };
                }

                // Check for duplicate name (excluding current profile)
                const existingProfiles = await Profile.findByUserId(userId);
                const duplicateName = existingProfiles.some(
                    p => p.id !== profileId && 
                    p.profileName.toLowerCase() === updates.profile_name!.toLowerCase()
                );

                if (duplicateName) {
                    return {
                        success: false,
                        message: 'A profile with this name already exists'
                    };
                }

                profile.profileName = updates.profile_name;
            }

            // Update avatar if provided
            if (updates.avatar !== undefined) {
                profile.avatar = updates.avatar;
            }

            // Update PIN if provided
            if (updates.pin !== undefined) {
                if (updates.pin.length !== PIN_LENGTH) {
                    return {
                        success: false,
                        message: `PIN must be exactly ${PIN_LENGTH} digits`
                    };
                }

                if (!/^\d+$/.test(updates.pin)) {
                    return {
                        success: false,
                        message: 'PIN must contain only numbers'
                    };
                }

                await profile.updatePin(updates.pin);
            } else {
                // Save other updates
                await profile.save();
            }

            return {
                success: true,
                message: 'Profile updated successfully',
                profile: profile.toJSON()
            };

        } catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                message: 'Failed to update profile'
            };
        }
    }

    /**
     * Delete a profile
     */
    static async deleteProfile(
        userId: string,
        profileId: string
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            // Find profile
            const profile = await Profile.findByIdAndUserId(profileId, userId);
            
            if (!profile) {
                return {
                    success: false,
                    message: 'Profile not found'
                };
            }

            // Check if it's the last profile
            const profileCount = await Profile.countByUserId(userId);
            if (profileCount <= 1) {
                return {
                    success: false,
                    message: 'Cannot delete the last profile. At least one profile is required.'
                };
            }

            // Soft delete the profile
            await profile.delete();

            return {
                success: true,
                message: 'Profile deleted successfully'
            };

        } catch (error) {
            console.error('Delete profile error:', error);
            return {
                success: false,
                message: 'Failed to delete profile'
            };
        }
    }

    /**
     * Validate that a profile belongs to a user
     */
    static async validateProfileOwnership(
        userId: string,
        profileId: string
    ): Promise<boolean> {
        try {
            const profile = await Profile.findByIdAndUserId(profileId, userId);
            return profile !== null;
        } catch (error) {
            console.error('Validate profile ownership error:', error);
            return false;
        }
    }
}

export default ProfileService;

