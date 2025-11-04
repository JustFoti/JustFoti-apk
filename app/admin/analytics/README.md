# Detailed Analytics

Advanced analytics views with comprehensive charts and data export functionality.

## Features

### 1. Watch Completion Rates
- Bar chart showing completion rates for top content
- Color-coded by completion percentage (green > 80%, blue > 60%, orange > 40%, red < 40%)
- Displays view count and content type
- Top 15 most-watched content items

### 2. Peak Usage Hours
- Area chart showing activity distribution across 24 hours
- Timezone support for accurate time-based analysis
- Highlights peak hour and peak activity count
- Smooth gradient visualization

### 3. Content Drop-off Analysis
- Line chart showing where users stop watching
- Selectable content from dropdown
- Shows drop-off percentage at different points in content
- Helps identify problematic sections

### 4. User Retention Metrics
- Key metrics cards: Return Rate, Churn Rate, Avg Session Duration
- Daily active users trend line chart
- Session duration formatted in hours and minutes
- Color-coded metrics for quick insights

### 5. Data Export
- Export analytics data in CSV or JSON format
- Three data types: Events, Metrics, Content Stats
- Configurable time range
- Automatic file download

## API Endpoints

### GET /api/analytics/detailed
Fetches detailed analytics data including completion rates, peak usage, drop-off analysis, and retention metrics.

**Query Parameters:**
- `range`: Time range ('24h', '7d', '30d', '90d')
- `timezone`: Timezone for peak usage hours (default: 'UTC')

**Response:**
```json
{
  "completionRates": [...],
  "peakUsageHours": [...],
  "dropOffAnalysis": [...],
  "retentionMetrics": {...}
}
```

### GET /api/analytics/export
Exports analytics data in CSV or JSON format.

**Query Parameters:**
- `format`: Export format ('csv' or 'json')
- `type`: Data type ('events', 'metrics', 'content')
- `start`: Start timestamp (optional)
- `end`: End timestamp (optional)

**Response:**
File download with appropriate Content-Type and Content-Disposition headers.

## Components

### AnalyticsClient
Main container component that manages state and data fetching.

### CompletionRateChart
Recharts bar chart for watch completion rates.

### PeakUsageChart
Recharts area chart for hourly activity distribution.

### DropOffChart
Recharts line chart for content drop-off analysis.

### RetentionMetrics
Metrics cards and line chart for user retention.

### ExportData
Data export interface with format and type selection.

## Usage

Navigate to `/admin/analytics` to view the detailed analytics dashboard.

Use the filters at the top to:
- Select time range (24h, 7d, 30d, 90d)
- Choose timezone for peak usage analysis

Click "Refresh" to manually update the data.

## Dependencies

- **recharts**: Chart library for data visualization
- **Next.js**: Server-side rendering and API routes
- **Bun:sqlite**: Database for analytics storage

## Styling

All components use CSS modules for scoped styling with a futuristic dark theme matching the Flyx design system.
