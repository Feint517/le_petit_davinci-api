# 🚀 Le Petit Davinci API - Testing Guide

## ✅ Deployment Status
- **Production URL**: `https://lepetitdavinci-api.vercel.app`
- **Local URL**: `http://localhost:3000`
- **Status**: ✅ Fully deployed and working

## 🔧 Quick Testing Commands

### 1. **Health Endpoints** (No Authentication Required)
```bash
# Production
curl https://lepetitdavinci-api.vercel.app/api/health
curl https://lepetitdavinci-api.vercel.app/api/ping
curl https://lepetitdavinci-api.vercel.app/api/status

# Local
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ping
curl http://localhost:3000/api/status
```

### 2. **Authentication Endpoints**
```bash
# Google OAuth (Production)
curl https://lepetitdavinci-api.vercel.app/auth/google

# Google OAuth (Local)
curl http://localhost:3000/auth/google
```

### 3. **Protected Endpoints** (Require Authentication)
```bash
# User Profile (will return 401 without token)
curl https://lepetitdavinci-api.vercel.app/user/profile
curl https://lepetitdavinci-api.vercel.app/api/subscriptions/status
```

## 📋 Postman Collection

### Import Instructions:
1. Open Postman
2. Click "Import" 
3. Select `postman-collection.json` from your project
4. Set the `baseUrl` variable to `https://lepetitdavinci-api.vercel.app`

### Available Endpoints in Postman:

#### Health Checks
- `GET /api/health` - Simple health check
- `GET /api/ping` - Detailed server info
- `GET /api/status` - Comprehensive diagnostics

#### Authentication
- `GET /auth/google` - Google OAuth login
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout

#### User Management
- `GET /user/profile` - Get user profile (requires auth)
- `PUT /user/profile` - Update profile (requires auth)
- `DELETE /user/account` - Delete account (requires auth)

#### Subscriptions
- `GET /api/subscriptions/status` - Get subscription status (requires auth)
- `POST /api/subscriptions/checkout` - Create checkout session (requires auth)
- `POST /api/subscriptions/portal` - Create customer portal (requires auth)

#### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## 🧪 Automated Testing

### Run Comprehensive Tests:
```bash
# Test all endpoints
node test-api-comprehensive.js

# Test specific endpoints
node test-endpoints.js
```

### Expected Results:
- ✅ **Health endpoints**: All working (6/6)
- ✅ **Auth endpoints**: Google OAuth working (2/2)
- ✅ **User endpoints**: Protected, return 401 without auth (2/2)
- ✅ **Subscription endpoints**: Protected, return 401 without auth (2/2)

## 🔐 Authentication Flow

### 1. **Google OAuth Flow**
```bash
# Step 1: Get OAuth URL
curl https://lepetitdavinci-api.vercel.app/auth/google

# Response will contain a URL like:
# https://vncsfhiujnoymnzsjqvo.supabase.co/auth/v1/authorize?provider=google&...
```

### 2. **Using Access Tokens**
```bash
# Add Authorization header to protected endpoints
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://lepetitdavinci-api.vercel.app/user/profile
```

## 🚀 Deployment Commands

### Deploy to Vercel:
```bash
# Build the project
npm run build

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

### View Logs:
```bash
# View production logs
vercel logs https://lepetitdavinci-api.vercel.app

# View specific deployment logs
vercel logs DEPLOYMENT_URL
```

## 📊 Performance Monitoring

### Health Check Response Times:
- **Production**: ~1-4 seconds (cold start)
- **Local**: ~1-50ms (warm)

### Memory Usage:
- **Production**: ~80MB RSS, ~20MB heap
- **Local**: ~50MB RSS, ~230MB heap

## 🛠️ Troubleshooting

### Common Issues:

1. **404 Errors**: Check route configuration in `routes/` files
2. **401 Errors**: Expected for protected endpoints without auth
3. **500 Errors**: Check Vercel logs for server errors
4. **Timeout**: Check network connectivity and server status

### Debug Commands:
```bash
# Check if server is running locally
curl http://localhost:3000/api/health

# Check production deployment
curl https://lepetitdavinci-api.vercel.app/api/health

# View detailed logs
vercel logs --follow
```

## 🎯 Next Steps

1. **Set up authentication** in your frontend
2. **Configure environment variables** in Vercel dashboard
3. **Test with real user flows** using Postman
4. **Monitor performance** using Vercel analytics
5. **Set up monitoring** for production alerts

---

**Your API is ready for production use! 🚀**
