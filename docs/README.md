# 📚 Documentation

This folder contains all documentation for the Le Petit Davinci API project.

## 📁 Documentation Structure

### 🏗️ Architecture & Setup
- **`ARCHITECTURE.md`** - System architecture overview
- **`architecture-diagrams.md`** - Visual architecture diagrams
- **`SETUP-GUIDE.md`** - Initial setup instructions
- **`README.md`** - Project overview and quick start

### 🔐 Authentication
- **`SUPABASE-AUTH-GUIDE.md`** - Supabase authentication setup
- **`GOOGLE-OAUTH-GUIDE.md`** - Google OAuth configuration
- **`GOOGLE-OAUTH-SETUP-COMPLETE.md`** - Google OAuth setup completion

### 💳 Payments & Subscriptions
- **`STRIPE-SUBSCRIPTION-GUIDE.md`** - Stripe subscription implementation
- **`STRIPE-SETUP-COMPLETE.md`** - Stripe setup completion

### 🚀 Implementation
- **`IMPLEMENTATION-SUMMARY.md`** - Implementation overview
- **`IMPLEMENTATION-COMPLETE.md`** - Implementation completion status
- **`TESTING-GUIDE.md`** - Comprehensive testing guide

## 🚀 Quick Start

### 1. Setup
```bash
# Install dependencies
npm install

# Set up environment variables
npm run setup

# Start development server
npm run dev
```

### 2. Testing
```bash
# Run comprehensive tests
node testing/test-api-comprehensive.js

# Import Postman collection
# Open Postman → Import → testing/postman-collection.json
```

### 3. Deployment
```bash
# Build project
npm run build

# Deploy to Vercel
vercel --prod
```

## 📋 API Endpoints

### Health Checks
- `GET /api/health` - Simple health check
- `GET /api/ping` - Detailed server info
- `GET /api/status` - Comprehensive diagnostics

### Authentication
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout

### User Management
- `GET /user/profile` - Get user profile (requires auth)
- `PUT /user/profile` - Update profile (requires auth)
- `DELETE /user/account` - Delete account (requires auth)

### Subscriptions
- `GET /api/subscriptions/status` - Get subscription status (requires auth)
- `POST /api/subscriptions/checkout` - Create checkout session (requires auth)
- `POST /api/subscriptions/portal` - Create customer portal (requires auth)

## 🔧 Development

### Project Structure
```
api-server/
├── controllers/          # Route controllers
├── middlewares/          # Express middlewares
├── models/              # Data models
├── routes/              # API routes
├── services/            # Business logic
├── utils/               # Utility functions
├── testing/             # Test scripts and tools
├── docs/               # Documentation
└── dist/               # Compiled TypeScript
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run test:db      # Test database connection
npm run test:server  # Test server endpoints
npm run test:auth    # Test authentication
```

## 🌐 Deployment

### Production URLs
- **API**: `https://lepetitdavinci-api.vercel.app`
- **Health Check**: `https://lepetitdavinci-api.vercel.app/api/health`
- **Google OAuth**: `https://lepetitdavinci-api.vercel.app/auth/google`

### Environment Variables
Required environment variables for production:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `JWT_SECRET`

## 📊 Monitoring

### Health Monitoring
- **Status**: `GET /api/status`
- **Memory Usage**: Included in status response
- **Uptime**: Included in status response

### Performance Metrics
- **Response Time**: 200ms - 4s (production)
- **Memory Usage**: ~80MB RSS (production)
- **Uptime**: 99.9% (Vercel hosting)

## 🛠️ Troubleshooting

### Common Issues
1. **404 Errors**: Check route configuration
2. **401 Errors**: Authentication required
3. **500 Errors**: Check server logs
4. **Timeout**: Check network connectivity

### Debug Commands
```bash
# Check local server
curl http://localhost:3000/api/health

# Check production
curl https://lepetitdavinci-api.vercel.app/api/health

# View logs
vercel logs --follow
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the testing guide
3. Check Vercel logs
4. Review environment variables

---

**Le Petit Davinci API - Production Ready! 🚀**