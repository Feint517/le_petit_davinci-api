# Le Petit Davinci API - Architecture Documentation
# Mermaid Diagrams for Backend System

---
## 1. System Architecture Overview
---

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[Client Application]
    end

    subgraph "API Gateway Layer"
        EXPRESS[Express.js Server]
        MIDDLEWARE[Middleware Layer]
    end

    subgraph "Authentication Layer"
        AUTH0[Auth0 Service]
        LEGACY_AUTH[Legacy Auth System]
        JWT[JWT Validation]
    end

    subgraph "Application Layer"
        ROUTES[Route Handlers]
        CONTROLLERS[Controllers]
        SERVICES[Business Services]
    end

    subgraph "Data Layer"
        MODELS[Data Models]
        SUPABASE[(Supabase Database)]
    end

    subgraph "Security Layer"
        PIN_STORAGE[PIN Storage]
        SECURITY_MONITOR[Security Monitoring]
        RATE_LIMITER[Rate Limiting]
    end

    CLIENT --> EXPRESS
    EXPRESS --> MIDDLEWARE
    MIDDLEWARE --> AUTH0
    MIDDLEWARE --> LEGACY_AUTH
    MIDDLEWARE --> JWT
    
    MIDDLEWARE --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> MODELS
    MODELS --> SUPABASE
    
    SERVICES --> PIN_STORAGE
    SERVICES --> SECURITY_MONITOR
    SERVICES --> RATE_LIMITER
    
    style CLIENT fill:#e1f5ff
    style EXPRESS fill:#fff3e0
    style AUTH0 fill:#f3e5f5
    style SUPABASE fill:#e8f5e9
    style SECURITY_MONITOR fill:#ffebee
```

---
## 2. Request Flow Pipeline
---

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Middleware
    participant Controller
    participant Service
    participant Database

    Client->>Express: HTTP Request
    Express->>Middleware: Route to Middleware
    
    alt Protected Route
        Middleware->>Middleware: Verify JWT Token
        alt Token Invalid
            Middleware-->>Client: 401 Unauthorized
        end
    end
    
    Middleware->>Controller: Forward Request
    Controller->>Service: Business Logic
    Service->>Database: Query/Update Data
    Database-->>Service: Data Response
    Service-->>Controller: Processed Data
    Controller-->>Express: HTTP Response
    Express-->>Client: JSON Response
```

---
## 3. Legacy Authentication Flow (Multi-Step)
---

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthController
    participant CredentialService
    participant PinService
    participant UserModel
    participant Database
    participant SecurityMonitor

    Note over Client,SecurityMonitor: Step 1: Credential Validation
    
    Client->>API: POST /auth/validate-credentials
    Note right of Client: { email, password }
    
    API->>AuthController: validateCredentials()
    AuthController->>CredentialService: validateCredentials()
    CredentialService->>UserModel: findOne({ email })
    UserModel->>Database: Query user
    Database-->>UserModel: User data
    UserModel-->>CredentialService: User object
    
    CredentialService->>CredentialService: Compare password (bcrypt)
    CredentialService->>CredentialService: Check if user is active
    CredentialService->>SecurityMonitor: Log security event
    
    alt Invalid Credentials
        CredentialService-->>Client: 401 Invalid credentials
    end
    
    CredentialService->>CredentialService: Generate secure PIN (4 digits)
    CredentialService->>PinService: storePin(userId, pin)
    PinService-->>CredentialService: PIN stored
    
    CredentialService-->>Client: 200 { userId, step: 'pin-validation', debugPin }
    
    Note over Client,SecurityMonitor: Step 2: PIN Validation
    
    Client->>API: POST /auth/validate-pin
    Note right of Client: { userId, pin }
    
    API->>AuthController: validatePin()
    AuthController->>PinService: validatePin(userId, pin)
    PinService->>PinService: Check PIN exists & not expired
    PinService->>PinService: Validate PIN attempts
    
    alt PIN Invalid/Expired
        PinService-->>Client: 401 Invalid/Expired PIN
    end
    
    PinService->>SecurityMonitor: Log PIN validation
    PinService-->>Client: 200 { step: 'location-validation' }
    
    Note over Client,SecurityMonitor: Step 3: Location Validation
    
    Client->>API: POST /auth/validate-location
    Note right of Client: { userId, latitude, longitude }
    
    API->>AuthController: validateGeoLocation()
    AuthController->>AuthController: Validate coordinates
    AuthController->>UserModel: findById(userId)
    UserModel->>Database: Query user
    Database-->>UserModel: User data
    
    AuthController->>AuthController: Generate Access Token (15m)
    AuthController->>AuthController: Generate Refresh Token (7d)
    
    AuthController->>UserModel: Update refresh token
    UserModel->>Database: Save user with tokens
    Database-->>UserModel: Success
    
    AuthController-->>Client: 200 { accessToken, refreshToken, user }
