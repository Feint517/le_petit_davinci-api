# Le Petit Davinci API - Architecture Documentation

## 📋 Overview

This documentation provides comprehensive visual diagrams of the Le Petit Davinci API backend architecture using Mermaid diagrams.

## 📊 Available Diagrams

### System Architecture
1. **System Architecture Overview** - High-level view of all system components
2. **Request Flow Pipeline** - How requests flow through the system
3. **Middleware Stack Flow** - Detailed middleware processing pipeline

### Authentication & Authorization
4. **Legacy Authentication Flow** - Multi-step authentication (credentials → PIN → location)
5. **Auth0 Authentication Flow** - Modern OAuth2/OIDC flow with Auth0
6. **Token Refresh Flow** - JWT token refresh mechanism
7. **Complete Authentication State Machine** - All authentication states and transitions

### Security
8. **Security Monitoring System** - Event tracking and threat detection
9. **PIN Management System** - PIN lifecycle and validation
10. **Account Recovery Flow** - Account unlock process

### Data & Storage
11. **Database Schema** - Complete database structure with relationships
12. **Data Flow Diagram** - How data moves through the system

### Application Structure
13. **API Routes Structure** - All available endpoints organized by category
14. **Service Layer Architecture** - Business logic and service organization
15. **Error Handling Flow** - Comprehensive error handling patterns

### Infrastructure
16. **Deployment Architecture** - Vercel serverless deployment structure

## 🚀 Quick Start

### Viewing Diagrams

#### Option 1: GitHub (Recommended)
Simply view the `architecture-diagrams.md` file on GitHub - it will render all diagrams automatically.

#### Option 2: VS Code
1. Install extension: "Markdown Preview Mermaid Support"
2. Open `architecture-diagrams.md`
3. Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)

