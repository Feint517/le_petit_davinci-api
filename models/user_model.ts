import supabase from '../utils/init_supabase';
import bcrypt from 'bcryptjs';

// Auth0 User interface
export interface Auth0UserData {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
    nickname?: string;
    given_name?: string;
    family_name?: string;
    updated_at?: string;
    last_login?: Date;
}

// User interface for Supabase
export interface IUser {
    id?: string;
    // Core user fields
    firstName?: string | undefined;
    lastName?: string | undefined;
    email: string;
    password?: string | undefined;
    
    // Token fields
    refreshToken?: string | undefined;
    refreshTokenExpiresAt?: Date | undefined;

    // Auth0 specific fields
    auth0Id: string;  // Auth0 sub field
    auth0Data?: Auth0UserData | undefined;

    // Additional user fields
    isActive: boolean;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    lastLogin?: Date | undefined;
}

// User class with methods
export class User {
    private data: IUser;

    constructor(data: IUser) {
        this.data = data;
    }

    // Getter methods
    get _id() { return this.data.id; }
    get firstName() { return this.data.firstName; }
    get lastName() { return this.data.lastName; }
    get email() { return this.data.email; }
    get auth0Id() { return this.data.auth0Id; }
    get auth0Data() { return this.data.auth0Data; }
    get isActive() { return this.data.isActive; }
    get createdAt() { return this.data.createdAt; }
    get updatedAt() { return this.data.updatedAt; }
    get lastLogin() { return this.data.lastLogin; }
    get refreshToken() { return this.data.refreshToken; }
    get refreshTokenExpiresAt() { return this.data.refreshTokenExpiresAt; }

    // Setter methods
    set firstName(value: string | undefined) { this.data.firstName = value; }
    set lastName(value: string | undefined) { this.data.lastName = value; }
    set password(value: string | undefined) { this.data.password = value; }
    set isActive(value: boolean) { this.data.isActive = value; }
    set refreshToken(value: string | undefined) { this.data.refreshToken = value; }
    set refreshTokenExpiresAt(value: Date | undefined) { this.data.refreshTokenExpiresAt = value; }
    set lastLogin(value: Date | undefined) { this.data.lastLogin = value; }

    /**
     * Validate password
     */
    async isValidPassword(password: string): Promise<boolean> {
        if (!this.data.password) return false;
        return await bcrypt.compare(password, this.data.password);
    }


    /**
     * Sync user data from Auth0
     */
    syncFromAuth0(auth0User: Auth0UserData): void {
        this.data.auth0Data = auth0User;
        this.data.email = auth0User.email || this.data.email;

        // Update name fields if available
        if (auth0User.given_name && !this.data.firstName) {
            this.data.firstName = auth0User.given_name;
        }
        if (auth0User.family_name && !this.data.lastName) {
            this.data.lastName = auth0User.family_name;
        }

        this.data.lastLogin = new Date();
        if (this.data.auth0Data) {
            this.data.auth0Data.last_login = new Date();
        }
    }

    /**
     * Convert camelCase to snake_case for database
     */
    private static toDatabaseFormat(data: IUser): any {
        return {
            id: data.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            password: data.password,
            refresh_token: data.refreshToken,
            refresh_token_expires_at: data.refreshTokenExpiresAt,
            auth0_id: data.auth0Id,
            auth0_data: data.auth0Data,
            is_active: data.isActive,
            last_login: data.lastLogin,
            created_at: data.createdAt,
            updated_at: data.updatedAt
        };
    }

