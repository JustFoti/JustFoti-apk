# Anonymized User Tracking System

## Overview

This document describes the comprehensive anonymized user tracking system implemented for Flyx. The system provides personalized user experiences while maintaining complete privacy through anonymization and local storage.

## Key Features

### 1. Anonymous User Identification
- **Anonymous User ID**: Generated UUID stored in localStorage
- **Device Fingerprinting**: Creates unique device ID based on browser/device characteristics
- **Session Management**: Temporary session IDs with 30-minute timeout
- **Privacy-First**: No personal information collected or stored

### 2. Watch Progress Tracking
- **Automatic Progress Saving**: Saves watch position every 5 seconds
- **Cross-Session Persistence**: Resume watching from where you left off
- **Completion Tracking**: Automatically marks content as completed at 90% progress
- **Episode/Season Tracking**: Full support for TV series progress
- **Smart Cleanup**: Removes completed items and old progress data

### 3. User Preferences Management
- **Video Quality**: Auto, 720p, 1080p, 4K preferences
- **Audio Settings**: Volume level and mute preferences
- **Playback Settings**: Autoplay, subtitles, playback speed
- **Theme Preferences**: Light, dark, or auto theme
- **Language Settings**: Preferred content language
- **Favorite Genres**: Tracks user's preferred content types

### 4. Viewing History
- **Complete History**: Tracks all watched content with timestamps
- **Watch Statistics**: Total watch time, completion rates, content counts
- **Smart Recommendations**: Uses history for content suggestions
- **Privacy Controls**: Users can clear history at any time
- **Storage Limits**: Maintains maximum of 100 history items

### 5. Enhanced Analytics
- **Interaction Tracking**: Button clicks, menu usage, search behavior
- **Performance Metrics**: Load times, buffering events, error rates
- **Content Engagement**: Time spent, completion rates, replay behavior
- **Search Analytics**: Query patterns, result interactions, popular searches
- **Error Tracking**: Automatic error reporting for debugging

## Technical Implementation

### Core Services

#### UserTrackingService (`app/lib/services/user-tracking.ts`)
- Manages anonymous user identification
- Handles device fingerprinting
- Stores and retrieves user preferences
- Manages watch progress and viewing history

#### AnalyticsService (`app/lib/services/analytics.ts`)
- Integrates with user tracking for enhanced analytics
- Queues and batches events for efficient processing
- Handles offline scenarios with event queuing
- Provides comprehensive event tracking API

### React Hooks

#### useWatchProgress (`app/lib/hooks/useWatchProgress.ts`)
- Enhanced watch progress tracking with user context
- Automatic progress saving and restoration
- Completion detection and tracking
- Integration with analytics service

#### useUserPreferences (`app/lib/hooks/useUserPreferences.ts`)
- Manages user preferences with real-time updates
- Provides typed preference getters and setters
- Automatic persistence to localStorage
- Integration with analytics for preference tracking

#### useViewingHistory (`app/lib/hooks/useViewingHistory.ts`)
- Complete viewing history management
- Statistics calculation and reporting
- History cleanup and maintenance
- Privacy controls for data management

### Components

#### AnalyticsProvider (`app/components/analytics/AnalyticsProvider.tsx`)
- Enhanced provider with comprehensive tracking methods
- User session management
- Event queuing and batching
- Error handling and offline support

#### VideoPlayer (`app/components/player/VideoPlayer.tsx`)
- Integrated with enhanced tracking system
- Tracks all player interactions and events
- Automatic progress saving and restoration
- Quality and performance tracking

#### PrivacySettings (`app/components/settings/PrivacySettings.tsx`)
- Complete privacy control interface
- Data export functionality
- Clear all data options
- Privacy information and transparency

## Data Storage

### Local Storage Keys
- `flyx_user_id`: Anonymous user identifier
- `flyx_device_id`: Device fingerprint
- `flyx_preferences`: User preferences object
- `flyx_watch_progress`: Watch progress data
- `flyx_viewing_history`: Complete viewing history

### Session Storage Keys
- `flyx_session_id`: Current session identifier with timestamp

### Database Tables
Enhanced analytics events table stores:
- Anonymous user and session identifiers
- Event types and metadata
- Interaction patterns and performance metrics
- Content engagement data

## Privacy Features

### Data Anonymization
- All identifiers are randomly generated UUIDs
- No personal information is collected or stored
- IP addresses are hashed with salt for privacy
- Device fingerprints use non-personal characteristics

### User Controls
- **Clear All Data**: Complete data removal option
- **Export Data**: Download personal data in JSON format
- **Disable Tracking**: Option to disable analytics collection
- **Automatic Cleanup**: Old data is automatically removed

### Transparency
- Clear privacy information displayed to users
- Data collection practices fully documented
- User consent for analytics collection
- Easy access to privacy controls

## API Integration

### Enhanced Analytics API (`app/api/analytics/track/route.ts`)
- Supports both new and legacy event formats
- Enhanced metadata collection
- Improved error handling and logging
- Content statistics integration

### Event Types
- `page_view`: Page navigation tracking
- `watch_event`: Video playback events (start, pause, resume, complete, progress)
- `search_event`: Search queries and interactions
- `interaction`: UI element interactions
- `content_engagement`: Content-specific engagement events
- `error`: Error tracking for debugging
- `performance`: Performance metrics collection

## Benefits

### For Users
- **Seamless Experience**: Automatic progress saving and restoration
- **Personalized Recommendations**: Based on viewing history and preferences
- **Cross-Device Consistency**: Preferences sync across browser sessions
- **Privacy Protection**: Complete anonymity with full data control

### For Platform
- **User Engagement Insights**: Understand how users interact with content
- **Performance Monitoring**: Track and optimize video streaming performance
- **Content Analytics**: Identify popular content and viewing patterns
- **Error Detection**: Automatic error reporting for quick fixes

## Implementation Status

✅ **Completed Features:**
- Anonymous user identification system
- Enhanced watch progress tracking
- User preferences management
- Viewing history tracking
- Enhanced analytics service
- Privacy settings interface
- VideoPlayer integration
- Search tracking
- API enhancements

🔄 **Future Enhancements:**
- Machine learning recommendations
- Advanced content filtering
- Social features (anonymous)
- Performance optimization
- Mobile app integration

## Usage Examples

### Track Watch Progress
```typescript
const { handleProgress, loadProgress } = useWatchProgress({
  contentId: 'movie_123',
  contentType: 'movie',
  onComplete: () => console.log('Movie completed!'),
});
```

### Manage User Preferences
```typescript
const { setQuality, setAutoplay, preferences } = useUserPreferences();

// Update video quality preference
setQuality('1080p');

// Enable autoplay
setAutoplay(true);
```

### Track User Interactions
```typescript
const { trackInteraction } = useAnalytics();

trackInteraction({
  element: 'search_bar',
  action: 'click',
  context: { query: 'action movies' },
});
```

### Access Viewing History
```typescript
const { getRecentlyWatched, getViewingStats } = useViewingHistory();

const recentItems = getRecentlyWatched(10);
const stats = getViewingStats();
```

This anonymized user tracking system provides a comprehensive solution for enhancing user experience while maintaining complete privacy and giving users full control over their data.