```

---
## 4. Auth0 Authentication Flow
---

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth0Middleware
    participant Auth0Service
    participant Controller
    participant UserModel
    participant Database

    Note over Client,Database: Auth0 Token Verification
    
    Client->>API: Request with Bearer Token
    Note right of Client: Authorization: Bearer {token}
    
    API->>Auth0Middleware: verifyAuth0Token()
    Auth0Middleware->>Auth0Service: Get JWKS signing key
    Auth0Service-->>Auth0Middleware: Public key
    
    Auth0Middleware->>Auth0Middleware: Verify JWT signature
    Auth0Middleware->>Auth0Middleware: Verify audience & issuer
    Auth0Middleware->>Auth0Middleware: Check token expiration
    
    alt Token Invalid
        Auth0Middleware-->>Client: 401 Unauthorized
    end
    
    Auth0Middleware->>Auth0Middleware: Extract user info from token
    Auth0Middleware->>API: Attach userId & user to request
    
    API->>Controller: Route to controller
    
    Note over Client,Database: User Profile Management
    
    Controller->>UserModel: findOrCreateFromAuth0()
    UserModel->>Database: Query user by auth0Id
    
    alt User Not Found
        UserModel->>Database: Create new user
        Database-->>UserModel: New user created
    else User Exists
        UserModel->>UserModel: syncFromAuth0()
        UserModel->>Database: Update user data
        Database-->>UserModel: User updated
    end
    
    UserModel-->>Controller: User object
    Controller-->>Client: 200 { success, user }
```

---
## 5. Token Refresh Flow
---

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Controller
    participant UserModel
    participant Database

    Client->>API: POST /auth/refresh-tokens
    Note right of Client: { refreshToken }
    
    API->>Controller: refreshTokensFixed()
    Controller->>Controller: Verify refresh token (JWT)
    
    alt Token Invalid/Expired
        Controller-->>Client: 401 Invalid token
    end
    
    Controller->>UserModel: findById(userId)
    UserModel->>Database: Query user
    Database-->>UserModel: User data
    
    Controller->>Controller: Verify token in database
    Controller->>Controller: Check expiration date
    
    alt Token Not Found or Expired
        Controller-->>Client: 401 Invalid/Expired token
    end
    
    Controller->>Controller: Generate new Access Token (15m)
    Controller->>Controller: Generate new Refresh Token (7d)
    
    Controller->>UserModel: Update refresh token
    UserModel->>Database: Save new tokens
    Database-->>UserModel: Success
    
    Controller-->>Client: 200 { accessToken, refreshToken }
```

---
## 6. Security Monitoring System
---

```mermaid
graph TB
    subgraph "Security Events"
        LOGIN_ATTEMPT[Login Attempt]
        LOGIN_SUCCESS[Login Success]
        LOGIN_FAILURE[Login Failure]
        PIN_ATTEMPT[PIN Attempt]
        PIN_FAILURE[PIN Failure]
        ACCOUNT_LOCKED[Account Locked]
        SUSPICIOUS[Suspicious Activity]
    end

    subgraph "Detection Systems"
        IP_MONITOR[IP Address Monitor]
        RATE_DETECTOR[Rate Limit Detector]
        PATTERN_DETECTOR[Pattern Detector]
    end

    subgraph "Security Actions"
        LOG_EVENT[Log Security Event]
        ALERT_ADMIN[Alert Administrator]
        BLOCK_REQUEST[Block Request]
        SEND_NOTIFICATION[Send User Notification]
    end

    LOGIN_ATTEMPT --> IP_MONITOR
    LOGIN_FAILURE --> RATE_DETECTOR
    PIN_FAILURE --> RATE_DETECTOR
    
    IP_MONITOR --> PATTERN_DETECTOR
    RATE_DETECTOR --> PATTERN_DETECTOR
    
    PATTERN_DETECTOR --> LOG_EVENT
    PATTERN_DETECTOR --> SUSPICIOUS
    
    SUSPICIOUS --> ALERT_ADMIN
    SUSPICIOUS --> SEND_NOTIFICATION
    ACCOUNT_LOCKED --> BLOCK_REQUEST
    
    style SUSPICIOUS fill:#ffebee
    style ACCOUNT_LOCKED fill:#ffcdd2
    style BLOCK_REQUEST fill:#ef5350
