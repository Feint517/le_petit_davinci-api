import mongoose, { Document, Schema } from 'mongoose';
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

// User interface extending Document for Mongoose
export interface IUser extends Document {
    // Traditional fields (keep for backward compatibility)
    firstName?: string;
    lastName?: string;
    username?: string;
    email: string;
    phoneNumber?: string;
    password?: string;
    pin1?: string;
    pin2?: string;
    refreshToken?: string;
    refreshTokenExpiresAt?: Date;

    // Auth0 specific fields
    auth0Id: string;  // Auth0 sub field
    auth0Data?: Auth0UserData;

    // Additional user fields
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;

    // Instance methods
    isValidPassword(password: string): Promise<boolean>;
    isPinValid(pin1: string, pin2: string): Promise<boolean>;
    syncFromAuth0(auth0User: Auth0UserData): void;
}

// User schema
const userSchema: Schema<IUser> = new Schema({
    // Traditional fields (backward compatibility)
    firstName: {
        type: String,
        required: false,
        trim: true
    },
    lastName: {
        type: String,
        required: false,
        trim: true
    },
    username: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: false,
        trim: true
    },
    password: {
        type: String,
        required: false  // Not required for Auth0 users
    },
    pin1: {
        type: String,
        required: false
    },
    pin2: {
        type: String,
        required: false
    },
    refreshToken: {
        type: String,
        required: false
    },
    refreshTokenExpiresAt: {
        type: Date,
        required: false
    },

    // Auth0 specific fields
    auth0Id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    auth0Data: {
        sub: { type: String, required: true },
        email: { type: String },
        name: { type: String },
        picture: { type: String },
        email_verified: { type: Boolean, default: false },
        nickname: { type: String },
        given_name: { type: String },
        family_name: { type: String },
        updated_at: { type: String },
        last_login: { type: Date }
    },

    // Additional fields
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true,  // Automatically adds createdAt and updatedAt
    toJSON: {
        transform: function(doc, ret) {
            // Remove sensitive fields from JSON output
            delete ret.password;
            delete ret.pin1;
            delete ret.pin2;
            delete ret.refreshToken;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for Auth0 ID
userSchema.index({ auth0Id: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'auth0Data.sub': 1 });

// Pre-save middleware for password hashing
userSchema.pre<IUser>('save', async function (next) {
    const user = this;

    try {
        // Hash password if modified
        if (user.isModified('password') && user.password) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(user.password, salt);
        }

        // Hash pins if modified
        if (user.isModified('pin1') && user.pin1) {
            const salt = await bcrypt.genSalt(12);
            user.pin1 = await bcrypt.hash(user.pin1, salt);
        }

        if (user.isModified('pin2') && user.pin2) {
            const salt = await bcrypt.genSalt(12);
            user.pin2 = await bcrypt.hash(user.pin2, salt);
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

// Instance method to validate password
userSchema.methods.isValidPassword = async function (password: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
};

// Instance method to validate PINs
userSchema.methods.isPinValid = async function (pin1: string, pin2: string): Promise<boolean> {
    if (!this.pin1 || !this.pin2) return false;
    const isPin1Match = await bcrypt.compare(pin1, this.pin1);
    const isPin2Match = await bcrypt.compare(pin2, this.pin2);
    return isPin1Match && isPin2Match;
};

// Instance method to sync user data from Auth0
userSchema.methods.syncFromAuth0 = function (auth0User: Auth0UserData): void {
    this.auth0Data = auth0User;
    this.email = auth0User.email || this.email;

    // Update name fields if available
    if (auth0User.given_name && !this.firstName) {
        this.firstName = auth0User.given_name;
    }
    if (auth0User.family_name && !this.lastName) {
        this.lastName = auth0User.family_name;
    }
    if (auth0User.nickname && !this.username) {
        this.username = auth0User.nickname;
    }

    this.lastLogin = new Date();
    this.auth0Data.last_login = new Date();
};

// Static method to find or create user from Auth0 data
userSchema.statics.findOrCreateFromAuth0 = async function (auth0User: Auth0UserData): Promise<IUser> {
    let user = await this.findOne({ auth0Id: auth0User.sub });

    if (!user) {
        // Create new user
        user = new this({
            auth0Id: auth0User.sub,
            email: auth0User.email,
            firstName: auth0User.given_name,
            lastName: auth0User.family_name,
            username: auth0User.nickname,
            auth0Data: auth0User,
            isActive: true,
            lastLogin: new Date()
        });
    } else {
        // Update existing user with latest Auth0 data
        user.syncFromAuth0(auth0User);
    }

    await user.save();
    return user;
};

// Create and export the model
const User = mongoose.model<IUser>('User', userSchema);

export default User;
export { User };