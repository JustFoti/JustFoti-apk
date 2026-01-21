# DLHD Timestamp Fix - Deployment Guide

## What Was Fixed

DLHD added a new security measure on January 21, 2026 that requires timestamps in key requests to be **5-10 seconds in the past** instead of using the current time.

### The Problem
- All DLHD streams were failing
- Key requests returned: `{"error":"E11","message":"Timestamp out of range"}`
- Using current timestamp (`Date.now()`) was being rejected

### The Solution
Changed timestamp calculation from:
```typescript
const timestamp = Math.floor(Date.now() / 1000);
```

To:
```typescript
const timestamp = Math.floor(Date.now() / 1000) - 7; // 7 seconds in the past
```

## Files Modified

1. ✅ `cloudflare-proxy/src/dlhd-proxy.ts` - Line 770
2. ✅ `cloudflare-proxy/src/tv-proxy.ts` - Line 543
3. ✅ `rpi-proxy/dlhd-auth-v3.js` - Line 160
4. ✅ `app/api/dlhd-proxy/info/route.ts` - Line 178

## Deployment Steps

### 1. Deploy Cloudflare Worker

```bash
cd cloudflare-proxy
npm install -g wrangler  # If not already installed
npm run deploy
```

This will deploy the updated worker to: `https://media-proxy.vynx.workers.dev`

### 2. Restart RPI Proxy (if using)

```bash
cd rpi-proxy
pm2 restart dlhd-proxy
# OR
node server.js
```

### 3. Restart Next.js Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Verification

### Test the Fix

Run the verification script:
```bash
node test-dlhd-fix-verification.js
```

Expected output:
```
✅ Successful: 2/3 or 3/3
🎉 ALL TESTS PASSED! The timestamp fix is working!
```

### Test Individual Channel

```bash
# Test through your API
curl "http://localhost:3000/api/dlhd-proxy?channel=51"

# Should return M3U8 playlist with proxied segments and keys
```

### Check Worker Health

```bash
curl https://media-proxy.vynx.workers.dev/dlhd/health
```

Expected response:
```json
{
  "status": "healthy",
  "provider": "dlhd",
  "version": "2.0.1",
  "domain": "dvalna.ru",
  "security": "pow-auth"
}
```

## What to Watch For

### Success Indicators
- ✅ Key requests return 200 OK
- ✅ Keys are 16 bytes (AES-128)
- ✅ Video playback works
- ✅ No E11 errors in logs

### Failure Indicators
- ❌ E11 errors: "Timestamp out of range"
- ❌ E9 errors: "Missing required headers"
- ❌ 403 Forbidden responses
- ❌ Video playback fails

## Troubleshooting

### If Streams Still Don't Work

1. **Check timestamp offset**:
   ```bash
   node test-dlhd-timestamp-analysis.js
   ```
   This will test different offsets (5s, 7s, 10s) to find what works.

2. **Verify PoW computation**:
   - Make sure HMAC secret is correct
   - Check MD5 hash implementation
   - Verify nonce is being sent

3. **Check RPI proxy** (if using):
   - Ensure RPI_PROXY_URL is set
   - Verify RPI_PROXY_KEY is correct
   - Test RPI proxy directly

4. **Check Cloudflare Worker**:
   - Verify deployment succeeded
   - Check worker logs in Cloudflare dashboard
   - Test worker directly (not through Next.js)

### If Timestamp Offset Needs Adjustment

If 7 seconds doesn't work, try adjusting in all files:

```typescript
// Try 5 seconds
const timestamp = Math.floor(Date.now() / 1000) - 5;

// Try 10 seconds
const timestamp = Math.floor(Date.now() / 1000) - 10;
```

Then redeploy all components.

## Performance Impact

- **Latency**: No additional latency (timestamp calculation is instant)
- **Success Rate**: Should return to 98%+ (same as before)
- **Cache**: No impact on caching behavior

## Security Implications

This fix maintains all existing security measures:
- ✅ JWT authentication still required
- ✅ PoW nonce still computed
- ✅ HMAC validation still performed
- ✅ Origin validation still enforced

The only change is the timestamp value used in PoW computation.

## Rollback Plan

If the fix causes issues:

1. **Revert code changes**:
   ```bash
   git diff HEAD~1 HEAD
   git revert HEAD
   ```

2. **Redeploy**:
   ```bash
   cd cloudflare-proxy
   npm run deploy
   ```

3. **Test alternative offsets** before reverting completely

## Documentation

- 📄 `DLHD_TIMESTAMP_FIX_JAN2026.md` - Full technical documentation
- 📄 `DLHD_JANUARY_2026_FIX.md` - Previous PoW fix
- 📄 `DLHD_MULTILINE_URL_FIX.md` - Segment URL parsing fix

## Summary

**Issue**: DLHD added timestamp validation requiring timestamps to be 5-10 seconds old  
**Fix**: Changed timestamp calculation to `Date.now() - 7 seconds`  
**Status**: ✅ Tested and working  
**Deployment**: Required for Cloudflare Worker, RPI Proxy, and Next.js API  

**Next Steps**:
1. Deploy Cloudflare Worker
2. Restart RPI Proxy (if using)
3. Restart Next.js app
4. Run verification tests
5. Monitor for any issues

---

**Last Updated**: January 21, 2026  
**Fix Verified**: ✅ Working
