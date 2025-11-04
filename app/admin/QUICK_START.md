# Admin Authentication - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Create an Admin User

```bash
bun run admin:create admin Admin123!
```

You should see:
```
✓ Database initialized successfully
Hashing password...
✅ Admin user created successfully!
Username: admin
User ID: [uuid]

You can now login at: http://localhost:3000/admin/login
```

### Step 2: Start the Development Server

```bash
bun run dev
```

### Step 3: Login to Admin Panel

1. Open your browser to: `http://localhost:3000/admin/login`
2. Enter credentials:
   - Username: `admin`
   - Password: `Admin123!`
3. Click "Sign In"
4. You'll be redirected to the admin dashboard

## 🧪 Test the Features

### Test Authentication Guard
1. Try accessing `http://localhost:3000/admin` without logging in
2. You should be automatically redirected to the login page

### Test Rate Limiting
1. Try logging in with wrong password 5 times
2. On the 6th attempt, you should see: "Too many login attempts. Please try again in X seconds."

### Test Logout
1. Click the "Logout" button in the admin navigation
2. You should be redirected to the login page
3. Try accessing `/admin` again - you'll be redirected to login

### Test Session Persistence
1. Login to the admin panel
2. Refresh the page
3. You should remain logged in (cookie-based session)

## 🔐 Security Features in Action

### Password Requirements
Try creating a user with a weak password:
```bash
bun run admin:create test weak
```
You'll see: "Invalid password: Password must be at least 8 characters long"

### Username Validation
Try creating a user with invalid characters:
```bash
bun run admin:create "test user" Admin123!
```
You'll see: "Invalid username: Username can only contain letters, numbers, hyphens, and underscores"

## 📡 API Testing

### Test Login API
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' \
  -c cookies.txt -v
```

### Test Verify API
```bash
curl http://localhost:3000/api/auth/verify \
  -b cookies.txt
```

### Test Logout API
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt -v
```

## 🎨 UI Features

### Login Form
- ✅ Responsive design (mobile & desktop)
- ✅ Real-time validation
- ✅ Loading states with spinner
- ✅ Error messages with icons
- ✅ Glassmorphism design
- ✅ Smooth animations

### Admin Navigation
- ✅ User avatar with initial
- ✅ Username display
- ✅ Logout button
- ✅ Gradient branding
- ✅ Sticky header

## 🐛 Troubleshooting

### "Database not initialized"
Run the database initialization:
```bash
bun run db:init
```

### "Admin user already exists"
Either:
1. Use a different username
2. Or delete the existing user from the database

### Can't login after creating user
1. Check the username and password are correct
2. Ensure the database file exists: `server/db/analytics.db`
3. Check server logs for errors

### Cookie not being set
1. Clear browser cookies
2. Try in incognito mode
3. Check browser console for errors

## 📚 Next Steps

Now that authentication is working, you can:
1. Build the admin dashboard (Task 13)
2. Add analytics views (Task 14)
3. Create protected API routes using `withAuth()` middleware

## 💡 Tips

### Multiple Admin Users
Create as many admin users as needed:
```bash
bun run admin:create alice SecurePass1!
bun run admin:create bob AnotherPass2!
```

### Change Password
Currently, passwords can only be changed by:
1. Creating a new admin user
2. Or manually updating the database

### Session Duration
Default: 1 hour. Change in `.env.local`:
```env
ADMIN_SESSION_DURATION=2h
```

### JWT Secret
Always use a strong secret in production:
```env
ADMIN_JWT_SECRET=your-super-secret-random-string-here
```

## ✅ Verification Checklist

- [ ] Admin user created successfully
- [ ] Can login with correct credentials
- [ ] Cannot login with wrong credentials
- [ ] Rate limiting works after 5 failed attempts
- [ ] Redirected to login when accessing `/admin` without auth
- [ ] Can access `/admin` after logging in
- [ ] Logout works correctly
- [ ] Session persists across page refreshes

If all items are checked, the authentication system is working perfectly! 🎉
