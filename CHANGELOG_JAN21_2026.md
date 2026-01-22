# Changelog - January 21, 2026

## Copy Stream URL Button

### Problem
Users wanted to watch streams in external players like VLC, IINA, or other media players but had no easy way to get the stream URL.

### Solution
Added a "Copy URL" button to all three video players (Live TV, Desktop, Mobile) that copies the media-proxy stream URL to the clipboard.

### Implementation Details

1. **Created CopyUrlButton component** - Reusable button with copy-to-clipboard functionality
2. **Added to all players** - Live TV, Desktop VideoPlayer, and MobileVideoPlayer
3. **Visual feedback** - Button shows "Copied!" confirmation for 2 seconds after clicking
4. **Positioned in controls** - Small unobtrusive button in the player control bar

### Files Changed
- `app/(routes)/livetv/components/VideoPlayer.tsx` - Added CopyUrlButton to Live TV player controls
- `app/(routes)/livetv/hooks/useVideoPlayer.ts` - Exposed `streamUrl` from the hook for copying
- `app/(routes)/livetv/LiveTV.module.css` - Added `.copyUrlButton` styles
- `app/components/player/VideoPlayer.tsx` - Added CopyUrlButton to desktop player controls
- `app/components/player/MobileVideoPlayer.tsx` - Added CopyUrlButton to mobile player controls

### How It Works
1. Player loads stream via media-proxy URL (e.g., `https://media-proxy.vynx.workers.dev/tv?url=...`)
2. User clicks the copy button (clipboard icon)
3. Stream URL is copied to clipboard using `navigator.clipboard.writeText()`
4. Button text changes to "Copied!" for 2 seconds
5. User can paste URL into VLC: File → Open Network Stream → Paste URL

### Code Example
```tsx
// CopyUrlButton component
const CopyUrlButton = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button onClick={handleCopy} className={styles.copyUrlButton}>
      {copied ? 'Copied!' : <ClipboardIcon />}
    </button>
  );
};
```

### Use Cases
| Player | URL Copied |
|--------|------------|
| Live TV | `https://media-proxy.vynx.workers.dev/tv?url=...` |
| Movies/TV | Direct HLS stream URL from source |
| External Players | VLC, IINA, mpv, Kodi, etc. |

---

## AirPlay/Cast Support for Live TV

### Problem
The Live TV player was missing AirPlay and Chromecast support that the Desktop and Mobile video players already had. Users couldn't cast live TV streams to their TVs or AirPlay-enabled devices.

### Solution
Added full AirPlay and Chromecast integration to the Live TV player by:

1. **Integrated `useCast` hook** - Connected the existing cast hook to manage Chromecast sessions
2. **Added AirPlay video attributes** - Added `x-webkit-airplay="allow"` and `airplay="allow"` to the video element
3. **Added Cast button to controls** - Shows cast icon when Chromecast is available
4. **Added Cast Active overlay** - Displays "Casting to [Device Name]" when actively casting
5. **Added Cast Error overlay** - Shows error message with retry button if casting fails

### Files Changed
- `app/(routes)/livetv/components/VideoPlayer.tsx` - Main implementation:
  - Imported and initialized `useCast` hook
  - Added AirPlay attributes to `<video>` element
  - Added Cast button in control bar (only shows when `isCastAvailable`)
  - Added Cast Active overlay with device name display
  - Added Cast Error overlay with error message and retry button
- `app/(routes)/livetv/LiveTV.module.css` - Added styles:
  - `.castButton` - Styling for the cast control button
  - `.castActiveOverlay` - Full-screen overlay when casting is active
  - `.castErrorOverlay` - Error state overlay with retry functionality

### Cast States Handled
| State | UI Behavior |
|-------|-------------|
| `isCastAvailable` | Shows cast button in controls |
| `isCasting` | Shows "Casting to [device]" overlay, hides video |
| `castError` | Shows error overlay with message and retry button |

### Code Example
```tsx
// Video element with AirPlay support
<video
  x-webkit-airplay="allow"
  airplay="allow"
  // ... other props
/>

// Cast button in controls
{isCastAvailable && (
  <button onClick={startCasting} className={styles.castButton}>
    <CastIcon />
  </button>
)}

// Cast active overlay
{isCasting && (
  <div className={styles.castActiveOverlay}>
    <p>Casting to {castDeviceName}</p>
  </div>
)}
```

---

## DLHD Live TV Buffering Fix

### Problem
Live TV channels were experiencing buffering issues during playback.

### Solution
Optimized the M3U8 rewriting strategy and HLS.js buffer settings:
- Changed M3U8 rewriting to NOT proxy video segments (direct to CDN for better performance)
- Only encryption keys are proxied through the worker
- Significantly increased HLS.js buffer settings for smoother playback

### Files Changed
- `cloudflare-proxy/src/tv-proxy.ts` - Modified M3U8 rewriting to skip segment proxying
- `app/(routes)/livetv/hooks/useVideoPlayer.ts` - Increased HLS.js buffer settings

