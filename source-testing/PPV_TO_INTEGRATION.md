# PPV.to Integration

## Overview

PPV.to is a live sports streaming aggregator that provides access to various sports events and 24/7 streams. This integration extracts direct m3u8 URLs for playback in our native player.

## API Endpoints

### 1. Get All Streams
```
GET /api/livetv/ppv-streams
```

Query parameters:
- `category` - Filter by category (e.g., "Football", "Basketball")
- `liveOnly` - Set to "true" to only show currently live streams
- `search` - Search streams by name or tag

Response:
```json
{
  "success": true,
  "categories": [
    {
      "id": 34,
      "name": "Football",
      "icon": "⚽",
      "streams": [
        {
          "id": 15280,
          "name": "Egypt vs. South Africa",
          "tag": "AFCON",
          "poster": "https://api.ppvs.su/assets/thumb/...",
          "uriName": "afcon/2025-12-26/egy-rsa",
          "startsAt": 1766761200,
          "endsAt": 1766768400,
          "isLive": true,
          "viewers": "1234"
        }
      ]
    }
  ],
  "stats": {
    "totalStreams": 67,
    "liveStreams": 5,
    "categoryCount": 8
  }
}
```

### 2. Get Stream URL
```
GET /api/livetv/ppv-stream?uri={uriName}
```

Query parameters:
- `uri` (required) - The stream's URI name (e.g., "afcon/2025-12-26/egy-rsa")
- `id` - Stream ID (optional, for tracking)
- `name` - Stream name (optional, for display)

Response:
```json
{
  "success": true,
  "streamUrl": "https://gg.poocloud.in/afcon/index.m3u8",
  "method": "atob",
  "streamInfo": {
    "id": "15280",
    "name": "Egypt vs. South Africa",
    "uriName": "afcon/2025-12-26/egy-rsa"
  },
  "playbackHeaders": {
    "Referer": "https://pooembed.top/",
    "Origin": "https://pooembed.top"
  }
}
```

## Technical Details

### Stream Extraction Flow

1. **API Discovery**: `https://api.ppvs.su/api/streams` returns all available streams
2. **Embed Page**: Each stream has an embed URL at `https://pooembed.top/embed/{uri_name}`
3. **M3U8 Extraction**: The embed page contains a base64-encoded m3u8 URL in the format:
   ```javascript
   const src = atob("base64_encoded_m3u8_url");
   ```
4. **Playback**: The decoded URL points to `https://{server}.poocloud.in/{path}/index.m3u8`

### Stream Categories

| Category | Icon | Description |
|----------|------|-------------|
| American Football | 🏈 | NFL, College Football |
| Basketball | 🏀 | NBA, College Basketball |
| Combat Sports | 🥊 | UFC, Boxing, MMA |
| Cricket | 🏏 | International Cricket |
| Darts | 🎯 | World Darts Championship |
| Football | ⚽ | Soccer - Premier League, La Liga, etc. |
| Wrestling | 🤼 | WWE, AEW |
| 24/7 Streams | 📺 | Always-on entertainment channels |

### Playback Requirements

- **Format**: HLS (m3u8)
- **Player**: HLS.js recommended
- **Headers**: Must include `Referer: https://pooembed.top/` for some streams
- **CORS**: May require proxy for browser playback

### Stream Availability

- Streams return 404 before they go live
- `isLive` flag indicates if stream is currently active
- `always_live` streams (24/7) are always available
- Check `startsAt` and `endsAt` timestamps for scheduled events

## Usage in Frontend

```typescript
// Fetch available streams
const response = await fetch('/api/livetv/ppv-streams?liveOnly=true');
const { categories } = await response.json();

// Get stream URL for playback
const streamResponse = await fetch(`/api/livetv/ppv-stream?uri=${stream.uriName}`);
const { streamUrl } = await streamResponse.json();

// Play with HLS.js
const hls = new Hls();
hls.loadSource(streamUrl);
hls.attachMedia(videoElement);
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| 404 on m3u8 | Stream not live yet | Check `startsAt` timestamp |
| "Could not extract" | Page structure changed | Update extraction patterns |
| CORS error | Direct browser access blocked | Use proxy endpoint |

## Notes

- Streams are cached for 5 minutes at the API level
- Stream URLs are cached for 1 minute
- Some streams may have multiple quality options in the m3u8 playlist
- 24/7 streams are always available but may have lower quality