    /**
     * Convert snake_case to camelCase from database
     */
    private static fromDatabaseFormat(data: any): IUser {
        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            password: data.password,
            refreshToken: data.refresh_token,
            refreshTokenExpiresAt: data.refresh_token_expires_at,
            auth0Id: data.auth0_id,
            auth0Data: data.auth0_data,
            isActive: data.is_active,
            lastLogin: data.last_login,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    /**
     * Save user to Supabase
     */
    async save(): Promise<IUser> {
        try {
            // Hash password if it's being set/modified and not already hashed
            if (this.data.password && !this.data.password.startsWith('$2')) {
                const salt = await bcrypt.genSalt(12);
                this.data.password = await bcrypt.hash(this.data.password, salt);
            }

            const dbData = User.toDatabaseFormat(this.data);

            if (this.data.id) {
                // Update existing user
                dbData.updated_at = new Date();
                const { data, error } = await supabase
                    .from('users')
                    .update(dbData)
                    .eq('id', this.data.id)
                    .select()
                    .single();

                if (error) throw error;
                this.data = User.fromDatabaseFormat(data);
                return this.data;
            } else {
                // Create new user
                dbData.created_at = new Date();
                dbData.updated_at = new Date();
                const { data, error } = await supabase
                    .from('users')
                    .insert(dbData)
                    .select()
                    .single();

                if (error) throw error;
                this.data = User.fromDatabaseFormat(data);
                return this.data;
            }
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    /**
     * Find user by ID
     */
    static async findById(id: string): Promise<User | null> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // No rows found
                throw error;
            }

            return new User(User.fromDatabaseFormat(data));
        } catch (error) {
            console.error('Error finding user by ID:', error);
            return null;
        }
    }

    /**
     * Find user by email
     */
    static async findOne(query: { email?: string; auth0Id?: string }): Promise<User | null> {
        try {
            let queryBuilder = supabase.from('users').select('*');

            if (query.email) {
                queryBuilder = queryBuilder.eq('email', query.email);
            }
            if (query.auth0Id) {
                queryBuilder = queryBuilder.eq('auth0Id', query.auth0Id);
            }

            const { data, error } = await queryBuilder.single();

            if (error) {
                if (error.code === 'PGRST116') return null; // No rows found
                throw error;
            }

            return new User(User.fromDatabaseFormat(data));
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    }

    /**
     * Find or create user from Auth0 data
     */
    static async findOrCreateFromAuth0(auth0User: Auth0UserData): Promise<User> {
        try {
            let user = await this.findOne({ auth0Id: auth0User.sub });

            if (!user) {
                // Create new user
                const newUserData: IUser = {
                    auth0Id: auth0User.sub,
                    email: auth0User.email || '',
                    firstName: auth0User.given_name,
                    lastName: auth0User.family_name,
                    auth0Data: auth0User,
                    isActive: true,
                    lastLogin: new Date()
                };

                user = new User(newUserData);
                await user.save();
            } else {
                // Update existing user with latest Auth0 data
                user.syncFromAuth0(auth0User);
                await user.save();
            }

            return user;
        } catch (error) {
            console.error('Error finding or creating user from Auth0:', error);
            throw error;
        }
    }

    /**
     * Update many users (for cleanup operations)
     */
    static async updateMany(
        filter: { refreshTokenExpiresAt?: { $lte?: Date } },
        update: { $unset?: { refreshToken?: string; refreshTokenExpiresAt?: string } }
    ): Promise<void> {
        try {
            if (filter.refreshTokenExpiresAt?.$lte && update.$unset) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        refreshToken: null,
                        refreshTokenExpiresAt: null
                    })
                    .lte('refreshTokenExpiresAt', filter.refreshTokenExpiresAt.$lte.toISOString());

                if (error) throw error;
            }
        } catch (error) {
            console.error('Error updating users:', error);
            throw error;
        }
    }

    /**
     * Convert to JSON (excluding sensitive fields)
     */
    toJSON(): any {
        const { password, refreshToken, ...safeData } = this.data;
        // Only return fields that are part of the simplified interface
        return {
            id: safeData.id,
            firstName: safeData.firstName,
            lastName: safeData.lastName,
            email: safeData.email,
            auth0Id: safeData.auth0Id,
            auth0Data: safeData.auth0Data,
            isActive: safeData.isActive,
            createdAt: safeData.createdAt,
            updatedAt: safeData.updatedAt,
            lastLogin: safeData.lastLogin
        };
    }
}

export default User;