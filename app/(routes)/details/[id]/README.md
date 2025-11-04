# Content Details Page

## Overview

The content details page displays comprehensive information about movies and TV shows, including metadata, cast, genres, and related content recommendations. For TV shows, it includes season and episode selection functionality.

## Components

### DetailsPageClient
Main client component that orchestrates the details page experience.

**Features:**
- Parallax hero section with backdrop image
- Metadata display (title, description, ratings, cast, genres)
- Season and episode selection for TV shows
- Related content recommendations
- Watch Now button with smooth transition to player
- Prefetches video stream data on page load for faster playback

### SeasonSelector
Component for selecting TV show seasons.

**Features:**
- Visual season cards with episode counts
- Smooth animations on selection
- Keyboard navigation support
- Selected state indicator with layout animation

### EpisodeList
Component for displaying episodes in a selected season.

**Features:**
- Episode cards with thumbnails
- Episode metadata (title, overview, air date, runtime)
- Play overlay on hover
- Staggered entrance animations
- Keyboard navigation support

## API Routes

### GET /api/content/season
Fetches TV show season details with episodes.

**Query Parameters:**
- `tvId` - The TV show ID
- `seasonNumber` - The season number to fetch

**Response:**
```json
{
  "seasonNumber": 1,
  "episodeCount": 10,
  "episodes": [
    {
      "id": "123",
      "episodeNumber": 1,
      "seasonNumber": 1,
      "title": "Episode Title",
      "overview": "Episode description",
      "stillPath": "https://...",
      "airDate": "2024-01-01",
      "runtime": 45
    }
  ]
}
```

## Usage

### Navigation
Users can navigate to the details page from:
- Home page content cards
- Search results
- Related content recommendations

### URL Format
- Movies: `/details/[id]?type=movie`
- TV Shows: `/details/[id]?type=tv`

### Watch Flow
1. User clicks "Watch Now" button
2. For movies: Navigate to `/watch/[id]?type=movie`
3. For TV shows: Navigate to `/watch/[id]?type=tv&season=[s]&episode=[e]`

## Performance Optimizations

1. **Server-Side Rendering**: Content details are fetched on the server for faster initial load
2. **Prefetching**: Video stream data is prefetched in the background on page load
3. **Lazy Loading**: Episode thumbnails are lazy-loaded as they come into view
4. **Caching**: TMDB API responses are cached to reduce redundant requests
5. **Staggered Animations**: Episode cards animate in with a stagger for smooth visual progression

## Accessibility

- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus indicators on all interactive elements
- Screen reader friendly content

## Requirements Satisfied

- **5.1**: Hero animation on content card selection ✓
- **5.2**: High-resolution backdrop with parallax scrolling ✓
- **5.3**: Metadata display (title, description, ratings, cast, genres) ✓
- **5.4**: Prefetch related content and recommendations ✓
- **5.5**: Skeleton loading states matching final layout ✓
