# 🎨 Le Petit Davinci API

A Node.js/TypeScript backend API with Supabase integration and comprehensive authentication system.

## 🏗️ Project Structure

```
api-server/
├── 📁 controllers/          # Request handlers
├── 📁 cron/                # Scheduled tasks
├── 📁 docs/                # Documentation
├── 📁 middlewares/         # Express middlewares
├── 📁 models/              # Data models
├── 📁 routes/              # API routes
├── 📁 scripts/             # Utility scripts
├── 📁 services/            # Business logic
├── 📁 sql/                 # Database scripts
├── 📁 tests/               # Test scripts
├── 📁 utils/               # Helper utilities
├── 📁 validation/          # Input validation
├── 📄 app.ts               # Main application
├── 📄 package.json         # Dependencies & scripts
└── 📄 tsconfig.json        # TypeScript config
```

## 🚀 Quick Start

### **1. Install Dependencies**
```bash
npm install
```

### **2. Set Up Environment**
```bash
# Create .env file with Supabase credentials
npm run setup

# Update JWT secrets
npm run update-env
```

### **3. Set Up Database**
1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the SQL from `sql/setup-database.sql`

### **4. Start Development Server**
```bash
npm run dev
```

### **5. Test the System**
```bash
# Test basic server functionality
npm run test:server

# Test database connection
npm run test:db

# Create test user
npm run test:user

# Test full authentication flow
npm run test:auth
```

## 📋 Available Scripts

### **Development**
- `npm run dev` - Start development server
- `npm run dev:watch` - Start with auto-reload
- `npm run build` - Build for production
- `npm run type-check` - TypeScript type checking

### **Setup & Configuration**
- `npm run setup` - Create initial .env file
- `npm run update-env` - Update JWT secrets

### **Testing**
- `npm run test:server` - Test basic server functionality
- `npm run test:db` - Test database connection
- `npm run test:user` - Create test user
- `npm run test:auth` - Test complete authentication flow

## 🔐 Authentication System

### **3-Step Authentication Flow**
1. **Credential Validation** - Email/password verification
2. **PIN Validation** - 4-digit PIN verification
3. **Location Validation** - Geolocation verification

### **Features**
- ✅ User registration with validation
- ✅ Multi-factor authentication (PIN)
- ✅ JWT access & refresh tokens
- ✅ Geolocation validation
- ✅ Secure password hashing
- ✅ Input validation with Joi
- ✅ Row Level Security (RLS)

## 🗄️ Database

- **Database**: Supabase (PostgreSQL)
- **ORM**: Custom Supabase client
- **Security**: Row Level Security enabled
- **Schema**: See `sql/setup-database.sql`

## 📚 Documentation

- **Tests**: `tests/README.md`
- **SQL Scripts**: `sql/README.md`
- **Utility Scripts**: `scripts/README.md`
- **General Docs**: `docs/README.md`

## 🔧 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Auth0 (optional)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=your-audience
```

## 🧪 Testing

The project includes comprehensive test scripts:

- **Server Tests**: Basic functionality without database
- **Database Tests**: Connection and schema validation
- **User Tests**: User creation and management
- **Auth Tests**: Complete authentication flow

All tests are located in the `tests/` directory with detailed documentation.

## 🚀 Deployment

### **Vercel**
The project is configured for Vercel deployment with `vercel.json`.

### **Environment Setup**
1. Set all environment variables in your deployment platform
2. Ensure Supabase database is accessible
3. Run database migrations if needed

## 📝 API Endpoints

### **Authentication**
- `POST /auth/register` - User registration
- `POST /auth/validate-credentials` - Step 1: Credential validation
- `POST /auth/validate-pin` - Step 2: PIN validation
- `POST /auth/validate-location` - Step 3: Location validation
- `POST /auth/logout` - User logout
- `POST /auth/refresh-tokens` - Token refresh

### **Health Check**
- `GET /auth/health` - Service health status

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure access and refresh tokens
- **Input Validation**: Joi schemas for all endpoints
- **Row Level Security**: Database-level access control
- **PIN Security**: Temporary PIN storage with expiration
- **Geolocation**: Basic coordinate validation

## 🤝 Contributing

1. Follow the established folder structure
2. Add tests for new features
3. Update documentation
4. Use TypeScript strict mode
5. Follow existing code patterns

## 📄 License

ISC License

---

**Status**: ✅ Production Ready
