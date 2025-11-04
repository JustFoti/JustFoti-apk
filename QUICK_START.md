# Quick Start Guide

## The Problem: Empty Home Page

If your home page is completely empty with no content loading, it's likely because the TMDB API key is not configured.

## The Solution

### Step 1: Get Your TMDB API Key

1. Go to [https://www.themoviedb.org/signup](https://www.themoviedb.org/signup) and create a free account
2. Navigate to [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
3. Click "Request an API Key" and select "Developer"
4. Fill out the form (you can use dummy data for personal projects)
5. Copy your API Key (v3 auth)

### Step 2: Configure Your Environment

1. Open the `.env.local` file in the root of your project
2. Replace `your_tmdb_api_key_here` with your actual API key:

```env
NEXT_PUBLIC_TMDB_API_KEY=abc123your_actual_key_here
```

3. Save the file

### Step 3: Restart Your Development Server

1. Stop your development server (Ctrl+C in terminal)
2. Start it again:
```bash
npm run dev
```

3. Refresh your browser at [http://localhost:3000](http://localhost:3000)

## Verification

Once configured correctly, you should see:
- A hero section with a featured movie/show
- "Trending Today" section with content cards
- "Trending This Week" section
- "Popular Movies" section
- "Popular TV Shows" section

## Troubleshooting

### Still seeing an empty page?

1. Check browser console for errors (F12 → Console tab)
2. Verify your API key is correct (no extra spaces)
3. Make sure the file is named `.env.local` (not `.env.local.txt`)
4. Ensure you restarted the dev server after adding the key

### Getting "Configuration error" message?

This means the API key is not being read. Make sure:
- The variable name is exactly `NEXT_PUBLIC_TMDB_API_KEY`
- The file is in the root directory (same level as `package.json`)
- You've restarted the development server

### API Rate Limiting

TMDB free tier allows:
- 40 requests every 10 seconds
- The app has built-in rate limiting and caching to stay within limits

## Need Help?

Check the full documentation in `README.md` or visit [TMDB API Documentation](https://developers.themoviedb.org/3).