```

---
## 7. PIN Management System
---

```mermaid
stateDiagram-v2
    [*] --> Generated: Generate PIN
    Generated --> Stored: Store in Memory
    
    Stored --> Validating: Validate Attempt
    
    Validating --> Success: PIN Correct
    Validating --> Failed: PIN Incorrect
    Validating --> Expired: Time Exceeded
    
    Failed --> Locked: Max Attempts Reached
    Failed --> Stored: Retry Available
    
    Success --> Cleared: Clear PIN
    Expired --> Cleared: Auto Cleanup
    Locked --> Cleared: Manual Unlock
    
    Cleared --> [*]
    
    note right of Generated
        4-digit numeric PIN
        10-minute expiration
        Max 5 attempts
    end note
    
    note right of Locked
        Account temporarily locked
        Requires unlock code
        Security event logged
    end note
```

---
## 8. Account Recovery Flow
---

```mermaid
sequenceDiagram
    participant User
    participant API
    participant RecoveryService
    participant Database
    participant EmailService

    Note over User,EmailService: Request Account Unlock
    
    User->>API: POST /auth/request-unlock
    Note right of User: { email }
    
    API->>RecoveryService: requestAccountUnlock()
    RecoveryService->>Database: Find user by email
    
    alt User Not Found
        RecoveryService-->>User: 200 (Generic message)
        Note right of RecoveryService: Don't reveal if user exists
    end
    
    RecoveryService->>RecoveryService: Generate 6-digit unlock code
    RecoveryService->>RecoveryService: Store code with 30min expiration
    RecoveryService->>EmailService: Send unlock code
    RecoveryService-->>User: 200 { message, debugUnlockCode }
    
    Note over User,EmailService: Unlock Account
    
    User->>API: POST /auth/unlock-account
    Note right of User: { email, unlockCode }
    
    API->>RecoveryService: unlockAccount()
    RecoveryService->>RecoveryService: Validate unlock code
    RecoveryService->>RecoveryService: Check expiration
    RecoveryService->>RecoveryService: Check attempts (max 3)
    
    alt Invalid Code
        RecoveryService-->>User: 400 Invalid code
    end
    
    alt Expired Code
        RecoveryService-->>User: 400 Code expired
    end
    
    RecoveryService->>RecoveryService: Clear unlock code
    RecoveryService-->>User: 200 Account unlocked
```

---
## 9. Database Schema
---

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password
        string first_name
        string last_name
        string auth0_id UK
        jsonb auth0_data
        string refresh_token
        timestamp refresh_token_expires_at
        boolean is_active
        timestamp last_login
        timestamp created_at
        timestamp updated_at
    }
    
    SECURITY_EVENTS {
        uuid id PK
        string user_id FK
        string event_type
        string ip_address
        string user_agent
        jsonb details
        timestamp created_at
    }
    
    PIN_STORAGE {
        string user_id PK
        string pin_hash
        int attempts
        int max_attempts
        timestamp expires_at
        timestamp created_at
    }
    
    UNLOCK_CODES {
        string email PK
        string code_hash
        int attempts
        int max_attempts
        timestamp expires_at
        timestamp created_at
    }
    
    USERS ||--o{ SECURITY_EVENTS : "generates"
    USERS ||--o| PIN_STORAGE : "has"
    USERS ||--o| UNLOCK_CODES : "requests"
```

---
## 10. API Routes Structure
---

