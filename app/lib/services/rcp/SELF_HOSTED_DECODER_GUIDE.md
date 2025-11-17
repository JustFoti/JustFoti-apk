# Self-Hosted Decoder Integration Guide

## Overview

The self-hosted decoder allows us to decode ProRCP hidden divs **without relying on vidsrc-embed.ru's prorcp pages**. This is a critical improvement that:

1. ✅ Eliminates dependency on their infrastructure
2. ✅ Improves reliability and performance
3. ✅ Reduces network requests
4. ✅ Works with obfuscation changes (just update the cached script)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RCP Extraction Flow                       │
└─────────────────────────────────────────────────────────────┘

1. Fetch Embed Page (vidsrc-embed.ru)
   ↓
2. Extract RCP Hash
   ↓
3. Fetch RCP Page (cloudnestra.com/rcp/{hash})
   ↓
4. Extract ProRCP Hash + data-i attribute
   ↓
5. Fetch ProRCP Page (cloudnestra.com/prorcp/{hash})
   ↓
6. Extract Hidden Div (divId, divContent)
   ↓
7. **DECODE USING SELF-HOSTED DECODER** ← NEW!
   ↓
8. Get M3U8 URL
```

## Usage

### Basic Usage

```typescript
import { selfHostedDecoder } from '@/lib/services/rcp';

// After extracting hidden div from ProRCP page
const result = await selfHostedDecoder.decode(
  divContent,  // The encoded content from the hidden div
  dataI,       // The data-i attribute from the body tag
  divId,       // The ID of the hidden div
  requestId    // Optional: for logging
);

if (result.success) {
  console.log('Decoded M3U8 URL:', result.value);
} else {
  console.error('Decode failed:', result.error);
}
```

### Integration with Existing Flow

```typescript
import { 
  rcpFetcher, 
  proRcpExtractor, 
  hiddenDivExtractor,
  selfHostedDecoder 
} from '@/lib/services/rcp';

async function extractM3U8(rcpHash: string, requestId: string) {
  // 1. Fetch RCP page
  const rcpResponse = await rcpFetcher.fetchRCP(rcpHash, 'vidsrc', requestId);
  if (!rcpResponse.success) {
    throw new Error('Failed to fetch RCP page');
  }

  // 2. Extract ProRCP URL
  const proRcpUrl = proRcpExtractor.extract(
    rcpResponse.html,
    'vidsrc',
    requestId
  );
  if (!proRcpUrl) {
    throw new Error('Failed to extract ProRCP URL');
  }

  // 3. Fetch ProRCP page
  const proRcpResponse = await rcpFetcher.fetchProRCP(
    proRcpUrl,
    'vidsrc',
    requestId
  );
  if (!proRcpResponse.success) {
    throw new Error('Failed to fetch ProRCP page');
  }

  // 4. Extract hidden div
  const hiddenDiv = hiddenDivExtractor.extract(
    proRcpResponse.html,
    'vidsrc',
    requestId
  );
  if (!hiddenDiv) {
    throw new Error('Failed to extract hidden div');
  }

  // 5. Extract data-i attribute
  const dataI = extractDataI(proRcpResponse.html);
  if (!dataI) {
    throw new Error('Failed to extract data-i');
  }

  // 6. **DECODE USING SELF-HOSTED DECODER**
  const decodeResult = await selfHostedDecoder.decode(
    hiddenDiv.encoded,
    dataI,
    hiddenDiv.divId,
    requestId
  );

  if (!decodeResult.success) {
    throw new Error(`Decode failed: ${decodeResult.error}`);
  }

  return decodeResult.value; // M3U8 URL
}

function extractDataI(html: string): string | null {
  const match = html.match(/data-i=["']([^"']+)["']/);
  return match ? match[1] : null;
}
```

## Performance

### Caching

The decoder automatically caches results based on `(dataI, divContent)` pairs:

```typescript
// First call - executes decoder (~100-200ms)
const result1 = await selfHostedDecoder.decode(content, dataI, divId);

// Second call with same content - returns from cache (~1ms)
const result2 = await selfHostedDecoder.decode(content, dataI, divId);
```

### Cache Management

```typescript
// Get cache statistics
const stats = selfHostedDecoder.getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);

// Clear cache if needed
selfHostedDecoder.clearCache();
```

## Maintenance

### Updating the Decoder Script

When vidsrc-embed.ru updates their decoder:

1. Run the download script:
   ```bash
   node DOWNLOAD-AND-DEOBFUSCATE-DECODER.js
   ```

2. This will update `decoder-obfuscated.js` in the project root

3. Restart your application - the new decoder will be loaded automatically

4. No code changes needed!

### Monitoring

The decoder logs all operations:

```typescript
// Success
logger.info('Decoder success', {
  requestId,
  divId,
  dataI,
  resultLength: result.length,
  executionTime: 150
});

