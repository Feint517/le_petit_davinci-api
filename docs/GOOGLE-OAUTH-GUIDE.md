# Google OAuth Authentication Guide

## Overview

This guide covers how to use Google OAuth authentication with your Supabase backend. Google OAuth is now fully integrated with the multi-profile system.

## Environment Setup

Add to your `.env` file:

```env
# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3000
```

Change this to your production frontend URL when deploying.

## API Endpoints

### 1. Initiate Google Login

**Endpoint:** `POST /auth/google`

**Description:** Returns the Google OAuth URL that the frontend should redirect users to.

**Request:**
```http
POST /auth/google
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
    "provider": "google"
  }
}
```

**Frontend Implementation:**
```javascript
// Step 1: Get Google OAuth URL
const response = await fetch('http://localhost:3000/auth/google', {
  method: 'POST'
});

const { data } = await response.json();

// Step 2: Redirect user to Google
window.location.href = data.url;
```

---

### 2. Handle OAuth Callback

**Endpoint:** `GET /auth/callback?code={authorization_code}`

**Description:** Handles the callback from Google, exchanges the code for a session, and creates a default profile if needed.

**Request:**
```http
GET /auth/callback?code=4/0AeanS0a...
```

**Response:**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "...",
      "expires_in": 3600
    },
    "user": {
      "id": "uuid-here",
      "email": "user@gmail.com",
      "name": "John Doe",
      "picture": "https://lh3.googleusercontent.com/...",
      "email_verified": true
    },
    "profiles": [
      {
        "id": "profile-uuid",
        "user_id": "user-uuid",
        "profile_name": "John Doe",
        "avatar": null,
        "is_active": true
      }
    ],
    "profileCount": 1
  }
}
```

---

## Complete Authentication Flow

### Step-by-Step Process

```
1. User clicks "Sign in with Google" button
   ↓
2. Frontend calls POST /auth/google
   ↓
3. Backend returns Google OAuth URL
   ↓
4. Frontend redirects to Google OAuth page
   ↓
5. User authorizes with Google
   ↓
6. Google redirects back to: {FRONTEND_URL}/auth/callback?code={code}
   ↓
7. Frontend extracts code and calls GET /auth/callback?code={code}
   ↓
8. Backend exchanges code for Supabase session
   ↓
9. Backend creates default profile (if first login)
   ↓
10. Frontend receives session + profiles
   ↓
11. User selects profile + enters PIN
   ↓
12. Profile token generated for app access
```

---

## Frontend Implementation

### React Example

```tsx
import { useState } from 'react';

function GoogleAuth() {
  const [loading, setLoading] = useState(false);

  // Step 1: Initiate Google OAuth
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const { data } = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error) {
      console.error('Google login failed:', error);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleGoogleLogin} disabled={loading}>
      {loading ? 'Redirecting...' : 'Sign in with Google'}
    </button>
  );
}

// Step 2: Handle OAuth callback in your callback page
function AuthCallback() {
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      // Get code from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        console.error('No authorization code found');
        return;
      }

      try {
        // Exchange code for session
        const response = await fetch(
          `http://localhost:3000/auth/callback?code=${code}`
        );
        
        const result = await response.json();

        if (result.success) {
          // Store session token
          localStorage.setItem('supabase_token', result.data.session.access_token);
          localStorage.setItem('refresh_token', result.data.session.refresh_token);
          
          // Show profile selector if multiple profiles
          if (result.data.profileCount > 0) {
            // Navigate to profile selection page
            window.location.href = '/select-profile';
          }
        }
      } catch (error) {
        console.error('Callback error:', error);
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, []);

  if (processing) {
    return <div>Completing sign in...</div>;
  }

  return <div>Redirecting...</div>;
}
```

---

### Vanilla JavaScript Example

```html
<!-- Login Page -->
<button id="google-login">Sign in with Google</button>