```mermaid
graph LR
    subgraph "Public Routes"
        HEALTH[/api/health]
        PING[/api/ping]
        STATUS[/api/status]
    end

    subgraph "Auth Routes - Legacy"
        REGISTER[/auth/register]
        VALIDATE_CRED[/auth/validate-credentials]
        VALIDATE_PIN[/auth/validate-pin]
        VALIDATE_LOC[/auth/validate-location]
        LOGOUT[/auth/logout]
        REFRESH[/auth/refresh-tokens]
    end

    subgraph "Auth Routes - Auth0"
        AUTH0_CALLBACK[/auth/auth0/callback]
        PROFILE[/auth/profile]
        UPDATE_PROFILE[/auth/profile]
        SYNC_PROFILE[/auth/profile/sync]
        DELETE_ACCOUNT[/auth/account]
    end

    subgraph "Security Routes"
        SEC_EVENTS[/auth/security/events]
        SEC_CLEANUP[/auth/security/cleanup]
    end

    subgraph "Recovery Routes"
        REQUEST_UNLOCK[/auth/request-unlock]
        UNLOCK[/auth/unlock-account]
    end

    subgraph "Protected Routes"
        ROOT[/]
        LEGACY[/legacy]
    end

    style HEALTH fill:#c8e6c9
    style REGISTER fill:#fff9c4
    style AUTH0_CALLBACK fill:#e1bee7
    style SEC_EVENTS fill:#ffccbc
    style REQUEST_UNLOCK fill:#b3e5fc
    style ROOT fill:#f8bbd0
```

---
## 11. Middleware Stack Flow
---

```mermaid
graph TD
    START[Incoming Request] --> JSON_PARSER[JSON Body Parser]
    JSON_PARSER --> ROUTE_MATCH[Route Matcher]
    
    ROUTE_MATCH --> IS_PROTECTED{Protected Route?}
    
    IS_PROTECTED -->|Yes| AUTH_TYPE{Auth Type?}
    IS_PROTECTED -->|No| CONTROLLER[Controller Handler]
    
    AUTH_TYPE -->|Legacy| VERIFY_LEGACY[verifyAccessToken]
    AUTH_TYPE -->|Auth0| VERIFY_AUTH0[verifyAuth0Token]
    
    VERIFY_LEGACY --> LEGACY_VALID{Valid Token?}
    VERIFY_AUTH0 --> AUTH0_VALID{Valid Token?}
    
    LEGACY_VALID -->|Yes| VALIDATION[Input Validation]
    LEGACY_VALID -->|No| ERROR_401[401 Unauthorized]
    
    AUTH0_VALID -->|Yes| VALIDATION
    AUTH0_VALID -->|No| ERROR_401
    
    VALIDATION --> VALID_INPUT{Valid Input?}
    VALID_INPUT -->|Yes| CONTROLLER
    VALID_INPUT -->|No| ERROR_400[400 Bad Request]
    
    CONTROLLER --> SUCCESS{Success?}
    SUCCESS -->|Yes| RESPONSE[Send Response]
    SUCCESS -->|No| ERROR_HANDLER[Error Handler]
    
    ERROR_401 --> ERROR_HANDLER
    ERROR_400 --> ERROR_HANDLER
    ERROR_HANDLER --> RESPONSE
    
    RESPONSE --> END[Response Sent]
    
    style START fill:#e3f2fd
    style END fill:#e8f5e9
    style ERROR_401 fill:#ffebee
    style ERROR_400 fill:#fff3e0
    style ERROR_HANDLER fill:#ffcdd2
```

---
## 12. Service Layer Architecture
---