// Cache hit
logger.debug('Decoder cache hit', { requestId, divId, dataI });

// Failure
logger.error('Decoder execution failed', {
  requestId,
  divId,
  dataI,
  error: 'timeout',
  executionTime: 5000
});
```

## Error Handling

The decoder handles errors gracefully:

```typescript
const result = await selfHostedDecoder.decode(content, dataI, divId);

if (!result.success) {
  switch (result.error) {
    case 'Decoder execution timeout':
      // Decoder took too long (>5s)
      // Retry or fall back to alternative method
      break;
      
    case 'No decoded value found':
      // Decoder ran but didn't produce output
      // Check if divContent/dataI are correct
      break;
      
    case 'Decoder script not found':
      // decoder-obfuscated.js is missing
      // Run DOWNLOAD-AND-DEOBFUSCATE-DECODER.js
      break;
      
    default:
      // Other error
      console.error('Decode error:', result.error);
  }
}
```

## Testing

### Unit Tests

```bash
bun test app/lib/services/rcp/__tests__/self-hosted-decoder.test.ts
```

### Integration Test

```typescript
import { selfHostedDecoder } from '@/lib/services/rcp';

// Test with real data
const testData = {
  divContent: 'U2FsdGVkX1+...',  // Real encoded content
  dataI: '1234567890',
  divId: 'pjs_123456'
};

const result = await selfHostedDecoder.decode(
  testData.divContent,
  testData.dataI,
  testData.divId
);

console.log('Success:', result.success);
console.log('Value:', result.value);
console.log('Execution time:', result.executionTime, 'ms');
```

## Advantages Over Browser-Based Decoding

### Before (Browser-Based)
- ❌ Required fetching ProRCP page
- ❌ Relied on their infrastructure
- ❌ Slower (extra network request)
- ❌ Could break if their page changed
- ❌ Required browser environment

### After (Self-Hosted)
- ✅ No ProRCP page fetch needed
- ✅ Independent of their infrastructure
- ✅ Faster (no network request)
- ✅ Resilient to page changes
- ✅ Works in Node.js/Edge Runtime

## Edge Runtime Compatibility

The decoder uses VM + JSDOM, which works in:
- ✅ Node.js
- ✅ Vercel Edge Runtime
- ✅ Cloudflare Workers (with polyfills)
- ✅ AWS Lambda

**Note:** For Puppeteer-based decoding (more reliable but heavier), see `SELF-HOSTED-DECODER-FINAL-SOLUTION.md`.

## Troubleshooting

### Decoder returns no value

**Cause:** The decoder script might be outdated or the input data is invalid.

**Solution:**
1. Update decoder script: `node DOWNLOAD-AND-DEOBFUSCATE-DECODER.js`
2. Verify divContent, dataI, and divId are correct
3. Check logs for execution errors

### Decoder timeout

**Cause:** The decoder is taking too long (>5s).

**Solution:**
1. Check if decoder script is corrupted
2. Verify input data is not malformed
3. Consider increasing timeout in `self-hosted-decoder.ts`

### Missing decoder script

**Cause:** `decoder-obfuscated.js` not found in project root.

**Solution:**
```bash
node DOWNLOAD-AND-DEOBFUSCATE-DECODER.js
```

## Future Improvements

1. **Puppeteer Option**: Add Puppeteer-based decoder for maximum reliability
2. **Decoder Rotation**: Support multiple decoder versions
3. **Distributed Caching**: Share cache across instances (Redis)
4. **Metrics**: Track success rates, execution times
5. **Auto-Update**: Automatically detect and download new decoder scripts

## Related Files

- `app/lib/services/rcp/self-hosted-decoder.ts` - Main decoder implementation
- `app/lib/services/rcp/__tests__/self-hosted-decoder.test.ts` - Unit tests
- `decoder-obfuscated.js` - The cached decoder script
- `DOWNLOAD-AND-DEOBFUSCATE-DECODER.js` - Script to update decoder
- `SELF-HOSTED-DECODER-FINAL-SOLUTION.md` - Original solution document

## Conclusion

The self-hosted decoder is a **game-changer** for RCP extraction. It eliminates our dependency on vidsrc-embed.ru's infrastructure while maintaining full compatibility with their encoding system.

**Key Takeaway:** Don't fight the obfuscation, embrace it. By executing their script in our controlled environment, we get all the benefits without the reverse engineering headache.
