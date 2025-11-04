# Admin Authentication System

Complete authentication system for the Flyx admin panel with secure login, JWT tokens, and HTTP-only cookies.

## Features

✅ **Secure Authentication**
- Bcrypt password hashing (12 rounds)
- JWT token generation and validation
- HTTP-only cookies for token storage
- Secure session management

✅ **Rate Limiting**
- 5 login attempts per 15 minutes
- 15-minute lockout after max attempts
- IP-based rate limiting
- Automatic cleanup of expired entries

✅ **Authentication Guard**
- Server-side authentication check
- Automatic redirect to login
- Protected admin routes
- Token verification middleware

✅ **User Experience**
- Modern, responsive login form
- Real-time validation
- Loading states
- Error handling with user-friendly messages

## Setup

### 1. Create Admin User

Use the provided script to create an admin user:

```bash
bun run scripts/create-admin.ts <username> <password>
```

Example:
```bash
bun run scripts/create-admin.ts admin MySecurePass123
```

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# Admin JWT Secret (change in production!)
ADMIN_JWT_SECRET=your-super-secret-jwt-key-change-this

# Session duration (default: 1h)
ADMIN_SESSION_DURATION=1h
```

### 3. Access Admin Panel

Navigate to: `http://localhost:3000/admin/login`

## API Routes

### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "MySecurePass123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "createdAt": 1234567890,
    "lastLogin": 1234567890
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

### POST /api/auth/logout
Logout and clear authentication cookie.

**Response:**
```json
{
  "success": true
}
```

### GET /api/auth/verify
Verify current authentication status.

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "userId": "uuid",
    "username": "admin"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Username Requirements
- 3-50 characters
- Letters, numbers, hyphens, and underscores only

### Rate Limiting
- 5 failed attempts allowed per 15-minute window
- 15-minute lockout after exceeding limit
- IP-based tracking
- Automatic reset on successful login

### Token Security
- JWT tokens with 1-hour expiration
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag (HTTPS only in production)
- SameSite=Strict (CSRF protection)

## Usage in Components

### Client-Side Authentication Check

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedComponent() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      
      if (!data.authenticated) {
        router.push('/admin/login');
      } else {
        setAuthenticated(true);
      }
    }
    
    checkAuth();
  }, [router]);

  if (!authenticated) {
    return <div>Loading...</div>;
  }

  return <div>Protected content</div>;
}
```

### Server-Side Authentication (API Routes)

```typescript
import { withAuth } from '@/lib/middleware/auth';
import { NextRequest, NextResponse } from 'next/server';

export const GET = withAuth(async (request, user) => {
  // user is guaranteed to be authenticated here
  return NextResponse.json({
    message: `Hello ${user.username}!`,
  });
});
```

### Server-Side Authentication (Pages)

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/utils/auth';

export default async function ProtectedPage() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');
  const user = authToken ? verifyToken(authToken.value) : null;
  
  if (!user) {
    redirect('/admin/login');
  }
  
  return <div>Hello {user.username}!</div>;
}
```

## File Structure

```
app/
├── admin/
│   ├── login/
│   │   ├── LoginForm.tsx          # Login form component
│   │   ├── LoginForm.module.css   # Login form styles
│   │   ├── page.tsx               # Login page
│   │   └── layout.tsx             # Login layout (no auth)
│   ├── layout.tsx                 # Admin layout (with auth guard)
│   ├── page.tsx                   # Admin dashboard
│   ├── AdminNav.tsx               # Admin navigation
│   ├── admin.module.css           # Admin layout styles
│   ├── dashboard.module.css       # Dashboard styles
│   └── README.md                  # This file
├── api/
│   └── auth/
│       ├── login/route.ts         # Login endpoint
│       ├── logout/route.ts        # Logout endpoint
│       └── verify/route.ts        # Verify endpoint
├── lib/
│   ├── middleware/
│   │   └── auth.ts                # Auth middleware
│   └── utils/
│       ├── auth.ts                # Auth utilities
│       └── rate-limiter.ts        # Rate limiting
└── types/
    └── auth.ts                    # Auth type definitions

scripts/
└── create-admin.ts                # Admin user creation script
```

## Testing

### Manual Testing

1. **Create Admin User:**
   ```bash
   bun run scripts/create-admin.ts testadmin TestPass123
   ```

2. **Test Login:**
   - Navigate to `http://localhost:3000/admin/login`
   - Enter credentials
   - Should redirect to `/admin` on success

3. **Test Rate Limiting:**
   - Try logging in with wrong password 5 times
   - Should see rate limit error on 6th attempt

4. **Test Authentication Guard:**
   - Navigate to `http://localhost:3000/admin` without logging in
   - Should redirect to `/admin/login`

5. **Test Logout:**
   - Click logout button
   - Should redirect to login page
   - Trying to access `/admin` should redirect to login

### API Testing with curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MySecurePass123"}' \
  -c cookies.txt

# Verify (with cookie)
curl http://localhost:3000/api/auth/verify \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## Next Steps

The authentication system is complete. Future tasks will implement:

- Task 13: Admin dashboard overview with metrics
- Task 14: Detailed analytics views
- Task 17: Analytics API routes with authentication

## Troubleshooting

### "Admin user already exists"
Delete the existing user from the database or use a different username.

### "Invalid username or password"
- Check that the username and password are correct
- Ensure the admin user was created successfully
- Check database connection

### Rate limit errors
Wait 15 minutes or restart the server to clear rate limits.

### Cookie not being set
- Ensure you're using HTTPS in production
- Check browser cookie settings
- Verify `Secure` flag is only set in production

## Security Recommendations

1. **Change JWT Secret:** Always use a strong, random JWT secret in production
2. **Use HTTPS:** Enable HTTPS in production for secure cookies
3. **Strong Passwords:** Enforce strong password policies
4. **Regular Updates:** Keep dependencies updated for security patches
5. **Monitor Logs:** Track failed login attempts and suspicious activity
6. **Backup Database:** Regular backups of the admin_users table
