# DLHD Quick Fix - January 21, 2026

## The Problem
DLHD streams stopped working. Error: `{"error":"E11","message":"Timestamp out of range"}`

## The Fix
Change this line in 4 files:

### Before ❌
```typescript
const timestamp = Math.floor(Date.now() / 1000);
```

### After ✅
```typescript
const timestamp = Math.floor(Date.now() / 1000) - 7;
```

## Files to Update
1. `cloudflare-proxy/src/dlhd-proxy.ts` (line 770)
2. `cloudflare-proxy/src/tv-proxy.ts` (line 543)
3. `rpi-proxy/dlhd-auth-v3.js` (line 160)
4. `app/api/dlhd-proxy/info/route.ts` (line 178)

## Deploy
```bash
cd cloudflare-proxy && npm run deploy
cd ../rpi-proxy && pm2 restart dlhd-proxy
cd .. && npm run build && npm start
```

## Test
```bash
node test-dlhd-fix-verification.js
```

## Why?
DLHD now requires timestamps to be 5-10 seconds old (not current time). This prevents bots from using `Date.now()`.

## Status
✅ **FIXED** - Tested and working with ESPN and CNN channels.

---

**Full docs**: `DLHD_TIMESTAMP_FIX_JAN2026.md`