```mermaid
graph TB
    subgraph "Authentication Services"
        CRED_SERVICE[CredentialValidationService]
        PIN_SERVICE[PinValidationService]
        RECOVERY_SERVICE[AccountRecoveryService]
    end

    subgraph "Security Services"
        SEC_MONITOR[SecurityMonitoringService]
        RATE_LIMIT[RateLimitingService]
        SUSPICIOUS[SuspiciousActivityDetector]
    end

    subgraph "User Services"
        USER_MGMT[User Management]
        AUTH0_SYNC[Auth0 Sync Service]
        PROFILE_SERVICE[Profile Service]
    end

    subgraph "Utility Services"
        JWT_UTILS[JWT Utilities]
        PIN_STORAGE_UTIL[PIN Storage]
        HELPERS[Helper Functions]
    end

    subgraph "External Services"
        AUTH0_API[Auth0 API]
        EMAIL_SERVICE[Email Service]
        SMS_SERVICE[SMS Service]
    end

    CRED_SERVICE --> SEC_MONITOR
    CRED_SERVICE --> PIN_SERVICE
    PIN_SERVICE --> PIN_STORAGE_UTIL
    RECOVERY_SERVICE --> EMAIL_SERVICE
    
    SEC_MONITOR --> SUSPICIOUS
    SUSPICIOUS --> RATE_LIMIT
    
    USER_MGMT --> AUTH0_SYNC
    AUTH0_SYNC --> AUTH0_API
    PROFILE_SERVICE --> USER_MGMT
    
    CRED_SERVICE --> JWT_UTILS
    USER_MGMT --> HELPERS
    
    style CRED_SERVICE fill:#e1f5ff
    style SEC_MONITOR fill:#ffebee
    style AUTH0_API fill:#f3e5f5
    style EMAIL_SERVICE fill:#fff3e0
```

---
## 13. Error Handling Flow
---

```mermaid
sequenceDiagram
    participant Controller
    participant Service
    participant Model
    participant Database
    participant ErrorHandler
    participant Client

    Controller->>Service: Call business logic
    Service->>Model: Data operation
    Model->>Database: Query/Update
    
    alt Database Error
        Database-->>Model: Error
        Model-->>Service: Throw error
        Service-->>Controller: Propagate error
        Controller->>ErrorHandler: Pass error
        ErrorHandler->>ErrorHandler: Determine status code
        ErrorHandler->>ErrorHandler: Format error message
        ErrorHandler-->>Client: Error response
    end
    
    alt Validation Error
        Service-->>Controller: Return validation error
        Controller-->>Client: 400 Bad Request
    end
    
    alt Authentication Error
        Service-->>Controller: Return auth error
        Controller-->>Client: 401 Unauthorized
    end
    
    alt Authorization Error
        Service-->>Controller: Return permission error
        Controller-->>Client: 403 Forbidden
    end
    
    alt Resource Not Found
        Service-->>Controller: Return not found
        Controller-->>Client: 404 Not Found
    end
    
    alt Internal Server Error
        Service-->>Controller: Unexpected error
        Controller->>ErrorHandler: Pass error
        ErrorHandler-->>Client: 500 Internal Server Error
    end
```

---
## 14. Data Flow Diagram
---

```mermaid
graph LR
    subgraph "Input Layer"
        CLIENT_REQ[Client Request]
        VALIDATION_IN[Input Validation]
    end

    subgraph "Processing Layer"
        BUSINESS_LOGIC[Business Logic]
        SECURITY_CHECK[Security Checks]
        DATA_TRANSFORM[Data Transformation]
    end

    subgraph "Data Access Layer"
        MODEL_LAYER[Data Models]
        QUERY_BUILDER[Query Builder]
    end

    subgraph "Storage Layer"
        DATABASE[Supabase Database]
        CACHE[In-Memory Cache]
    end

    subgraph "Output Layer"
        RESPONSE_FORMAT[Response Formatter]
        CLIENT_RES[Client Response]
    end

    CLIENT_REQ --> VALIDATION_IN
    VALIDATION_IN --> SECURITY_CHECK
    SECURITY_CHECK --> BUSINESS_LOGIC
    BUSINESS_LOGIC --> DATA_TRANSFORM
    DATA_TRANSFORM --> MODEL_LAYER
    MODEL_LAYER --> QUERY_BUILDER
    QUERY_BUILDER --> DATABASE
    QUERY_BUILDER --> CACHE
    DATABASE --> MODEL_LAYER
    CACHE --> MODEL_LAYER
    MODEL_LAYER --> RESPONSE_FORMAT
    RESPONSE_FORMAT --> CLIENT_RES
    
    style CLIENT_REQ fill:#e3f2fd
    style SECURITY_CHECK fill:#ffebee
    style DATABASE fill:#e8f5e9
    style CLIENT_RES fill:#f3e5f5
```

