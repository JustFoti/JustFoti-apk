# Troubleshooting Guide

## Empty Home Page - No Content Loading

### Symptoms
- Home page is completely blank
- No movies or TV shows are displayed
- Navigation and footer may be visible, but no content sections

### Root Cause
The TMDB API key is not configured or is invalid.

### Solution

#### Step 1: Check if environment file exists
Run the environment checker:
```bash
npm run check-env
```

This will tell you exactly what's wrong and how to fix it.

#### Step 2: Get your TMDB API key
1. Sign up at [https://www.themoviedb.org/signup](https://www.themoviedb.org/signup)
2. Go to [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
3. Request an API key (Developer option)
4. Copy your API Key (v3 auth)

#### Step 3: Configure the environment
1. Open or create `.env.local` in the project root
2. Add your API key:
```env
NEXT_PUBLIC_TMDB_API_KEY=your_actual_api_key_here
```
3. Save the file

#### Step 4: Restart the server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

#### Step 5: Verify
- Open [http://localhost:3000](http://localhost:3000)
- You should see trending content, popular movies, and TV shows

---

## Other Common Issues

### "Configuration error" message

**Cause:** API key is not being read by the application

**Solution:**
1. Verify the file is named exactly `.env.local` (not `.env.local.txt`)
2. Check that the variable name is `NEXT_PUBLIC_TMDB_API_KEY` (exact spelling)
3. Ensure the file is in the root directory (same level as `package.json`)
4. Restart your development server

### "Rate limit exceeded" error

**Cause:** Too many API requests in a short time

**Solution:**
- Wait a few minutes before trying again
- The app has built-in caching to prevent this
- TMDB free tier allows 40 requests per 10 seconds

### Content loads but images are broken

**Cause:** TMDB image URLs may be blocked or slow

**Solution:**
- Check your internet connection
- Try refreshing the page
- The app has fallback images built-in

### Search not working

**Cause:** API key issue or network problem

**Solution:**
1. Verify API key is configured correctly
2. Check browser console for errors (F12 → Console)
3. Try searching for a common term like "Batman"

### Details page shows "Content not found"

**Cause:** Invalid content ID or API issue

**Solution:**
- Go back to home page and click on a content card
- Don't manually type URLs
- Check if the content exists on TMDB

---

## Development Issues

### Port 3000 already in use

**Solution:**
```bash
# Kill the process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use a different port:
PORT=3001 npm run dev
```

### Module not found errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
rm -rf .next
npm install
npm run dev
```

### TypeScript errors

**Solution:**
```bash
# Run type checking
npm run type-check

# If errors persist, delete and regenerate
rm -rf .next
rm tsconfig.tsbuildinfo
npm run dev
```

---

## Debugging Tips

### Check browser console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Common errors:
   - "MISSING_API_KEY" → Configure `.env.local`
   - "Failed to fetch" → Network or API issue
   - "401 Unauthorized" → Invalid API key

### Check network requests
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for failed requests (red)
5. Click on failed requests to see details

### Check server logs
Look at your terminal where `npm run dev` is running:
- "Error fetching home page data" → API issue
- "TMDB API error" → Check API key
- Port errors → Port already in use

---

## Still Having Issues?

1. Run the environment checker: `npm run check-env`
2. Check the browser console for errors
3. Verify your TMDB API key at [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
4. Try clearing your browser cache
5. Restart your development server

## Quick Reference

### Required Environment Variables
```env
NEXT_PUBLIC_TMDB_API_KEY=your_key_here
```

### Useful Commands
```bash
npm run check-env      # Check environment configuration
npm run dev            # Start development server
npm run build          # Build for production
npm run type-check     # Check TypeScript types
```

### Important Files
- `.env.local` - Your environment variables (not in git)
- `.env.example` - Template for environment variables
- `QUICK_START.md` - Quick setup guide
- `README.md` - Full documentation
