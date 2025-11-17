# Superembed Extraction Summary

## What I Discovered

After extensive testing and analysis, I've discovered that **Superembed on vidsrc-embed.ru works differently** from the other providers (2Embed, CloudStream Pro).

### Architecture Differences

**2Embed / CloudStream Pro Flow:**
1. Embed page → Extract hash from `data-hash` attribute
2. RCP page (`/rcp/hash`) → Extract ProRCP URL
3. ProRCP page (`/prorcp/hash`) → Extract hidden div with encoded M3U8
4. Decode hidden div → Get M3U8 URL

**Superembed Flow:**
1. Embed page → Extract hash from `data-hash` attribute  
2. RCP page (`/rcp/hash`) → Extract SrcRCP URL
3. SrcRCP page (`/srcrcp/hash`) → **Full streaming player page with embedded video**

### Key Finding

The SrcRCP page for Superembed is NOT a simple page with a hidden div. Instead, it's a complete streaming player page (similar to what you'd see on multiembed.mov) with:
- Video player interface
- Ad scripts
- Source selection UI
- Direct video embedding

This means Superembed likely:
1. Uses a different streaming service backend
2. Embeds the player directly rather than providing an M3U8 URL
3. May require JavaScript execution to extract the actual video source

## What Was Implemented

I created a working superembed extractor (`app/lib/services/superembed-extractor.ts`) that:

✅ Successfully extracts the superembed hash from the embed page
✅ Fetches the RCP page
✅ Extracts the SrcRCP URL
✅ Fetches the SrcRCP player page

❌ Cannot extract M3U8 URL because the page doesn't contain a hidden div with encoded URL
❌ The player page requires JavaScript execution to load the video source

## Workaround for Hash Extraction Bug

I discovered and worked around a bug in the hash extractor (`app/lib/services/rcp/hash-extractor.ts`):
- The `escapeRegex` method was using a UUID placeholder instead of properly escaping regex characters
- This was fixed to use `'\\$&'` for proper regex escaping
- Added a manual pattern match as a workaround for Bun's regex engine issues

## Next Steps

To fully support Superembed extraction, you would need to:

1. **Use Puppeteer/Browser Automation**: The SrcRCP player page likely loads the video source dynamically via JavaScript
2. **Reverse Engineer the Player**: Analyze the JavaScript on the player page to find how it loads video sources
3. **Alternative Approach**: Check if Superembed has a direct API or if there's a way to extract the source without loading the full player

## Files Modified

- `app/lib/services/superembed-extractor.ts` - Complete rewrite using RCP infrastructure
- `app/lib/services/unified-stream-extractor.ts` - Updated to use new superembed interface
- `app/lib/services/rcp/hash-extractor.ts` - Fixed escapeRegex bug (already fixed by system)

## Test Scripts Created

- `scripts/test-superembed-extractor.js` - Basic extraction flow test
- `scripts/test-superembed-simple.js` - Simple integration test
- `scripts/test-hash-pattern.js` - Pattern matching test
- `scripts/test-hash-extractor-direct.js` - Direct hash extractor test
- `scripts/debug-pattern.js` - Pattern debugging
- `scripts/test-http-client-html.js` - HTTP client HTML comparison

## Conclusion

Superembed extraction requires a different approach than the other providers. The current implementation successfully navigates to the player page but cannot extract the M3U8 URL because it's embedded in a JavaScript-based player rather than a simple encoded hidden div.

For production use, I recommend either:
1. Using Puppeteer to execute JavaScript and extract the video source
2. Focusing on 2Embed and CloudStream Pro which have working extractors
3. Investigating if there's a simpler API endpoint for Superembed