<script>
document.getElementById('google-login').addEventListener('click', async () => {
  try {
    const response = await fetch('http://localhost:3000/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const { data } = await response.json();
    window.location.href = data.url;
  } catch (error) {
    console.error('Login failed:', error);
  }
});
</script>
```

```html
<!-- Callback Page: /auth/callback -->
<div id="status">Processing authentication...</div>

<script>
(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) {
    document.getElementById('status').textContent = 'Error: No authorization code';
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/auth/callback?code=${code}`
    );
    
    const result = await response.json();

    if (result.success) {
      // Store tokens
      localStorage.setItem('supabase_token', result.data.session.access_token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      localStorage.setItem('profiles', JSON.stringify(result.data.profiles));
      
      // Redirect to profile selection
      window.location.href = '/select-profile.html';
    } else {
      document.getElementById('status').textContent = 'Authentication failed';
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('status').textContent = 'An error occurred';
  }
})();
</script>
```

---

## Profile Selection After Google Login

After successful Google authentication, users must:

1. **Select a profile** from the list
2. **Enter the 4-digit PIN** for that profile
3. **Receive profile token** for app access

```javascript
// After user selects a profile
async function validateProfilePin(profileId, pin) {
  const supabaseToken = localStorage.getItem('supabase_token');
  
  const response = await fetch('http://localhost:3000/auth/profiles/validate-pin', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profile_id: profileId,
      pin: pin
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Store profile token
    localStorage.setItem('profile_token', result.data.profileToken);
    localStorage.setItem('current_profile', JSON.stringify(result.data.profile));
    
    // Now user can access the app
    window.location.href = '/dashboard';
  }
}
```

---

## Default Profile Creation

When a user logs in with Google for the first time:

- ✅ A **default profile** is automatically created
- ✅ Profile name = User's Google name (or "My Profile")
- ✅ Default PIN = `0000` (⚠️ User should change this immediately!)

**Important:** Prompt users to change their PIN on first login!

---

## Security Considerations

### 1. HTTPS in Production
Always use HTTPS in production:
```env
FRONTEND_URL=https://yourdomain.com
```

### 2. Redirect URI Validation
The redirect URI must match exactly what you configured in:
- Google Cloud Console
- Supabase Dashboard

### 3. Token Storage
- Store tokens in `httpOnly` cookies (recommended)
- Or use `localStorage` with XSS protection
- Never expose tokens in URLs

### 4. CORS Configuration
Ensure your backend allows requests from your frontend domain.

---

## Testing Google OAuth

### Manual Testing

1. **Start your backend:**
   ```bash
   npm run dev
   ```

2. **Test the OAuth URL endpoint:**
   ```bash
   curl -X POST http://localhost:3000/auth/google
   ```

3. **Copy the returned URL** and open it in a browser

4. **Authorize with Google**

5. **After redirect**, note the `code` parameter

6. **Test the callback:**
   ```bash
   curl "http://localhost:3000/auth/callback?code=YOUR_CODE_HERE"
   ```

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution:** Ensure the redirect URI in Google Cloud Console exactly matches:
```
https://vncsfhiujnoymnzsjqvo.supabase.co/auth/v1/callback
```

### Error: "Invalid authorization code"
**Solution:** Authorization codes expire quickly (usually 10 minutes). Generate a new one.

### Error: "No profiles found"
**Solution:** The default profile creation might have failed. Check server logs and ensure the profiles table exists.

### User has no profile after login
**Solution:** Check that the profile creation logic is running. The backend automatically creates a profile with PIN `0000`.

---

## Integration with Existing Auth

Google OAuth works seamlessly with existing email/password authentication:

- ✅ **Same profile system** - Both methods share profiles
- ✅ **Same tokens** - Both use Supabase JWT + Profile JWT
- ✅ **Same endpoints** - Profile management endpoints work identically
- ✅ **Single user table** - All users stored in `auth.users`

Users can:
1. Register with email/password
2. Later link Google OAuth
3. Use either method to login
4. Access the same profiles and data

---

## Production Checklist

Before deploying:

- [ ] Update `FRONTEND_URL` to production domain
- [ ] Configure CORS for production domain
- [ ] Verify Google OAuth credentials in Supabase
- [ ] Test OAuth flow end-to-end
- [ ] Implement profile PIN change flow
- [ ] Add error handling for failed OAuth attempts
- [ ] Set up monitoring for OAuth errors
- [ ] Document user flow for your team

---

## Support

For issues:
1. Check Supabase logs in Dashboard
2. Check your backend server logs
3. Verify Google Cloud Console configuration
4. Review this documentation
5. Test with curl commands above

---

**Your Google OAuth authentication is now fully operational!** 🎉

