# DLHD.dad Sports Events Analysis

## Overview

DLHD.dad displays live sports events on their homepage with associated TV channels. The schedule is organized by:
1. **Date** - Shows the current day's schedule
2. **Categories** - Sports types (Soccer, Basketball, NFL, etc.)
3. **Events** - Individual matches/games with time and title
4. **Channels** - TV channels broadcasting each event

## HTML Structure

```html
<div class="schedule schedule--compact" id="schedule">
  <div class="schedule__day">
    <div class="schedule__dayTitle">Thursday 27th Nov 2025 - Schedule Time UK GMT</div>
    
    <div class="schedule__category is-expanded">
      <div class="schedule__catHeader" tabindex="0" role="button" aria-expanded="true">
        <i class="fa-solid fa-futbol"></i> Soccer
      </div>
      
      <div class="schedule__categoryBody">
        <div class="schedule__event">
          <div class="schedule__eventHeader" data-title="event title 13:00" aria-expanded="false">
            <span class="schedule__time" data-time="13:00">07:00</span>
            <span class="schedule__eventTitle">Event Title Here</span>
            <i class="fa-solid fa-chevron-right schedule__chevron"></i>
          </div>
          <div class="schedule__channels" style="display: none;">
            <a target="_blank" href="/watch.php?id=345" title="CNN USA" data-ch="cnn usa">CNN USA</a>
            <a target="_blank" href="/watch.php?id=323" title="Headline News" data-ch="headline news">Headline News</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## API Endpoints

### Main Schedule API
The schedule data is loaded via AJAX from these endpoints:

| Endpoint | Description |
|----------|-------------|
| `/schedule-api.php?source=extra` | Extra streams schedule |
| `/schedule-api.php?source=extra_plus` | Extra Plus schedule |
| `/schedule-api.php?source=extra_ppv` | PPV events schedule |
| `/schedule-api.php?source=extra_topembed` | TopEmbed schedule (largest) |
| `/schedule-api.php?source=extra_backup` | Backup streams |
| `/schedule-api.php?source=extra_sd` | SD quality streams |

### API Response Format
```json
{
  "success": true,
  "html": "<div class=\"schedule__day\">...</div>"
}
```

The API returns pre-rendered HTML that gets injected into the page.

## Channel Link Formats

### Main Channels
```
/watch.php?id={channelId}
```
Example: `/watch.php?id=345` for CNN USA

### Extra Streams (s2watch)
```
/watchs2watch.php?id={eventId}|{channelNumber}
```
Example: `/watchs2watch.php?id=6928a037e109a7f428b11769|1` for TNT Sports 1

## Data Attributes

- `data-time` - Original time in UK GMT (e.g., "13:00")
- `data-title` - Lowercase event title with time for search
- `data-ch` - Lowercase channel name for filtering
- `aria-expanded` - Whether the channels list is expanded

## Categories Found

1. TV Shows
2. Soccer
3. Cricket
4. Field Hockey
5. Tennis
6. Motorsport
7. WWE (TNA)
8. Combat Sports
9. Golf
10. Alpine Ski
11. Am. Football (NFL)
12. Basketball
13. NCAA/NCAAW Basketball
14. Futsal
15. Equestrian
16. Handball
17. Horse Racing
18. Ice Hockey
19. Rugby League
20. Rugby Union
21. Volleyball
22. Squash
23. Winter Sports
24. WWE/MMA/BOXING

## Key Findings

1. **Time Display**: Shows local time but stores UK GMT in `data-time`
2. **Expandable Events**: Click on event header to show/hide channels
3. **Multiple Sources**: Different API sources for different stream providers
4. **Channel IDs**: Main channels use numeric IDs, extra streams use compound IDs
5. **Live Indicator**: Events can have a live indicator class (not always present)

## Implementation Notes

To replicate this functionality:
1. Fetch the homepage HTML for the main schedule
2. Call the schedule API endpoints for additional streams
3. Parse the HTML to extract events and channels
4. Store the channel ID mappings for stream playback
