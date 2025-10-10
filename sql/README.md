# 🗄️ SQL Directory

This directory contains all SQL scripts and database-related files.

## 📋 SQL Files

### **Database Setup**
- **`setup-database.sql`** - Complete database schema setup
  - Creates `users` table with all required fields
  - Sets up indexes for performance
  - Configures Row Level Security (RLS)
  - Creates triggers for automatic timestamp updates
  - Inserts a test user for development

## 🚀 Usage

### **Setting Up Database Schema**

1. **Go to Supabase Dashboard**:
   - Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Schema**:
   - Copy the contents of `setup-database.sql`
   - Paste into SQL Editor
   - Click "Run"

4. **Verify Success**:
   - You should see "Users table created successfully!"
   - Run `npm run test:db` to verify

## 📊 Database Schema

The `users` table includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `first_name` | VARCHAR(255) | User's first name |
| `last_name` | VARCHAR(255) | User's last name |
| `username` | VARCHAR(255) | Unique username |
| `email` | VARCHAR(255) | Required, unique email |
| `phone_number` | VARCHAR(255) | Contact number |
| `password` | TEXT | Hashed password |
| `pin` | TEXT | Hashed 2FA PIN |
| `refresh_token` | TEXT | JWT refresh token |
| `refresh_token_expires_at` | TIMESTAMP | Token expiration |
| `auth0_id` | VARCHAR(255) | Auth0 user ID |
| `auth0_data` | JSONB | Auth0 profile data |
| `is_active` | BOOLEAN | Account status |
| `last_login` | TIMESTAMP | Last login time |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update time |

## 🔐 Security Features

- **Row Level Security (RLS)**: Enabled
- **Indexes**: Optimized for common queries
- **Triggers**: Automatic timestamp updates
- **Policies**: Basic CRUD operations allowed

## 📝 Adding New SQL Files

When adding new SQL files:

1. **Use descriptive names**: `migration-YYYY-MM-DD-description.sql`
2. **Include comments**: Document what each script does
3. **Test thoroughly**: Run in development first
4. **Update this README**: Document new files