#### Option 3: Online Editor
1. Visit [Mermaid Live Editor](https://mermaid.live/)
2. Copy any diagram code block
3. Paste and view interactively

#### Option 4: Documentation Platforms
Most modern documentation platforms support Mermaid:
- GitBook
- Notion
- Confluence
- Docusaurus
- MkDocs

## 📖 Understanding the Architecture

### Authentication Types

The API supports **two authentication mechanisms**:

#### 1. Legacy Multi-Step Authentication
```
Step 1: Validate email & password → Get userId + PIN
Step 2: Validate PIN → Proceed to location
Step 3: Validate location → Get access + refresh tokens
```

**Endpoints:**
- `POST /auth/validate-credentials`
- `POST /auth/validate-pin`
- `POST /auth/validate-location`

#### 2. Auth0 Authentication (Recommended)
Modern OAuth2/OIDC authentication with Auth0 as identity provider.

**Endpoints:**
- `POST /auth/auth0/callback`
- `GET /auth/profile`
- `PUT /auth/profile`
- `POST /auth/profile/sync`

### Security Features

1. **Multi-Step Verification** - Credentials → PIN → Location
2. **Rate Limiting** - Prevents brute force attacks
3. **Security Monitoring** - Tracks suspicious activities
4. **PIN Expiration** - 10-minute validity with max 5 attempts
5. **Token Rotation** - Refresh tokens with 7-day expiry
6. **Account Recovery** - Secure unlock mechanism

### Key Components

#### Controllers (`/controllers`)
Handle HTTP requests and responses. Main controller:
- `authentication_controller.ts` - All auth operations

#### Services (`/services`)
Business logic layer:
- `authService.ts` - Authentication services
  - CredentialValidationService
  - PinValidationService
  - AccountRecoveryService
  - SecurityMonitoringService

#### Models (`/models`)
Data layer:
- `user_model.ts` - User data model with Supabase integration

#### Middleware (`/middlewares`)
Request processing:
- `auth.ts` - JWT verification (legacy & Auth0)
- `validation.ts` - Input validation

#### Utilities (`/utils`)
Helper functions:
- `jwtUtils.ts` - JWT token operations
- `pinStorage.ts` - PIN management
- `helpers.ts` - General utilities
- `init_supabase.ts` - Database connection

## 🔐 Security Considerations

### Token Management
- **Access Token**: 15-minute expiry (short-lived)
- **Refresh Token**: 7-day expiry, stored in database
- Tokens must be stored securely on client (httpOnly cookies recommended)

### PIN Security
- 4-digit numeric code
- 10-minute expiration
- Maximum 5 attempts
- Cryptographically secure generation

### Account Lockout
- Automatic lockout after failed attempts
- Unlock codes sent via email
- 6-digit unlock code, 30-minute expiry
- Maximum 3 unlock attempts

## 🗃️ Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- email (String, Unique)
- password (String, Hashed)
- first_name, last_name (String)
- auth0_id (String, Unique)
- auth0_data (JSONB)
- refresh_token (String)
- refresh_token_expires_at (Timestamp)
- is_active (Boolean)
- last_login (Timestamp)
- created_at, updated_at (Timestamp)
```

### In-Memory Storage
- **PIN Storage**: Temporary PIN codes (10-minute TTL)
- **Security Events**: Recent security logs (24-hour retention)
- **Unlock Codes**: Account recovery codes (30-minute TTL)

*Note: In production, replace in-memory storage with Redis*

## 🛣️ API Routes

### Public Routes
- `GET /api/health` - Health check
- `GET /api/ping` - Simple ping
- `GET /api/status` - Detailed status

### Authentication Routes

#### Legacy Auth
- `POST /auth/register` - User registration
- `POST /auth/validate-credentials` - Step 1: Credentials
- `POST /auth/validate-pin` - Step 2: PIN
- `POST /auth/validate-location` - Step 3: Location
- `POST /auth/logout` - Logout
- `POST /auth/refresh-tokens` - Refresh tokens

#### Auth0
- `POST /auth/auth0/callback` - Auth0 callback
- `GET /auth/profile` - Get profile (protected)
- `PUT /auth/profile` - Update profile (protected)
- `POST /auth/profile/sync` - Sync with Auth0 (protected)
- `DELETE /auth/account` - Delete account (protected)

#### Security
- `GET /auth/security/events` - Security events (protected)
- `POST /auth/security/cleanup` - Cleanup old data (protected)

#### Recovery
- `POST /auth/request-unlock` - Request unlock code
- `POST /auth/unlock-account` - Unlock with code

### Protected Routes
- `GET /` - Root (Auth0 protected)
- `GET /legacy` - Legacy route (Legacy auth protected)

## 🚀 Deployment

### Platform
- **Hosting**: Vercel (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Auth0 (OAuth2/OIDC)

### Environment Variables Required
```env
# Server
PORT=3000
NODE_ENV=production

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# JWT (Legacy)
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Auth0
AUTH0_DOMAIN=your_domain.auth0.com
AUTH0_AUDIENCE=your_api_identifier
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
```

## 🧪 Testing

Test files are available in `/tests` directory:
- `test-auth.js` - Legacy authentication tests
- `test-enhanced-auth.js` - Enhanced auth tests
- `comprehensive-auth-test.js` - Full auth flow tests

## 📚 Additional Resources

### Documentation Files
- `/docs/README.md` - General documentation
- `/scripts/README.md` - Setup scripts documentation
- `/sql/README.md` - Database setup documentation
- `/tests/README.md` - Testing documentation

### Main Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vercel.json` - Deployment configuration
- `nodemon.json` - Development server config

## 🤝 Contributing

When making changes:
1. Update the architecture diagrams if you change flows
2. Document new endpoints in this file
3. Update the database schema diagram for DB changes
4. Keep security considerations up to date

## 📞 Support

For questions about the architecture:
1. Review the diagrams in `architecture-diagrams.md`
2. Check the code comments in source files
3. Refer to this documentation

## 🎨 Diagram Color Legend

- **Blue** - Client/External interfaces
- **Purple** - Auth0 related components
- **Green** - Database/Storage
- **Red** - Security/Error handling
- **Orange** - Processing/Business logic
- **Pink** - Protected resources

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Maintained By**: Le Petit Davinci Team

