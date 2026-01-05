# DLHD New Authentication Analysis (January 2026)

## Summary
DLHD has implemented new security measures to prevent unauthorized access. The key changes are:

## ✅ SOLUTION IMPLEMENTED

The v2 authentication is now working! Key insight: **The HMAC secret is dynamically generated per session/page load**.

### How We Extract the Dynamic Secret

The secret is stored as a base64 array in the obfuscated JavaScript:
```javascript
// Pattern in player page (variable names are randomized each load)
const _287c185fb = ["ZTFkOTg3M2JmMjli","MTc1YjJjMmI2ODE4",...];
const _b554c8cc = atob(_287c185fb.join(''));
// Decoded: e1d9873bf29b175b2c2b68188a4d03d6246bbe33c315175fc9e29bc766fd939e
```

Our extraction algorithm:
1. Find all arrays of base64 strings in the page
2. Join and decode each array
3. Check if the result is a 64-character hex string (HMAC-SHA256 key)
4. Use that as the signing key for requests

## New Security Measures

### 1. HMAC-SHA256 Signed Key Requests
Every key request now requires these headers:
- `Authorization: Bearer <JWT_TOKEN>`
- `X-Key-Timestamp: <unix_timestamp>`
- `X-Key-Sequence: <incrementing_number>`
- `X-Key-Signature: <hmac_sha256_signature>`
- `X-Key-Fingerprint: <browser_fingerprint_hash>`

### 2. Signature Generation
```javascript
// Fingerprint = SHA256(userAgent|screenRes|timezone|language).substring(0, 16)
const fingerprint = CryptoJS.SHA256(
  `${userAgent}|${screenWidth}x${screenHeight}|${timezone}|${language}`
).toString().substring(0, 16);

// Signature = HMAC-SHA256(resource|keyNumber|timestamp|sequence|fingerprint, SECRET)
const signature = CryptoJS.HmacSHA256(
  `${resource}|${keyNumber}|${timestamp}|${sequence}|${fingerprint}`,
  SECRET_KEY
).toString();
```

### 3. Secret Key (Obfuscated)
The HMAC secret is split into base64 chunks and reassembled:
```javascript
const secretParts = [
  "YmIwYjhiNTZmYmZi",  // bb0b8b56fbfb
  "YTUxMGVkMjUyMzc2",  // a510ed252376
  "NmQ1YmZjOWIxYjg1",  // 6d5bfc9b1b85
  "MzU5Njg2NzBlZDA5",  // 35968670ed09
  "YjMxMTI2NzVjNTRj",  // b3112675c54c
  "NzAzOQ=="           // 7039
];
// Full secret: bb0b8b56fbfba510ed2523766d5bfc9b1b85359686070ed09b3112675c54c7039
```

### 4. JWT Token Structure
The session token is now a proper JWT:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJwcmVtaXVtNTEiLCJjb3VudHJ5IjoiVVMiLCJpYXQiOjE3Njc1NzkyNjUsImV4cCI6MTc2NzU5NzI2NX0.imkLfTghMsqY0SaK0qUPFrVNTAaln5O-YN2IIGL8Opk
```

Decoded payload:
```json
{
  "sub": "premium51",
  "country": "US",
  "iat": 1767579265,
  "exp": 1767597265
}
```

### 5. Heartbeat Session Management
- Heartbeat endpoint: `https://chevy.kiko2.ru/heartbeat`
- Called immediately on load, then every 40 seconds
- Required headers:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `X-Channel-Key: premium<channel_id>`
  - `X-Client-Token: <base64_encoded_fingerprint_data>`
  - `X-User-Agent: <browser_user_agent>`

### 6. Client Token Generation
```javascript
const clientToken = btoa(
  `${channelKey}|${country}|${timestamp}|${userAgent}|${fingerprint}`
);
```

## Implementation Requirements

### ✅ COMPLETED - All requirements implemented in `rpi-proxy/dlhd-auth-v2.js`

To bypass this, we need to:

1. **✅ Fetch the player page** to extract:
   - JWT token (SESSION_TOKEN)
   - Channel key
   - Country
   - Timestamps
   - **HMAC secret (dynamically extracted from obfuscated JS)**

2. **✅ Generate browser fingerprint** matching their algorithm

3. **✅ Sign every key request** with HMAC-SHA256 using the dynamic secret

4. **✅ Maintain heartbeat** to keep session alive

5. **✅ Track sequence numbers** (incrementing counter per session)

## Test Results (January 4, 2026)

```
✅ fingerprint - SHA256 hash generation works
✅ signature - HMAC-SHA256 signing works  
✅ hmacExtraction - Dynamic secret extraction from page works
✅ authFetch - JWT token + HMAC secret extraction works
✅ serverLookup - Server key lookup works
✅ keyFetch - Key fetch with signed headers works!
```

## Key URL Pattern
```
https://chevy.kiko2.ru/key/premium<channel>/<segment_number>
```

## Required Headers for Key Fetch
```
Authorization: Bearer <jwt_token>
X-Key-Timestamp: <unix_timestamp>
X-Key-Sequence: <sequence_number>
X-Key-Signature: <hmac_signature>
X-Key-Fingerprint: <fingerprint_hash>
```


## Files Modified

1. **`rpi-proxy/dlhd-auth-v2.js`** - New v2 auth module with:
   - `extractHmacSecret()` - Extracts dynamic HMAC secret from obfuscated JS
   - `fetchAuthDataV2()` - Fetches JWT token + HMAC secret from player page
   - `generateKeySignature()` - Signs requests with HMAC-SHA256
   - `fetchKeyWithAuthV2()` - Fetches keys with signed headers
   - `fetchDLHDKeyV2()` - Full key fetch flow with retry logic

2. **`rpi-proxy/server.js`** - Updated to use v2 auth:
   - Imports `dlhd-auth-v2` module
   - `fetchKeyWithAuth()` now uses `dlhdAuthV2.fetchDLHDKeyV2()`

3. **`rpi-proxy/test-dlhd-v2.js`** - Test script for v2 auth

## Key Insight

The HMAC secret is **NOT static** - it changes with every page load. The secret is stored as a base64 array in the obfuscated JavaScript, and we extract it by:

1. Finding all arrays of base64 strings in the page
2. Joining and decoding each array
3. Checking if the result is a 64-character hex string
4. Using that as the HMAC-SHA256 signing key

This approach successfully bypasses DLHD's new security measures.
