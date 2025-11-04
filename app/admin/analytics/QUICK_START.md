# Quick Start Guide - Detailed Analytics

## Overview
The detailed analytics system is fully implemented and ready to use. This guide will help you get started quickly.

## Accessing Analytics

1. **Login to Admin Panel**
   - Navigate to `/admin/login`
   - Enter your admin credentials
   - You'll be redirected to the dashboard

2. **Navigate to Analytics**
   - Click "Analytics" in the navigation menu
   - Or go directly to `/admin/analytics`

## Features Available

### 1. Watch Completion Rates
- **What it shows**: How much of each video users watch before stopping
- **Color coding**:
  - 🟢 Green (>80%): Excellent engagement
  - 🔵 Blue (60-80%): Good engagement
  - 🟠 Orange (40-60%): Moderate engagement
  - 🔴 Red (<40%): Low engagement
- **Use case**: Identify which content keeps viewers engaged

### 2. Peak Usage Hours
- **What it shows**: When users are most active (24-hour view)
- **Timezone support**: Select your timezone for accurate local time
- **Use case**: Schedule content releases or maintenance during low-traffic hours

### 3. Content Drop-off Analysis
- **What it shows**: Exact points where users stop watching
- **Interactive**: Select different content from dropdown
- **Use case**: Identify problematic sections in videos

### 4. User Retention Metrics
- **Metrics displayed**:
  - Return Rate: % of users who came back
  - Churn Rate: % of users who didn't return
  - Avg Session Duration: How long users stay
  - Daily Active Users: Trend over time
- **Use case**: Measure platform stickiness and user loyalty

### 5. Data Export
- **Formats**: CSV or JSON
- **Data types**:
  - Events: Raw user interactions
  - Metrics: Aggregated daily statistics
  - Content Stats: Per-content performance
- **Use case**: External analysis, reporting, or backup

## Using the Filters

### Time Range
- **24h**: Last 24 hours (real-time monitoring)
- **7d**: Last 7 days (weekly trends)
- **30d**: Last 30 days (monthly overview)
- **90d**: Last 90 days (quarterly analysis)

### Timezone
Select your local timezone for accurate peak usage hour analysis:
- UTC (default)
- Eastern Time (America/New_York)
- Central Time (America/Chicago)
- Mountain Time (America/Denver)
- Pacific Time (America/Los_Angeles)
- London (Europe/London)
- Paris (Europe/Paris)
- Tokyo (Asia/Tokyo)

## Exporting Data

1. Scroll to the "Export Data" section
2. Select **Data Type**:
   - Events: All user interactions
   - Metrics: Daily aggregated data
   - Content Stats: Per-content statistics
3. Select **Format**:
   - JSON: For programmatic processing
   - CSV: For Excel/spreadsheet analysis
4. Click "Export Data"
5. File will download automatically

## Tips for Best Results

### For Accurate Analytics
- Ensure analytics tracking is enabled in your app
- Wait for sufficient data (at least 24 hours)
- Use longer time ranges (7d or 30d) for trends

### For Performance
- Use shorter time ranges (24h or 7d) for faster loading
- Export data in batches if you have large datasets
- Refresh manually only when needed

### For Insights
- Compare completion rates across content types
- Look for patterns in peak usage hours
- Identify drop-off points to improve content
- Monitor retention metrics weekly

## Troubleshooting

### No Data Showing
- **Check**: Is analytics tracking enabled?
- **Check**: Have users interacted with the platform?
- **Solution**: Wait for data to accumulate or check tracking implementation

### Charts Not Loading
- **Check**: Browser console for errors
- **Solution**: Refresh the page or clear browser cache

### Export Fails
- **Check**: Are you authenticated?
- **Check**: Is the time range too large?
- **Solution**: Try a smaller time range or different format

### Timezone Not Updating
- **Note**: Timezone affects peak usage hours display only
- **Solution**: Refresh after changing timezone

## API Endpoints (For Developers)

### Get Detailed Analytics
```bash
GET /api/analytics/detailed?range=7d&timezone=UTC
```

### Export Data
```bash
GET /api/analytics/export?format=json&type=events&start=1234567890&end=1234567890
```

## Next Steps

1. **Explore the Dashboard**: Start with the main dashboard at `/admin`
2. **Review Analytics**: Check detailed analytics regularly
3. **Export Reports**: Download data for stakeholder reports
4. **Monitor Trends**: Track changes over time
5. **Optimize Content**: Use insights to improve user experience

## Support

For issues or questions:
- Check the README.md for detailed documentation
- Review IMPLEMENTATION_SUMMARY.md for technical details
- Check browser console for error messages

---

**Status**: ✅ Fully Implemented and Ready to Use

All features from Task 14 have been completed:
- ✅ Advanced charts using Recharts
- ✅ Watch completion rate visualization
- ✅ Peak usage hours chart with timezone support
- ✅ Content drop-off analysis view
- ✅ User retention metrics display
- ✅ Data export functionality (CSV, JSON)
