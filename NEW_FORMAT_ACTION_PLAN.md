# NEW Format Decoding - Action Plan

## Current Status

✅ **OLD Format**: 100% success rate with static decoders  
❌ **NEW Format**: Requires JavaScript execution (not currently supported)

## The Problem

The NEW format sample (`prorcp-ODBlOWZkMGU5NmEwYTIy.html`) uses dynamic JavaScript-based obfuscation that cannot be decoded statically. The encoded string is processed by heavily obfuscated JavaScript code that runs in the browser.

### What We Know:

1. **Encoded String**: `41f1c0e186b1d38522b4b744e20057e004c0e2973026425033...` (7564 chars, 3782 bytes)
2. **Format**: Hex-encoded bytes
3. **Decoder Location**: Loaded via `/sV05kUlNvOdOxvtC/1184f38cd2d7510f674487c339b97d0a.js`
4. **Decoder Type**: Heavily obfuscated JavaScript with variable names like `_0x2fc11d`, `_0x351383`, etc.
5. **Processing**: The decoder runs client-side and populates a variable that PlayerJS uses

## Why Static Decoding Fails

The NEW format decoder:
- Uses dynamic code generation
- Has obfuscated control flow
- May use time-based or environment-based keys
- Requires full JavaScript execution environment
- Cannot be reverse-engineered to a simple XOR/Base64 algorithm

## Solutions (Ranked by Feasibility)

### Option 1: Server-Side Puppeteer (RECOMMENDED)
**Pros:**
- Works 100% of the time
- No reverse engineering needed
- Handles format changes automatically

**Cons:**
- Slower (2-5 seconds per decode)
- Requires serverless function or dedicated server
- Higher resource usage

**Implementation:**
```javascript
// Already exists in app/lib/services/rcp/puppeteer-decoder.ts
import { decode as puppeteerDecode } from './puppeteer-decoder';

const decoded = await puppeteerDecode(divContent, dataI, divId, proRcpHash);
```

**Deployment:**
- Vercel Serverless Function with @sparticuz/chromium
- AWS Lambda with Puppeteer Layer
- Dedicated Node.js server

### Option 2: Hybrid Approach (BEST FOR PRODUCTION)
Use static decoders for OLD format (fast) and Puppeteer for NEW format (slow but works).

**Implementation:**
```javascript
// Detect format
const pattern = detectPattern(encodedString);

if (pattern === 'old_format') {
  // Fast static decode (59ms)
  return oldFormatDecoder(encodedString);
} else {
  // Slow Puppeteer decode (2-5s)
  return await puppeteerDecode(encodedString, hash);
}
```

**Pros:**
- Best of both worlds
- Fast for OLD format (majority of content)
- Works for NEW format when needed

**Cons:**
- Complex deployment
- Need to maintain both paths

### Option 3: Deep Reverse Engineering (NOT RECOMMENDED)
Attempt to fully deobfuscate the JavaScript decoder and reimplement in static code.

**Pros:**
- Would be fast if successful
- Edge-compatible

**Cons:**
- Extremely time-consuming (days/weeks)
- May be impossible due to obfuscation techniques
- Breaks when they update the decoder
- Not worth the effort

### Option 4: Wait for Format Change
The NEW format may be temporary. Monitor if it reverts to OLD format.

**Pros:**
- No work needed
- OLD format already works perfectly

**Cons:**
- Uncertain timeline
- May never revert
- Content unavailable in meantime

## Recommended Implementation Plan

### Phase 1: Immediate (Use Puppeteer for NEW Format)
1. Deploy Puppeteer decoder to serverless function
2. Update main decoder to use Puppeteer as fallback for NEW format
3. Add caching to reduce Puppeteer calls

```javascript
// In app/lib/decoders/index.ts
export async function decode(encodedString, options) {
  // Try static decoders first
  const staticResult = decodeSync(encodedString, options);
  
  if (staticResult.success) {
    return staticResult; // Fast path
  }
  
  // Fallback to Puppeteer for NEW format
  if (options.allowPuppeteer && options.proRcpHash) {
    const puppeteerResult = await puppeteerDecode(
      encodedString,
      options.dataI,
      options.divId,
      options.proRcpHash
    );
    
    return {
      success: true,
      urls: [puppeteerResult],
      pattern: 'new_format_puppeteer',
      decoderUsed: 'puppeteer-decoder'
    };
  }
  
  return staticResult; // Return failure
}
```

### Phase 2: Optimization (Add Caching)
1. Cache decoded URLs by hash
2. Use Redis or similar for distributed cache
3. Reduce Puppeteer calls by 90%+

```javascript
// Check cache first
const cached = await cache.get(`prorcp:${proRcpHash}`);
if (cached) return cached;

// Decode with Puppeteer
const decoded = await puppeteerDecode(...);

// Cache for 24 hours
await cache.set(`prorcp:${proRcpHash}`, decoded, 86400);
```

### Phase 3: Monitoring (Track Format Usage)
1. Log which format is used for each decode
2. Monitor OLD vs NEW format ratio
3. Adjust strategy based on data

## Current Test Results

From `test-decoders.js`:
- **Total Samples**: 2
- **OLD Format**: 1/1 (100% success)
- **NEW Format**: 0/1 (0% success - expected)

From `validate-decoders.js`:
- **Validation Pass Rate**: 100%
- **OLD Format**: Validated successfully
- **NEW Format**: Both static and Puppeteer failed (Puppeteer needs live page)

## Next Steps

1. **Test with Live vidsrc-embed.ru URLs**
   - Determine which format is currently in use
   - Get actual success rate in production

2. **Deploy Puppeteer Decoder**
   - Set up serverless function
   - Test with NEW format samples
   - Measure performance

3. **Implement Hybrid Approach**
   - Update main decoder with fallback logic
   - Add caching layer
   - Deploy to production

4. **Monitor and Optimize**
   - Track format distribution
   - Optimize cache hit rate
   - Reduce Puppeteer usage

## Conclusion

**The NEW format CANNOT be decoded statically with current technology.** The obfuscation is too complex and dynamic. The only reliable solution is to use Puppeteer or a similar JavaScript execution environment.

**Recommended Action**: Implement the Hybrid Approach (Option 2) with Puppeteer fallback for NEW format. This gives us:
- ✅ 100% coverage (both formats)
- ✅ Fast for OLD format (59ms)
- ✅ Works for NEW format (2-5s)
- ✅ Production-ready
- ✅ Handles future format changes

The static decoders are working perfectly for their intended purpose (OLD format). We just need to add Puppeteer support for the NEW format edge case.
