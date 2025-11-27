# DLHD.dad Stream URL Construction Analysis

## Overview

DLHD.dad uses a multi-layer obfuscation system to protect their stream URLs. The actual stream URLs are delivered via VAST (Video Ad Serving Template) XML responses.

## Obfuscation Layers

### 1. String Array Obfuscation
- All strings are stored in an obfuscated array
- Decoder function `_0x8b05` (or similar) retrieves strings by index
- Example: `_0x8b05(0xd00)` returns `"velocecdn."`

### 2. XOR-Encoded Configuration
- Player configuration is XOR-encoded in `window['ZpQw9XkLmN8c3vR3']`
- XOR Key: `xR9tB2pL6q7MwVe` (derived from indices `0xbad` + `0xb73`)
- Decoding: Base64 decode → XOR with key

### 3. Dynamic CDN Domains
- CDN domains change frequently
- Current observed: `rpyztjadsbonh.store`
- Fallback: `velocecdn.com`, `adexchangeclear.com`

## URL Construction Flow

### Step 1: Configuration Extraction
```javascript
// Plain config
window['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'] = {
  adserverDomain: "wpnxiswpuyrfn.icu",
  cdnDomain: "rpyztjadsbonh.store",
  zoneId: "...",
  // ...
}

// XOR-encoded config (decoded)
{
  adserverDomain: "phlgoukjpcgla.space",
  cdnDomain: "rpyztjadsbonh.store",
  selPath: "/d3.php",
  // ...
}
```

### Step 2: VAST Request URL Construction
```javascript
// Base URL
let url = window.location.protocol + '//' + config.adserverDomain;

// Video Select endpoint
url += '/video/select.php';

// Parameters
url += '?r=' + config.zoneId;
url += '&sub1=' + encodeURIComponent(config.sub1);
url += '&atv=' + playerVersion;
```

**Example URL:**
```
https://wpnxiswpuyrfn.icu/video/select.php?r=12345&atv=72.0
```

### Step 3: VAST Response Parsing
The response is VAST XML containing:
```xml
<VAST version="3.0">
  <Ad>
    <InLine>
      <Creatives>
        <Creative>
          <Linear>
            <MediaFiles>
              <MediaFile>https://cdn.example.com/stream/live.m3u8</MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>
```

### Step 4: Stream URL Extraction
```javascript
// Parse VAST response
const parser = new DOMParser();
const vast = parser.parseFromString(response, 'application/xml');

// Extract from parsed VAST
const ads = vastResponse.ads;
const ad = ads[0];
const creative = ad.creatives.find(c => c.type === 'linear');
const mediaFileURL = creative.mediaFiles[0].url;
```

## Key Decoded Strings

| Index | Value | Purpose |
|-------|-------|---------|
| 0xd00 | velocecdn. | CDN domain prefix |
| 0xca | com | CDN domain suffix |
| 0xc0b | cdnDomain | Config property |
| 0x73f | /video/sli | Video slider path prefix |
| 0xfe3 | der.php | Video slider path suffix |
| 0x122a | /video/sel | Video select path prefix |
| 0x141c | ect.php | Video select path suffix |
| 0x216 | zoneId | Zone ID parameter |
| 0x925 | ads | VAST ads array |
| 0xe29 | creatives | VAST creatives |
| 0x229 | mediaFiles | VAST media files |
| 0x3f7 | linear | Creative type |
| 0xbad | xR9tB2pL6q | XOR key part 1 |
| 0xb73 | 7MwVe | XOR key part 2 |

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/video/slider.php` | Video slider/banner ads |
| `/video/select.php` | Main stream VAST request |
| `/script/surl5.php` | Script/ad loading |
| `/d3.php` | Selection/tracking |

## Implementation Notes

1. **VAST Parser**: The site uses a custom VAST parser class (`_0x57a7b9`)
2. **Error Handling**: Falls back to different CDN domains on failure
3. **Adblock Detection**: Has `isAdbMode` and `adblockSettings` checks
4. **Preview Mode**: Has `isPreviewMode` for testing

## Stream URL Format

The actual stream URLs typically follow this pattern:
```
https://{cdnDomain}/live/{channelId}/index.m3u8
```

Or for VOD:
```
https://{cdnDomain}/vod/{videoId}/playlist.m3u8
```

## Security Measures

1. **Token-based URLs**: Stream URLs include time-based tokens
2. **Referrer Checks**: CDN validates referrer headers
3. **CORS Restrictions**: Streams require proper origin headers
4. **Rate Limiting**: Multiple requests trigger blocks

## Decoder Module Usage

```javascript
const DLHDDecoder = require('./dlhd-decoder-module');

const decoder = new DLHDDecoder();
decoder.initialize(htmlContent);

// Decode string by index
const cdnDomain = decoder.decodeIndex(0xc0b); // "cdnDomain"

// Extract full config
const config = decoder.extractConfig(htmlContent);
console.log(config.cdnDomain); // "rpyztjadsbonh.store"
```

## Stream Extractor Usage

```javascript
const DLHDStreamExtractor = require('./dlhd-stream-extractor-v2');

const extractor = new DLHDStreamExtractor();
extractor.initialize(htmlContent);

const info = extractor.getStreamInfo();
console.log(info.cdnDomain);      // "rpyztjadsbonh.store"
console.log(info.adserverDomain); // "phlgoukjpcgla.space"
console.log(info.vastUrl);        // Full VAST request URL
```

## Complete Stream Extraction Flow

To extract a working stream URL from DLHD.dad:

1. **Fetch the page HTML**
   ```javascript
   const response = await fetch('https://dlhd.dad/casting/stream-769.php');
   const html = await response.text();
   ```

2. **Extract configuration**
   ```javascript
   const extractor = new DLHDStreamExtractor();
   extractor.initialize(html);
   const info = extractor.getStreamInfo();
   ```

3. **Fetch VAST response**
   ```javascript
   const vastResponse = await fetch(info.vastUrl, {
     headers: {
       'Referer': 'https://dlhd.dad/',
       'Origin': 'https://dlhd.dad'
     }
   });
   const vastXml = await vastResponse.text();
   ```

4. **Parse VAST XML**
   ```javascript
   const parser = new DOMParser();
   const doc = parser.parseFromString(vastXml, 'application/xml');
   const mediaFile = doc.querySelector('MediaFile');
   const streamUrl = mediaFile?.textContent?.trim();
   ```

5. **Play the stream**
   ```javascript
   const video = document.createElement('video');
   video.src = streamUrl;
   video.play();
   ```

## Current Extracted Values (from sample)

| Property | Value |
|----------|-------|
| CDN Domain | `rpyztjadsbonh.store` |
| Ad Server Domain | `phlgoukjpcgla.space` |
| XOR Key | `xR9tB2pL6q7MwVe` |
| VAST Endpoint | `/video/select.php` |
| Slider Endpoint | `/video/slider.php` |
