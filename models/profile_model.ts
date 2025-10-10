import supabase from '../utils/init_supabase';
import bcrypt from 'bcryptjs';

// Profile interface
export interface IProfile {
    id?: string;
    user_id: string;
    profile_name: string;
    pin_hash?: string;
    avatar?: string | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

// Profile class with methods
export class Profile {
    private data: IProfile;

    constructor(data: IProfile) {
        this.data = data;
    }

    // Getter methods
    get id() { return this.data.id; }
    get userId() { return this.data.user_id; }
    get profileName() { return this.data.profile_name; }
    get avatar() { return this.data.avatar; }
    get isActive() { return this.data.is_active; }
    get createdAt() { return this.data.created_at; }
    get updatedAt() { return this.data.updated_at; }

    // Setter methods
    set profileName(value: string) { this.data.profile_name = value; }
    set avatar(value: string | null | undefined) { 
        this.data.avatar = value === undefined ? null : value;
    }
    set isActive(value: boolean) { this.data.is_active = value; }

    /**
     * Validate PIN against stored hash
     */
    async validatePin(pin: string): Promise<boolean> {
        if (!this.data.pin_hash) return false;
        return await bcrypt.compare(pin, this.data.pin_hash);
    }

    /**
     * Save profile to Supabase
     */
    async save(): Promise<IProfile> {
        try {
            if (this.data.id) {
                // Update existing profile
                const { data, error } = await supabase
                    .from('profiles')
                    .update({
                        profile_name: this.data.profile_name,
                        avatar: this.data.avatar,
                        is_active: this.data.is_active,
                        updated_at: new Date()
                    })
                    .eq('id', this.data.id)
                    .select()
                    .single();

                if (error) throw error;
                this.data = data;
                return this.data;
            } else {
                // Create new profile
                const { data, error } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: this.data.user_id,
                        profile_name: this.data.profile_name,
                        pin_hash: this.data.pin_hash,
                        avatar: this.data.avatar,
                        is_active: this.data.is_active
                    })
                    .select()
                    .single();

                if (error) throw error;
                this.data = data;
                return this.data;
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            throw error;
        }
    }

    /**
     * Update PIN
     */
    async updatePin(newPin: string): Promise<void> {
        try {
            const salt = await bcrypt.genSalt(12);
            const pin_hash = await bcrypt.hash(newPin, salt);

            const { error } = await supabase
                .from('profiles')
                .update({ pin_hash, updated_at: new Date() })
                .eq('id', this.data.id);

            if (error) throw error;
            this.data.pin_hash = pin_hash;
        } catch (error) {
            console.error('Error updating PIN:', error);
            throw error;
        }
    }

    /**
     * Find profile by ID
     */
    static async findById(profileId: string): Promise<Profile | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // No rows found
                throw error;
            }

            return new Profile(data);
        } catch (error) {
            console.error('Error finding profile by ID:', error);
            return null;
        }
    }

    /**
     * Find profile by ID and user ID (for security)
     */
    static async findByIdAndUserId(profileId: string, userId: string): Promise<Profile | null> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profileId)
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // No rows found
                throw error;
            }

            return new Profile(data);
        } catch (error) {
            console.error('Error finding profile:', error);
            return null;
        }
    }

    /**
     * Find all profiles for a user
     */
    static async findByUserId(userId: string): Promise<Profile[]> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data.map(profileData => new Profile(profileData));
        } catch (error) {
            console.error('Error finding profiles by user ID:', error);
            return [];
        }
    }

    /**
     * Count profiles for a user
     */
    static async countByUserId(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error counting profiles:', error);
            return 0;
        }
    }

    /**
     * Create a new profile with hashed PIN
     */
    static async create(userId: string, profileName: string, pin: string, avatar?: string | null): Promise<Profile> {
        try {
            // Hash the PIN
            const salt = await bcrypt.genSalt(12);
            const pin_hash = await bcrypt.hash(pin, salt);

            const newProfileData: IProfile = {
                user_id: userId,
                profile_name: profileName,
                pin_hash,
                avatar: avatar ?? null,
                is_active: true
            };

            const profile = new Profile(newProfileData);
            await profile.save();
            return profile;
        } catch (error) {
            console.error('Error creating profile:', error);
            throw error;
        }
    }

    /**
     * Delete (soft delete) a profile
     */
    async delete(): Promise<void> {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: false, updated_at: new Date() })
                .eq('id', this.data.id);

            if (error) throw error;
            this.data.is_active = false;
        } catch (error) {
            console.error('Error deleting profile:', error);
            throw error;
        }
    }

    /**
     * Hard delete a profile (permanent)
     */
    async hardDelete(): Promise<void> {
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', this.data.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error hard deleting profile:', error);
            throw error;
        }
    }

    /**
     * Convert to JSON (excluding sensitive fields)
     */
    toJSON(): any {
        const { pin_hash, ...safeData } = this.data;
        return safeData;
    }
}

export default Profile;

