# 🎨 Le Petit Davinci API

A modern, scalable Node.js/TypeScript API server with Supabase authentication, Stripe subscriptions, and comprehensive testing.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd api-server

# Install dependencies
npm install

# Set up environment variables
npm run setup

# Start development server
npm run dev
```

### Testing
```bash
# Run comprehensive tests
node testing/test-api-comprehensive.js

# Import Postman collection
# Open Postman → Import → testing/postman-collection.json
```

## 📁 Project Structure

```
api-server/
├── 📁 controllers/          # Route controllers
├── 📁 middlewares/          # Express middlewares  
├── 📁 models/              # Data models
├── 📁 routes/              # API routes
├── 📁 services/            # Business logic
├── 📁 utils/               # Utility functions
├── 📁 testing/             # Test scripts and tools
├── 📁 docs/               # Documentation
├── 📁 dist/               # Compiled TypeScript
├── 📄 app.ts              # Main application
├── 📄 package.json        # Dependencies
└── 📄 vercel.json         # Vercel configuration
```

## 🌐 API Endpoints

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

## 🚀 Deployment

### Production URLs
- **API**: `https://lepetitdavinci-api.vercel.app`
- **Health Check**: `https://lepetitdavinci-api.vercel.app/api/health`

### Deploy to Vercel
```bash
# Build project
npm run build

# Deploy to production
vercel --prod
```

## 🧪 Testing

### Automated Testing
```bash
# Run all tests
node testing/test-api-comprehensive.js

# Test specific endpoints
node testing/test-endpoints.js
```

### Manual Testing
1. Import `testing/postman-collection.json` into Postman
2. Set base URL to your API endpoint
3. Test all endpoints systematically

## 📚 Documentation

- **[Complete Documentation](docs/README.md)** - Full documentation
- **[Testing Guide](docs/TESTING-GUIDE.md)** - Comprehensive testing guide
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture
- **[Setup Guide](docs/SETUP-GUIDE.md)** - Initial setup

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run test:db      # Test database connection
npm run test:server  # Test server endpoints
npm run test:auth    # Test authentication
```

### Environment Variables
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# JWT
JWT_SECRET=your_jwt_secret
```

## 🛠️ Features

- ✅ **Supabase Authentication** - Secure user authentication
- ✅ **Google OAuth** - Social login integration
- ✅ **Stripe Subscriptions** - Payment processing
- ✅ **JWT Tokens** - Secure API access
- ✅ **Health Monitoring** - Comprehensive health checks
- ✅ **TypeScript** - Type-safe development
- ✅ **Testing Suite** - Automated and manual testing
- ✅ **Vercel Deployment** - Production-ready hosting

## 📊 Performance

- **Response Time**: 200ms - 4s (production)
- **Memory Usage**: ~80MB RSS (production)
- **Uptime**: 99.9% (Vercel hosting)
- **Security**: OWASP compliant

## 🚨 Troubleshooting

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
1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [testing guide](docs/TESTING-GUIDE.md)
3. Check [Vercel logs](https://vercel.com/dashboard)
4. Review environment variables

---

**Le Petit Davinci API - Production Ready! 🚀**

*Built with ❤️ using Node.js, TypeScript, Supabase, and Stripe*