### HLS.js Buffer Settings
```javascript
{
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  maxBufferSize: 120 * 1000 * 1000,  // 120MB
  maxBufferHole: 0.5,
  lowLatencyMode: false,  // Disabled for stability
}
```

---

## Non-UTF-8 Subtitles Fix

### Problem
Arabic subtitles were displaying as question marks (�) due to encoding issues. OpenSubtitles serves Arabic subtitles in Windows-1256 encoding, not UTF-8.

### Solution
Added comprehensive encoding detection and conversion in the subtitle proxy:
- Created encoding map for different languages (Arabic: windows-1256, Hebrew: windows-1255, Russian: windows-1251, etc.)
- Added `decodeWithFallback()` function that tries language-specific encodings first
- Added `lang` parameter to subtitle-proxy API
- Updated all video players to pass language code when fetching subtitles

### Files Changed
- `app/api/subtitle-proxy/route.ts` - Added encoding detection and conversion
- `app/components/player/VideoPlayer.tsx` - Pass language code to subtitle proxy
- `app/components/player/MobileVideoPlayer.tsx` - Pass language code to subtitle proxy
- `app/components/player/TranscriptButton.tsx` - Pass language code to subtitle proxy

### Supported Encodings
| Language | Encoding |
|----------|----------|
| Arabic | windows-1256 |
| Hebrew | windows-1255 |
| Russian, Ukrainian, Bulgarian | windows-1251 |
| Greek | windows-1253 |
| Turkish | windows-1254 |
| Thai | windows-874 |
| Vietnamese | windows-1258 |
| Chinese (Simplified) | gb18030 |
| Chinese (Traditional) | big5 |
| Japanese | shift_jis |
| Korean | euc-kr |

---

## Anime Details Page - MAL Title Display

### Problem
The anime details page was showing generic "Season 1", "Season 2" labels instead of actual anime titles. This caused confusion because TMDB season numbers don't match what anime streaming sites (AnimeKai) expect. For example, Jujutsu Kaisen on TMDB shows as 1 season with 71 episodes, but MAL has 3 separate entries.

### Solution
Created a new `AnimeSeasonSelector` component that displays actual MAL anime titles instead of generic season labels.

### Files Changed
- `app/(routes)/details/[id]/AnimeSeasonSelector.tsx` - **NEW** - Component for selecting anime entries by title
- `app/(routes)/details/[id]/DetailsPageClient.tsx` - Updated to use AnimeSeasonSelector for anime with MAL mappings

### How It Works
1. When viewing an anime details page, the system fetches MAL data
2. If MAL entries are found, `AnimeSeasonSelector` displays titles like:
   - "Jujutsu Kaisen" (24 episodes)
   - "Jujutsu Kaisen 2nd Season" (23 episodes)
   - "Jujutsu Kaisen: The Culling Game - Part 1" (12 episodes)
3. When user selects an entry, episodes 1-N are shown for that specific anime
4. Episode selection passes correct `malId` and `malTitle` to the player

---

## Continue Watching - X Icon Fix

### Problem
The X icon for removing items from "Continue Watching" was not visible.

### Solution
Replaced the SVG icon with a Unicode character (✕) for better visibility and simplicity:
- Changed from SVG to Unicode ✕ character
- Added `text-white text-lg font-bold` classes for styling
- Button size remains 32px (w-8 h-8)
- Maintains hover states and accessibility attributes

### Files Changed
- `app/components/home/ContinueWatching.tsx` - Replaced SVG with Unicode ✕ character

---

## Summary of All Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `app/(routes)/livetv/components/VideoPlayer.tsx` | MODIFIED | Added Copy URL button, Cast/AirPlay support |
| `app/(routes)/livetv/hooks/useVideoPlayer.ts` | MODIFIED | Exposed stream URL, increased HLS.js buffers |
| `app/(routes)/livetv/LiveTV.module.css` | MODIFIED | Styles for copy button and cast overlays |
| `app/components/player/VideoPlayer.tsx` | MODIFIED | Added Copy URL button, pass language to subtitles |
| `app/components/player/MobileVideoPlayer.tsx` | MODIFIED | Added Copy URL button, pass language to subtitles |
| `app/hooks/useCast.ts` | MODIFIED | Cast hook integration for Live TV |
| `cloudflare-proxy/src/tv-proxy.ts` | MODIFIED | Skip segment proxying, only proxy keys |
| `app/api/subtitle-proxy/route.ts` | MODIFIED | Added encoding detection for non-UTF8 subtitles |
| `app/components/player/TranscriptButton.tsx` | MODIFIED | Pass language code to subtitle proxy |
| `app/(routes)/details/[id]/AnimeSeasonSelector.tsx` | NEW | Anime title selector component |
| `app/(routes)/details/[id]/DetailsPageClient.tsx` | MODIFIED | Integrated AnimeSeasonSelector |
| `app/components/home/ContinueWatching.tsx` | MODIFIED | Fixed X icon visibility |
