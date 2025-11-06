# Admin Management Scripts

This directory contains scripts for managing admin users in your Flyx application's Neon database.

## Prerequisites

- Node.js installed
- `.env.local` file with `DATABASE_URL` configured for your Neon database
- Neon database with `admin_users` table created (automatically created when the app starts)

## Available Scripts

### 1. Create Admin User

Creates a new admin user or updates the password of an existing one.

```bash
# Using npm script (recommended)
npm run admin:create <username> <password>

# Direct execution
node scripts/create-admin.js <username> <password>
```

**Example:**
```bash
npm run admin:create admin mySecurePassword123
```

**Features:**
- ✅ Automatically hashes passwords with bcrypt (12 salt rounds)
- ✅ Checks if user already exists and updates password if needed
- ✅ Verifies the user was created successfully
- ✅ Works with both Neon PostgreSQL and SQLite
- ✅ Comprehensive error handling and logging

### 2. List Admin Users

Lists all existing admin users with their details.

```bash
# Using npm script (recommended)
npm run admin:list

# Direct execution
node scripts/list-admins.js
```

**Output includes:**
- Username
- User ID
- Creation date
- Last login date

### 3. Delete Admin User

Removes an admin user from the database.

```bash
# Using npm script (recommended)
npm run admin:delete <username>

# Direct execution
node scripts/delete-admin.js <username>
```

**Example:**
```bash
npm run admin:delete oldadmin
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Strong Passwords**: Always use strong passwords for admin accounts
2. **Change Default Passwords**: Change the password after first login
3. **Don't Commit Credentials**: Never commit admin credentials to version control
4. **Limit Admin Access**: Only create admin accounts for trusted users
5. **Regular Audits**: Regularly review and clean up unused admin accounts

## Database Schema

The scripts work with the `admin_users` table:

```sql
CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at BIGINT,
  last_login BIGINT
);
```

## Troubleshooting

### Common Issues

1. **"DATABASE_URL not found"**
   - Ensure `.env.local` exists with `DATABASE_URL` set
   - Check that the environment variable is properly formatted

2. **"admin_users table does not exist"**
   - Start your Next.js app once to initialize the database tables
   - Or run the database initialization script

3. **Connection errors**
   - Verify your Neon database is running
   - Check network connectivity
   - Ensure the DATABASE_URL is correct

### Getting Help

If you encounter issues:

1. Check the error messages - they include troubleshooting tips
2. Verify your `.env.local` configuration
3. Ensure your Neon database is accessible
4. Check the Next.js app logs for database initialization errors

## Admin Panel Access

After creating an admin user, access the admin panel at:
- **Local Development**: http://localhost:3000/admin
- **Production**: https://yourdomain.com/admin

Use the username and password you created with these scripts to log in.