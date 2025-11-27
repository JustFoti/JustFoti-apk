# DLHD.dad Stream Extraction - Final Results

## ✅ Successfully Decrypted Stream!

### Stream ID: 769

#### Working M3U8 Playlist URL
```
https://zekonew.giokko.ru/zeko/premium769/mono.css
```

**Note:** The URL ends in `.css` but serves valid M3U8 content with `Content-Type: application/vnd.apple.mpegurl`

#### Decryption Key URL
```
https://top2.giokko.ru/wmsxx.php?test=true&name=premium769&number={NUMBER}
```

**CRITICAL:** The key URL requires the `Referer: https://epicplayplay.cfd/` header!

#### Successfully Decrypted
- **Key**: `7a346139cf409aebeec575e7ca589e93` (16 bytes)
- **IV**: `0x3030303030303030303030306927c5bf`
- **Encrypted segment**: 1,422,800 bytes
- **Decrypted segment**: 1,422,784 bytes
- **Format**: Valid MPEG-TS (sync byte 0x47 confirmed)

#### M3U8 Playlist Content
```m3u8
#EXTM3U
#EXT-X-MEDIA-SEQUENCE:29140
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:5
#EXT-X-KEY:METHOD=AES-128,URI="https://top2.giokko.ru/wmsxx.php?test=true&name=premium769&number=5880714",IV=0x3030303030303030303030306927c5bf,KEYFORMAT="identity"
#EXT-X-PROGRAM-DATE-TIME:2025-11-27T03:13:15.111+00:00
#EXTINF:4.204,
https://whalesignal.ai/Ek0WSAsNTBkQBV4FQ1ENUQBTBlgSXQUFSFULWFxSCF8VHwpYGkEdWBRTElwGGwRBBFQFLA5ySgtXFUkGTgRBGl4HQkMeVwZYH1RfDl4YEVtQVwpMVUJEVw1BR1ABWhU
#EXTINF:4.204,
https://whalesignal.ai/...
```

## Stream URL Patterns

### M3U8 Playlist Pattern
```
https://zekonew.giokko.ru/zeko/premium{STREAM_ID}/mono.css
```

### Decryption Key Pattern
```
https://top2.giokko.ru/wmsxx.php?test=true&name=premium{STREAM_ID}&number={NUMBER}
```

**Required Headers for Key:**
```
Referer: https://epicplayplay.cfd/
```

### Video Segments Pattern
```
https://whalesignal.ai/{ENCODED_PATH}
```

## How to Decrypt

### Node.js Decryption Code
```javascript
const crypto = require('crypto');
const https = require('https');

// Fetch key with correct Referer header
function fetchKey(keyUrl) {
    return new Promise((resolve, reject) => {
        https.get(keyUrl, {
            headers: {
                'Referer': 'https://epicplayplay.cfd/',
                'User-Agent': 'Mozilla/5.0'
            }
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

// Decrypt segment
function decryptSegment(encryptedData, key, ivHex) {
    const ivBuffer = Buffer.alloc(16, 0);
    Buffer.from(ivHex, 'hex').copy(ivBuffer, 16 - Buffer.from(ivHex, 'hex').length);
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, ivBuffer);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}
```

## How to Play

### Using VLC
```bash
vlc "https://zekonew.giokko.ru/zeko/premium769/mono.css"
```

### Using ffplay
```bash
ffplay "https://zekonew.giokko.ru/zeko/premium769/mono.css"
```

### Using ffmpeg (download)
```bash
ffmpeg -i "https://zekonew.giokko.ru/zeko/premium769/mono.css" -c copy output.ts
```

**Note:** Standard players may fail to fetch the key due to missing Referer header. Use the decryption script for reliable playback.

## Stream Infrastructure

### CDN Domains
| Domain | Purpose |
|--------|---------|
| `zekonew.giokko.ru` | M3U8 playlist server |
| `top2.giokko.ru` | Decryption key server |
| `whalesignal.ai` | Video segment CDN |
| `security.giokko.ru` | Authentication |

### Encryption
- **Method:** AES-128
- **Key Format:** identity
- **IV:** Dynamic (included in playlist)

## Extraction Flow

1. **Main Page:** `https://dlhd.dad/casting/stream-{ID}.php`
2. **Player Iframe:** `https://epicplayplay.cfd/premiumtv/daddyhd.php?id={ID}`
3. **M3U8 Playlist:** `https://zekonew.giokko.ru/zeko/premium{ID}/mono.css`
4. **Key Fetch:** `https://top2.giokko.ru/wmsxx.php?...`
5. **Segments:** `https://whalesignal.ai/{encoded}`

## Files Created

- `dlhd-realtime-decrypt.js` - **Complete working decryption script**
- `dlhd-final-extractor.js` - Main extraction script
- `dlhd-live-capture.js` - Network capture script
- `dlhd-decrypted-769.ts` - **Successfully decrypted MPEG-TS segment**
- `dlhd-encrypted-769.bin` - Encrypted segment for reference
- `dlhd-stream-769-final.json` - Extracted stream data

## Key Discovery

The critical insight was that the **key server requires the Referer header** to be set to `https://epicplayplay.cfd/` (the player iframe domain). Without this header, the key URL returns 404.

### Headers Required for Key Fetch:
```
Referer: https://epicplayplay.cfd/
Origin: https://epicplayplay.cfd
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

## Notes

1. The M3U8 URL is disguised as a CSS file but serves valid HLS content
2. The stream is AES-128-CBC encrypted
3. Segments are served from `whalesignal.ai` with encoded paths
4. **Key URL requires `Referer: https://epicplayplay.cfd/` header**
5. The `number` parameter in the key URL changes periodically
6. IV is provided in the M3U8 playlist
7. Successfully decrypted segment is valid MPEG-TS (verified by 0x47 sync byte)
