# Supabase Authentication Implementation Guide

## Overview

This guide covers the new Supabase-based authentication system with multi-profile support (Netflix-style). The system replaces the previous Auth0 and legacy authentication methods.

## Architecture

### Token Strategy (Hybrid Approach)

The system uses a two-tier token strategy:

1. **Supabase JWT (Account Level)**
   - Issued by Supabase Auth
   - Used for account-level operations
   - Manages user registration, login, profile listing
   - Includes user ID, email, and metadata

2. **Custom Profile JWT (Profile Level)**
   - Issued by our API after PIN validation
   - Used for profile-specific operations
   - Contains profile ID, profile name, and user ID
   - 24-hour expiration

### Authentication Flow

```
1. User Registration/Login (Supabase Auth)
   ↓
2. Receive Supabase Session Token
   ↓
3. Get List of Profiles
   ↓
4. Select Profile + Enter PIN
   ↓
5. Validate PIN → Receive Profile Token
   ↓
6. Use Profile Token for App Operations
```

## API Endpoints

### Account Management

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "session": {
      "access_token": "supabase-jwt-token",
      "refresh_token": "supabase-refresh-token",
      "expires_in": 3600
    }
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "session": {
      "access_token": "supabase-jwt-token",
      "refresh_token": "supabase-refresh-token",
      "expires_in": 3600
    },
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "user_metadata": {
        "first_name": "John",
        "last_name": "Doe"
      }
    },
    "profiles": [
      {
        "id": "profile-uuid",
        "profile_name": "John's Profile",
        "avatar": null,
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "profileCount": 1
  }
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {supabase-access-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Refresh Token
```http
POST /auth/refresh-tokens
Content-Type: application/json

{
  "refreshToken": "supabase-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "data": {
    "session": {
      "access_token": "new-supabase-jwt-token",
      "refresh_token": "new-supabase-refresh-token",
      "expires_in": 3600
    }
  }
}
```

### Profile Management

#### Get All Profiles
```http
GET /auth/profiles
Authorization: Bearer {supabase-access-token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile-uuid-1",
        "user_id": "user-uuid",
        "profile_name": "John's Profile",
        "avatar": null,
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ],
    "count": 1
  }
}
```

#### Create Profile
```http
POST /auth/profiles
Authorization: Bearer {supabase-access-token}
Content-Type: application/json

{
  "profile_name": "Kids Profile",
  "pin": "1234",
  "avatar": "https://example.com/avatar.jpg" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile created successfully",
  "data": {
    "profile": {
      "id": "new-profile-uuid",
      "user_id": "user-uuid",
      "profile_name": "Kids Profile",
      "avatar": "https://example.com/avatar.jpg",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

#### Validate Profile PIN
```http
POST /auth/profiles/validate-pin
Authorization: Bearer {supabase-access-token}
Content-Type: application/json

{
  "profile_id": "profile-uuid",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PIN validated successfully",
  "data": {
    "profileToken": "custom-profile-jwt-token",
    "profile": {
      "id": "profile-uuid",
      "user_id": "user-uuid",
      "profile_name": "Kids Profile",
      "avatar": "https://example.com/avatar.jpg",
      "is_active": true
    }
  }
}
```

#### Update Profile
```http
PUT /auth/profiles/{profileId}
Authorization: Bearer {supabase-access-token}
X-Profile-Token: {profile-jwt-token}
Content-Type: application/json

{
  "profile_name": "Updated Name",  // optional
  "avatar": "https://example.com/new-avatar.jpg",  // optional
  "pin": "5678"  // optional - to change PIN
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "profile": {
      "id": "profile-uuid",
      "user_id": "user-uuid",
      "profile_name": "Updated Name",
      "avatar": "https://example.com/new-avatar.jpg",
      "is_active": true,
      "updated_at": "2025-01-02T00:00:00Z"
    }
  }
}
```

#### Delete Profile
```http
DELETE /auth/profiles/{profileId}
Authorization: Bearer {supabase-access-token}
X-Profile-Token: {profile-jwt-token}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

## Client Implementation Example

### JavaScript/TypeScript

```typescript
class AuthService {
  private supabaseToken: string | null = null;
  private profileToken: string | null = null;
  private currentProfile: any = null;

  // Step 1: Register
  async register(email: string, password: string, firstName: string, lastName: string) {
    const response = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName })
    });
    
    const data = await response.json();
    if (data.success) {
      this.supabaseToken = data.data.session.access_token;
      localStorage.setItem('supabase_token', this.supabaseToken);
      localStorage.setItem('refresh_token', data.data.session.refresh_token);
    }
    return data;
  }

  // Step 2: Login
  async login(email: string, password: string) {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      this.supabaseToken = data.data.session.access_token;
      localStorage.setItem('supabase_token', this.supabaseToken);
      localStorage.setItem('refresh_token', data.data.session.refresh_token);
    }
    return data;
  }

  // Step 3: Get Profiles
  async getProfiles() {
    const response = await fetch('http://localhost:3000/auth/profiles', {
      headers: {
        'Authorization': `Bearer ${this.supabaseToken}`
      }
    });
    
    return await response.json();
  }

  // Step 4: Select Profile and Validate PIN
  async selectProfile(profileId: string, pin: string) {
    const response = await fetch('http://localhost:3000/auth/profiles/validate-pin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supabaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile_id: profileId, pin })
    });
    
    const data = await response.json();
    if (data.success) {
      this.profileToken = data.data.profileToken;
      this.currentProfile = data.data.profile;
      localStorage.setItem('profile_token', this.profileToken);
      localStorage.setItem('current_profile', JSON.stringify(this.currentProfile));
    }
    return data;
  }

  // Step 5: Make Profile-Specific Request
  async makeProfileRequest(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Authorization': `Bearer ${this.supabaseToken}`,
      'X-Profile-Token': this.profileToken!,
      'Content-Type': 'application/json',
      ...options.headers
    };

    return await fetch(`http://localhost:3000${endpoint}`, {
      ...options,
      headers
    });
  }

  // Logout
  async logout() {
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supabaseToken}`
      }
    });
    
    this.supabaseToken = null;
    this.profileToken = null;
    this.currentProfile = null;
    localStorage.clear();
  }
}
```

