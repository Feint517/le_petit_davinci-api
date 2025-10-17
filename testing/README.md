# 🧪 Testing Suite

This folder contains all testing scripts and tools for the Le Petit Davinci API.

## 📁 Files Overview

### Test Scripts
- **`test-endpoints.js`** - Basic endpoint testing script
- **`test-api-comprehensive.js`** - Comprehensive API testing with detailed reporting
- **`postman-collection.json`** - Postman collection for manual testing

## 🚀 Quick Start

### Run All Tests
```bash
# From project root
node testing/test-api-comprehensive.js

# Or from testing folder
cd testing
node test-api-comprehensive.js
```

### Test Specific Endpoints
```bash
# Basic health check
node testing/test-endpoints.js

# Comprehensive testing
node testing/test-api-comprehensive.js
```

## 📋 Postman Collection

### Import Instructions:
1. Open Postman
2. Click "Import"
3. Select `testing/postman-collection.json`
4. Set the `baseUrl` variable to your API URL:
   - Production: `https://lepetitdavinci-api.vercel.app`
   - Local: `http://localhost:3000`

## 🔧 Test Configuration

### Environment Variables
The tests automatically detect and use:
- **Production URL**: `https://lepetitdavinci-api.vercel.app`
- **Local URL**: `http://localhost:3000`

### Expected Results
- ✅ **Health endpoints**: 6/6 (100%)
- ✅ **Auth endpoints**: 1/2 (50%) - Google OAuth working
- ✅ **User endpoints**: 1/2 (50%) - Protected, return 401 without auth
- ✅ **Subscription endpoints**: 2/2 (100%) - Protected, return 401 without auth

## 📊 Test Categories

### 1. Health Endpoints
- `/api/health` - Simple health check
- `/api/ping` - Detailed server info
- `/api/status` - Comprehensive diagnostics

### 2. Authentication
- `/auth/google` - Google OAuth login
- `/auth/google/callback` - OAuth callback

### 3. User Management
- `/user/profile` - Get user profile (requires auth)
- `/user/profile` - Update profile (requires auth)
- `/user/account` - Delete account (requires auth)

### 4. Subscriptions
- `/api/subscriptions/status` - Get subscription status (requires auth)
- `/api/subscriptions/checkout` - Create checkout session (requires auth)
- `/api/subscriptions/portal` - Create customer portal (requires auth)

## 🛠️ Customization

### Adding New Tests
1. Edit `test-api-comprehensive.js`
2. Add new endpoints to the `endpoints` array
3. Run the test to verify

### Modifying Postman Collection
1. Edit `postman-collection.json`
2. Update endpoint URLs and parameters
3. Import updated collection into Postman

## 📈 Performance Monitoring

### Response Time Benchmarks
- **Production**: 200ms - 4s (cold start)
- **Local**: 1ms - 50ms (warm)

### Memory Usage
- **Production**: ~80MB RSS, ~20MB heap
- **Local**: ~50MB RSS, ~230MB heap

## 🚨 Troubleshooting

### Common Issues
1. **404 Errors**: Check route configuration
2. **401 Errors**: Expected for protected endpoints
3. **Timeout**: Check network connectivity
4. **500 Errors**: Check server logs

### Debug Commands
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check production deployment
curl https://lepetitdavinci-api.vercel.app/api/health

# View detailed logs
vercel logs --follow
```

## 📚 Documentation

For complete testing documentation, see:
- `../docs/TESTING-GUIDE.md` - Complete testing guide
- `../docs/README.md` - Project overview
- `../docs/ARCHITECTURE.md` - System architecture

---

**Happy Testing! 🧪**