---
## 15. Deployment Architecture
---

```mermaid
graph TB
    subgraph "External Services"
        AUTH0_CLOUD[Auth0 Cloud]
        SUPABASE_CLOUD[Supabase Cloud]
    end

    subgraph "Hosting Platform - Vercel"
        VERCEL_EDGE[Edge Network]
        
        subgraph "Serverless Functions"
            API_INSTANCE_1[API Instance 1]
            API_INSTANCE_2[API Instance 2]
            API_INSTANCE_N[API Instance N]
        end
    end

    subgraph "Monitoring & Logging"
        LOGS[Application Logs]
        METRICS[Performance Metrics]
        ALERTS[Alert System]
    end

    USERS[End Users] --> VERCEL_EDGE
    VERCEL_EDGE --> API_INSTANCE_1
    VERCEL_EDGE --> API_INSTANCE_2
    VERCEL_EDGE --> API_INSTANCE_N
    
    API_INSTANCE_1 --> AUTH0_CLOUD
    API_INSTANCE_2 --> AUTH0_CLOUD
    API_INSTANCE_N --> AUTH0_CLOUD
    
    API_INSTANCE_1 --> SUPABASE_CLOUD
    API_INSTANCE_2 --> SUPABASE_CLOUD
    API_INSTANCE_N --> SUPABASE_CLOUD
    
    API_INSTANCE_1 --> LOGS
    API_INSTANCE_2 --> LOGS
    API_INSTANCE_N --> LOGS
    
    LOGS --> METRICS
    METRICS --> ALERTS
    
    style USERS fill:#e3f2fd
    style AUTH0_CLOUD fill:#f3e5f5
    style SUPABASE_CLOUD fill:#e8f5e9
    style ALERTS fill:#ffebee
```

---
## 16. Complete Authentication State Machine
---

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> CredentialValidation: Submit credentials
    
    CredentialValidation --> PINRequired: Credentials valid
    CredentialValidation --> Unauthenticated: Invalid credentials
    CredentialValidation --> AccountLocked: Too many failures
    
    PINRequired --> LocationRequired: PIN valid
    PINRequired --> PINRequired: PIN incorrect (retry)
    PINRequired --> AccountLocked: Max PIN attempts
    PINRequired --> Unauthenticated: PIN expired
    
    LocationRequired --> Authenticated: Location valid
    LocationRequired --> Unauthenticated: Location invalid
    
    AccountLocked --> UnlockRequested: Request unlock
    UnlockRequested --> Unauthenticated: Unlock code valid
    UnlockRequested --> AccountLocked: Invalid unlock code
    
    Authenticated --> TokenValid: Active session
    TokenValid --> TokenRefresh: Token near expiration
    TokenRefresh --> TokenValid: Refresh successful
    TokenRefresh --> Unauthenticated: Refresh failed
    
    TokenValid --> Unauthenticated: Logout
    TokenValid --> Unauthenticated: Token expired
    
    Authenticated --> [*]: Session end
```

---
## Diagram Viewing Instructions
---

To view these diagrams:

1. **GitHub**: GitHub natively supports Mermaid diagrams in markdown files
   - Simply view this file on GitHub

2. **VS Code**: Install the "Markdown Preview Mermaid Support" extension
   - Open this file
   - Press Ctrl+Shift+V (or Cmd+Shift+V on Mac)

3. **Online**: Use Mermaid Live Editor
   - Visit: https://mermaid.live/
   - Copy and paste individual diagram code blocks

4. **Documentation Tools**: 
   - GitBook, Notion, Confluence all support Mermaid
   - Copy the diagram code blocks into your documentation

---
## Diagram Legend
---

**Colors:**
- Blue (#e1f5ff, #e3f2fd): Client/External interfaces
- Purple (#e1bee7, #f3e5f5): Auth0 related
- Green (#c8e6c9, #e8f5e9): Database/Storage
- Red (#ffebee, #ffcdd2): Security/Errors
- Orange (#fff3e0, #fff9c4): Processing/Logic
- Pink (#f8bbd0): Protected resources

**Symbols:**
- Rectangles: Processes/Services
- Rounded Rectangles: Components
- Diamonds: Decision points
- Cylinders: Databases
- Circles: Start/End points