### React Example

```tsx
import { useState, useEffect } from 'react';

function AuthFlow() {
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileToken, setProfileToken] = useState<string | null>(null);

  // Step 1 & 2: Login
  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (data.success) {
      setSupabaseToken(data.data.session.access_token);
      setProfiles(data.data.profiles);
    }
  };

  // Step 3: Select Profile
  const handleProfileSelect = async (profileId: string, pin: string) => {
    const response = await fetch('/auth/profiles/validate-pin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profile_id: profileId, pin })
    });
    
    const data = await response.json();
    if (data.success) {
      setProfileToken(data.data.profileToken);
      setSelectedProfile(data.data.profile);
    }
  };

  return (
    <div>
      {!supabaseToken ? (
        <LoginForm onLogin={handleLogin} />
      ) : !profileToken ? (
        <ProfileSelector 
          profiles={profiles} 
          onSelect={handleProfileSelect} 
        />
      ) : (
        <App profile={selectedProfile} />
      )}
    </div>
  );
}
```

## Environment Variables

Add to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# JWT Configuration (for profile tokens)
ACCESS_TOKEN_SECRET=your-secret-key-for-profile-tokens
```

## Security Best Practices

1. **Token Storage**
   - Store Supabase token in httpOnly cookies (recommended)
   - Never store tokens in localStorage in production
   - Use secure, sameSite cookies

2. **PIN Security**
   - PINs are always hashed with bcrypt (12 rounds)
   - Never send unhashed PINs except during validation
   - Encourage users to use non-obvious PINs

3. **Profile Tokens**
   - Short expiration (24 hours)
   - Include profile context
   - Verified on every profile-specific request

4. **Rate Limiting**
   - Implement rate limiting on login/PIN validation
   - Maximum 5 PIN attempts per profile
   - Account lockout after repeated failures

## Migrating from Auth0

If you were using Auth0:

1. Export user data from Auth0
2. Create users in Supabase Auth
3. Create default profiles for each user
4. Users will need to reset their passwords
5. Update frontend to use new endpoints

All Auth0 code has been commented out and marked as `DEPRECATED` for reference.

## Troubleshooting

### "Access token is required"
- Ensure Authorization header is present: `Authorization: Bearer {token}`
- Check token is not expired
- Verify token format is correct

### "Profile not found or inactive"
- Ensure profile belongs to authenticated user
- Check profile hasn't been soft-deleted
- Verify profile_id is correct UUID

### "Invalid PIN"
- PIN must be exactly 4 digits
- Check PIN hasn't been changed
- Verify no typos in PIN entry

### "Maximum 5 profiles allowed per account"
- Delete unused profiles first
- Or increase limit in `services/profileService.ts`

## Support

For issues or questions:
- Check the API logs for detailed error messages
- Review Supabase dashboard for auth issues
- Ensure database migration was run successfully
- Verify all environment variables are set correctly

