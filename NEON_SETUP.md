# Neon PostgreSQL Setup Guide

This project uses **Neon Serverless PostgreSQL** for production and **SQLite** for local development.

## 🚀 Quick Setup

### 1. Create a Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project

### 2. Get Your Connection String
1. In your Neon dashboard, go to **Connection Details**
2. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
   ```

### 3. Configure Environment Variables

#### For Vercel Deployment:
1. Go to your Vercel project settings
2. Add environment variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Neon connection string

#### For Local Development:
Add to your `.env.local` file:
```bash
# Optional: Use Neon for local development too
# DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require

# Leave empty to use SQLite locally (recommended)
# DATABASE_URL=
```

## 🔧 How It Works

### Automatic Database Selection
- **Production (with DATABASE_URL)**: Uses Neon PostgreSQL
- **Local Development (no DATABASE_URL)**: Uses SQLite
- **Fallback**: In-memory SQLite if file system is read-only

### Database Features
- ✅ **Cross-platform compatibility**
- ✅ **Automatic table creation**
- ✅ **Schema migrations**
- ✅ **Connection pooling** (Neon)
- ✅ **Serverless-optimized** (Neon)

## 📊 Admin User Setup

Create an admin user for both environments:

```bash
# Local development (SQLite)
bun scripts/create-admin.js admin your-password

# Production will use the same admin user via Neon
```

## 🧪 Testing

Test your setup:

```bash
# Start development server
bun run dev

# Test analytics endpoint
curl http://localhost:3000/api/analytics/track

# Test admin login
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

## 🌐 Production Deployment

1. **Set DATABASE_URL** in Vercel environment variables
2. **Deploy** your application
3. **Create admin user** (run the script locally, it will create the user in Neon)
4. **Access admin panel** at `https://your-domain.com/admin`

## 🔍 Monitoring

### Neon Dashboard
- Monitor database performance
- View connection statistics
- Check query performance

### Application Logs
- Analytics events are logged with detailed request IDs
- Database connection status is logged on startup
- Error handling with fallback mechanisms

## 🛠️ Troubleshooting

### Common Issues

1. **Connection String Format**
   ```bash
   # Correct format
   postgresql://user:pass@host/db?sslmode=require
   
   # Make sure to include ?sslmode=require
   ```

2. **Environment Variables**
   - Vercel: Set in project settings
   - Local: Add to `.env.local`
   - Make sure no trailing spaces

3. **Database Permissions**
   - Neon automatically handles permissions
   - No manual database setup required

### Debug Mode
Enable detailed logging by checking server console for:
- `Initializing Neon PostgreSQL connection...`
- `Initializing SQLite for local development...`
- Database connection success/failure messages

## 📈 Benefits of Neon

- **Serverless**: Perfect for Vercel deployments
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost-effective**: Pay only for what you use
- **PostgreSQL compatible**: Full SQL feature set
- **Built-in connection pooling**: No connection limit issues
- **Instant provisioning**: Database ready in seconds

## 🔄 Migration from SQLite

If you have existing SQLite data, you can:
1. Export data from SQLite
2. Import into Neon using standard PostgreSQL tools
3. Update environment variables
4. Redeploy

The application will automatically detect and use the appropriate database based on the `DATABASE_URL` environment variable.