# 🧪 Tests Directory

This directory contains all test scripts for the Le Petit Davinci API.

## 📋 Test Scripts

### **Database Tests**
- **`test-db-connection.js`** - Tests Supabase database connection and schema
  ```bash
  npm run test:db
  ```

### **Server Tests**
- **`test-server.js`** - Tests basic server functionality without database
  ```bash
  npm run test:server
  ```

### **Authentication Tests**
- **`test-auth.js`** - Complete 3-step authentication flow tests
  ```bash
  npm run test:auth
  ```

### **User Management Tests**
- **`create-test-user.js`** - Creates a test user in the database
  ```bash
  npm run test:user
  ```

## 🚀 Quick Start

1. **Test basic server**: `npm run test:server`
2. **Test database connection**: `npm run test:db`
3. **Create test user**: `npm run test:user`
4. **Test full authentication**: `npm run test:auth`

## 📊 Expected Results

- **Server tests**: 5/6 pass (auth endpoints fail without DB)
- **Database tests**: Pass when schema is set up
- **User creation**: Pass when database is configured
- **Auth tests**: 10/10 pass when everything is set up

## 🔧 Prerequisites

- Server running (`npm run dev`)
- Supabase database configured
- Database schema created (see `../sql/setup-database.sql`)
