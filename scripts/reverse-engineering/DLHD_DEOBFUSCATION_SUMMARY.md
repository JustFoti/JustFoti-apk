# DLHD.dad Stream Deobfuscation Summary

## Overview

DLHD.dad uses a multi-layer obfuscation system to protect their stream loading mechanism. This document summarizes the complete findings from reverse engineering their player.

## Obfuscation Layers

### 1. String Array Obfuscation

The main script uses a common JavaScript obfuscation pattern:
- A large array of base64-encoded strings (`_0x8b05` function)
- A decoder function (`_0xb4a0`) that retrieves strings by index
- Array shuffling to prevent static analysis
- **5580+ decoded strings** extracted

### 2. XOR-Encoded Configuration

Player configuration is stored in a window variable and XOR-encoded:

**Variable Name:** `window['ZpQw9XkLmN8c3vR3']`

**Encoding Process:**
1. JSON configuration is converted to string
2. XOR'd with key derived from decoded strings
3. Base64 encoded

**Decoding Process:**
1. Base64 decode the data
2. XOR each byte with the key
3. Parse as JSON

**XOR Key:** `xR9tB2pL6q7MwVe` (derived from decoder indices 0xbad + 0xb73)

### 3. Ad Server Configuration

Stored in: `window['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF']`

Contains:
- `adserverDomain`: Ad server domain (e.g., "wpnxiswpuyrfn.icu")
- `cdnDomain`: CDN domain (e.g., "rpyztjadsbonh.store")
- `selPath`: Selection path ("/d3.php")
- Various ad type configurations (suv5, ippg, atag, etc.)

## CDN Infrastructure

### Primary CDN
- **Domain Pattern:** `velocecdn.com` (default fallback)
- **Config Key:** `cdnDomain` in the configuration

### Observed Domains
- `rpyztjadsbonh.store` - CDN domain (from config)
- `wpnxiswpuyrfn.icu` - Ad server domain (plain config)
- `phlgoukjpcgla.space` - Ad server domain (XOR config)
- `adexchangeclear.com` - Default CDN fallback

## Stream Loading Flow (VAST-based)

1. **Page Load:** HTML loads with obfuscated JavaScript
2. **Config Decode:** XOR-encoded config is decoded using the key
3. **VAST Request:** Player requests VAST XML from `/video/select.php`
4. **VAST Parse:** Response is parsed to extract `mediaFileURL`
5. **Stream Play:** Video element src is set to the extracted URL

### VAST Request URL Construction

```javascript
// Base URL construction
let url = window.location.protocol + '//' + config.adserverDomain;

// Endpoint
url += '/video/select.php';

// Parameters
url += '?r=' + config.zoneId;      // Zone ID
url += '&sub1=' + config.sub1;      // Sub parameter
url += '&atv=' + '72.0';            // Player version
url += '&ts=' + Date.now();         // Timestamp
```

**Example:**
```
https://phlgoukjpcgla.space/video/select.php?r=12345&atv=72.0&ts=1764212320345
```

### VAST Response Structure

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

### Stream URL Extraction

```javascript
// From VAST response
const ads = vastResponse.ads;
const ad = ads[0];
const creative = ad.creatives.find(c => c.type === 'linear');
const mediaFileURL = creative.mediaFiles[0].url;
```

## Key Decoded Strings

| Index | String | Purpose |
|-------|--------|---------|
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
| 0x5c2 | protocol | Location protocol |
| 0x543 | location | Window location |
| 0x123e | adserverDo | Ad server domain prefix |
| 0x1341 | main | Ad server domain suffix |

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/video/slider.php` | Video slider/banner ads |
| `/video/select.php` | Main stream VAST request |
| `/script/surl5.php` | Script/ad loading |
| `/d3.php` | Selection/tracking |

## Decoder Implementation

```javascript
function decodePlayerConfig(encodedData, key = 'xR9tB2pL6q7MwVe') {
    // Base64 decode
    const decoded = atob(encodedData);
    
    // XOR decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
            decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    
    return JSON.parse(result);
}
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

## Current Extracted Values

| Property | Value |
|----------|-------|
| CDN Domain | `rpyztjadsbonh.store` |
| Ad Server Domain | `phlgoukjpcgla.space` |
| XOR Key | `xR9tB2pL6q7MwVe` |
| VAST Endpoint | `/video/select.php` |
| Slider Endpoint | `/video/slider.php` |

## Security Measures

1. **Token-based URLs**: Stream URLs include time-based tokens
2. **Referrer Checks**: CDN validates referrer headers
3. **CORS Restrictions**: Streams require proper origin headers
4. **Rate Limiting**: Multiple requests trigger blocks
5. **Adblock Detection**: `isAdbMode` and `adblockSettings` checks

## Files Created

### Analysis Scripts
- `dlhd-decoder-module.js` - Main decoder module
- `dlhd-stream-extractor-v2.js` - Stream URL extractor
- `dlhd-xor-decoder.js` - XOR decoder implementation
- `dlhd-comprehensive-analysis.js` - Full analysis script
- `dlhd-vast-analysis.js` - VAST response analysis
- `dlhd-endpoint-analysis.js` - Endpoint analysis
- `dlhd-url-decode.js` - URL decoding analysis

### Data Files
- `dlhd-stream-fresh.html` - Fresh page capture
- `dlhd-all-decoded-strings.json` - All decoded obfuscated strings
- `dlhd-categorized-strings.json` - Strings categorized by type
- `dlhd-stream-strings.json` - Stream-related strings

### Documentation
- `DLHD_DEOBFUSCATION_SUMMARY.md` - This file
- `DLHD_STREAM_URL_CONSTRUCTION.md` - Detailed URL construction guide

## Notes

- The XOR key may change between page loads or stream IDs
- The key is derived from the obfuscated string array
- Key indices (0xbad, 0xb73) may vary in different versions
- CDN domains rotate frequently
- VAST responses contain the actual stream URLs
