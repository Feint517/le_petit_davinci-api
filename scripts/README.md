# 🔧 Scripts Directory

This directory contains utility scripts for development and maintenance.

## 📋 Scripts

### **Environment Setup**
- **`setup-env.js`** - Creates initial `.env` file with template
  ```bash
  npm run setup
  ```

- **`update-env.js`** - Updates existing `.env` file with JWT secrets
  ```bash
  npm run update-env
  ```

## 🚀 Usage

### **Initial Setup**
```bash
# Create .env file with template
npm run setup

# Update JWT secrets in existing .env
npm run update-env
```

### **What These Scripts Do**

#### **setup-env.js**
- Creates `.env` file with all required environment variables
- Generates secure JWT secrets
- Provides setup instructions
- Checks for existing `.env` file

#### **update-env.js**
- Updates existing `.env` file
- Generates new JWT secrets
- Fixes variable names to match code expectations
- Validates Supabase configuration

## 🔐 Security

- **JWT Secrets**: Generated using crypto.randomBytes()
- **Environment Variables**: Never committed to git
- **Backup**: Creates `.env.backup` before modifications

## 📝 Adding New Scripts

When adding new utility scripts:

1. **Use descriptive names**: `action-description.js`
2. **Add to package.json**: Include in scripts section
3. **Include help text**: Use colored console output
4. **Handle errors gracefully**: Provide clear error messages
5. **Update this README**: Document new scripts

## 🎯 Best Practices

- **Idempotent**: Scripts should be safe to run multiple times
- **Informative**: Provide clear feedback on what's happening
- **Safe**: Always backup before making changes
- **Tested**: Verify scripts work in different scenarios
