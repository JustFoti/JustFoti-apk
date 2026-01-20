# DLHD Channel Tester - Security Review

## Executive Summary

The original `test-dlhd-channels.js` script contains **critical security vulnerabilities** that expose your anti-leech protection mechanisms and upstream provider infrastructure. This document outlines the issues and provides remediation guidance.

## Critical Vulnerabilities

### 1. Hardcoded Upstream Domains ⚠️ CRITICAL

**Issue:**
```javascript
const PLAYER_DOMAIN = 'epicplayplay.cfd';
const CDN_DOMAIN = 'dvalna.ru';
```

**Risk:** 
- Exposes upstream provider domains in version control
- Makes it trivial for leechers to identify and bypass your proxy
- Violates security through obscurity principle (which you rely on)

**Remediation:**
- Move to environment variables: `process.env.DLHD_PLAYER_DOMAIN`
- Never commit actual values to git
- Use encrypted secrets management in production

### 2. Missing Authentication Layer ⚠️ CRITICAL

**Issue:** Script bypasses all security mechanisms present in production code:
- No Quantum Shield challenges (canvas, audio, WebGL)
- No proof-of-work validation
- No fingerprint binding
- No token signing/verification
- No session management

**Risk:**
- Script serves as a blueprint for attackers to bypass your protection
- Anyone with this code can replicate your access patterns

**Remediation:**
- Route all tests through your CF proxy (`/tv/dlhd/{channel}`)
- Implement token-based authentication for test scripts
- Use the same security layers as production

### 3. No Anti-Leech Protection ⚠️ HIGH

**Issue:** Unlike `anti-leech-proxy.ts`, this script:
- Doesn't validate origin/referer
- Doesn't use signed tokens
- Doesn't track nonces (one-time use)
- Doesn't bind requests to browser fingerprints

**Risk:**
- If this script leaks, leechers can use it directly
- No way to revoke access or track abuse

**Remediation:**
```javascript
// Generate signed token
const timestamp = Date.now();
const signature = await signRequest(sessionId, channelId, timestamp);

// Include in request
headers: {
  'X-Session-ID': sessionId,
  'X-Fingerprint': fingerprint,
  'X-Timestamp': timestamp.toString(),
  'X-Signature': signature,
}
```

### 4. JWT Handling Without Verification ⚠️ HIGH

**Issue:**
```javascript
const jwt = jwtMatch[0];
const payload = JSON.parse(Buffer.from(jwt.split('.')[1]...));
// No signature verification!
```

**Risk:**
- Accepts any JWT, even forged ones
- Attacker could craft malicious JWTs

**Remediation:**
```javascript
// Verify JWT signature before trusting payload
const verified = await verifyJWT(jwt, JWT_SECRET);
if (!verified) {
  throw new Error('Invalid JWT signature');
}
```

### 5. Input Validation Missing ⚠️ MEDIUM

**Issue:**
```javascript
const channelId = channel.id; // No validation
const playerUrl = `https://${PLAYER_DOMAIN}/premiumtv/daddyhd.php?id=${channelId}`;
```

**Risk:**
- Channel ID injection attacks
- Could be used to probe other endpoints

**Remediation:**
```javascript
const VALID_CHANNEL_IDS = new Set(['51', '325', '326', ...]);

function validateChannelId(id) {
  if (!VALID_CHANNEL_IDS.has(id)) {
    throw new Error('Invalid channel ID');
  }
  return id;
}
```

### 6. Exposed Error Messages ⚠️ MEDIUM

**Issue:**
```javascript
console.log(`❌ FAIL: M3U8 fetch failed - HTTP ${m3u8Res.status}`);
console.log(`  Preview: ${m3u8Content.substring(0, 200)}`);
```

**Risk:**
- Leaks internal URLs and response data
- Helps attackers understand your infrastructure

**Remediation:**
```javascript
// Production: sanitize errors
console.log(`❌ FAIL: ${result.status}`);
// Don't log response content or URLs
```

### 7. Missing Proof-of-Work ⚠️ HIGH

**Issue:** Your production code requires PoW nonces:
```typescript
// From tv-proxy.ts
const nonce = await computePoWNonce(resource, keyNumber, timestamp);
```

The test script bypasses this completely.

**Remediation:**
```javascript
async function computePoWNonce(resource, keyNumber, timestamp) {
  const HMAC_SECRET = process.env.DLHD_HMAC_SECRET;
  const THRESHOLD = 0x1000;
  
  for (let nonce = 0; nonce < 100000; nonce++) {
    const message = `${resource}:${keyNumber}:${timestamp}:${nonce}`;
    const hash = await hmacSHA256(message, HMAC_SECRET);
    const prefix = (hash[0] << 8) | hash[1];
    
    if (prefix < THRESHOLD) {
      return nonce;
    }
  }
  
  throw new Error('PoW failed');
}
```

### 8. Client-Side Rate Limiting ⚠️ LOW

**Issue:**
```javascript
await new Promise(resolve => setTimeout(resolve, 1000));
```

**Risk:**
- Trivial to bypass
- Doesn't prevent abuse

**Remediation:**
- Implement server-side rate limiting with KV storage
- Track requests per IP/session
- Use exponential backoff for violations

## Comparison with Production Security

### Your Production Stack (Good ✅)

From `quantum-shield-v3.ts`:
```typescript
// Multi-layer protection
- Canvas fingerprinting
- Audio fingerprinting  
- WebGL compute challenges
- Proof-of-work (CPU intensive)
- Mouse entropy analysis
- Behavioral pattern detection
- Session binding (IP + ASN + fingerprint)
- Token expiry (30 seconds)
- Rate limiting (500ms between requests)
- Violation tracking with blacklisting
```

From `anti-leech-proxy.ts`:
```typescript
// Anti-leech mechanisms
- Origin validation (strict whitelist)
- Signed tokens with HMAC
- One-time use nonces (KV tracking)
- Fingerprint binding
- Time-limited validity (5 minutes)
- Playlist URLs NOT rewritten (leechers get original URLs)
```

### Test Script (Bad ❌)

```javascript
// No protection layers
- Direct domain access
- No authentication
- No fingerprinting
- No rate limiting
- No token signing
- Exposes all URLs
```

## Recommended Architecture

### Option 1: Test Through Proxy (Recommended)

```javascript
// Route all tests through your secure CF proxy
const proxyUrl = `${CF_PROXY_URL}/tv/dlhd/${channelId}`;
const response = await fetch(proxyUrl, {
  headers: {
    'X-Session-ID': sessionId,
    'X-Fingerprint': fingerprint,
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature,
  },
});
```

**Benefits:**
- Uses production security layers
- No direct domain exposure
- Centralized access control
- Easy to revoke/monitor

### Option 2: Secure Direct Testing (Development Only)

```javascript
// Only for local development, never in production
if (process.env.NODE_ENV !== 'development') {
  throw new Error('Direct testing only allowed in development');
}

// Still implement:
- Environment-based config
- Input validation
- Token signing
- Fingerprint binding
- Rate limiting
```

## Implementation Checklist

- [ ] Move domains to environment variables
- [ ] Add `.env` to `.gitignore` (verify it's there)
- [ ] Implement token-based authentication
- [ ] Add fingerprint generation/validation
- [ ] Implement PoW nonce computation
- [ ] Add input validation (channel ID whitelist)
- [ ] Route tests through CF proxy
- [ ] Sanitize error messages
- [ ] Add JWT signature verification
- [ ] Implement server-side rate limiting
- [ ] Add session management
- [ ] Track violations/abuse
- [ ] Document security requirements

## Environment Variables Required

```bash
# .env (NEVER commit this file)
DLHD_PLAYER_DOMAIN=epicplayplay.cfd
DLHD_CDN_DOMAIN=dvalna.ru
DLHD_HMAC_SECRET=7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7
SIGNING_SECRET=your-signing-secret-change-this
NEXT_PUBLIC_CF_TV_PROXY_URL=https://your-worker.workers.dev
```

## Git Security

Verify these files are in `.gitignore`:
```
.env
.env.local
.env.*.local
test-dlhd-channels.js  # Consider adding if it has hardcoded values
```

Check git history for leaked secrets:
```bash
git log --all --full-history -- .env
git log -p | grep -i "epicplayplay\|dvalna"
```

If secrets were committed, rotate them immediately:
1. Change all domain references
2. Regenerate signing secrets
3. Update CF worker environment variables
4. Consider using `git-filter-repo` to remove from history

## Monitoring & Detection

Add logging to detect if test patterns are being used in production:

```typescript
// In your CF worker
if (isTestPattern(request)) {
  await logSuspiciousActivity({
    type: 'TEST_PATTERN_IN_PROD',
    ip: request.headers.get('cf-connecting-ip'),
    userAgent: request.headers.get('user-agent'),
    timestamp: Date.now(),
  });
  
  return errorResponse('Access denied', 403);
}
```

## Secure Alternative: Use Existing Proxy

Instead of direct testing, use your existing secure endpoints:

```javascript
// Test via your production proxy (with proper auth)
const testChannel = async (channelId) => {
  // 1. Initialize Quantum Shield session
  const session = await fetch(`${CF_PROXY_URL}/v3/init`, {
    method: 'POST',
  }).then(r => r.json());
  
  // 2. Complete challenges (canvas, audio, webgl)
  await completeChallenge(session.sessionId, session.challenge);
  
  // 3. Submit behavioral data
  await submitBehavioral(session.sessionId, mouseData);
  
  // 4. Complete PoW
  await completePoW(session.sessionId);
  
  // 5. Request stream with signed token
  const stream = await fetch(`${CF_PROXY_URL}/tv/dlhd/${channelId}`, {
    headers: {
      'X-Session-ID': session.sessionId,
      'X-Fingerprint': fingerprint,
      'X-Token': token,
      'X-Signature': signature,
    },
  });
  
  return stream.ok;
};
```

This approach:
- Uses your production security stack
- No domain exposure
- Validates your entire security chain
- Detects if any layer is broken

## Test Scripts Overview

The project includes several DLHD test scripts with different purposes:

| Script | Purpose | Security | Use Case |
|--------|---------|----------|----------|
| `test-dlhd-channels.js` | Batch test multiple channels | ⚠️ Insecure (hardcoded domains) | Quick validation only |
| `test-failing-channels.js` | Detailed single-channel testing | ⚠️ Insecure (hardcoded domains) | Debugging specific channels |
| `test-dlhd-channels-secure.js` | Secure testing via proxy | ✅ Secure (env vars, auth) | Production testing |
| `test-m3u8-rewrite.js` | Test URL joining logic | ✅ Safe (no network calls) | Unit testing |
| `test-m3u8-content.js` | Inspect M3U8 structure | ⚠️ Insecure (hardcoded domains) | Content analysis |

**Recommendation:** Use `test-dlhd-channels-secure.js` for any production or CI/CD testing. The other scripts are for development debugging only and should never be committed with hardcoded credentials.

## Conclusion

The original test script is a **security liability**. It exposes your entire anti-leech infrastructure and provides a blueprint for attackers. 

**Immediate Actions:**
1. Replace with `test-dlhd-channels-secure.js`
2. Move all domains to environment variables
3. Add original script to `.gitignore`
4. Check git history for leaked secrets
5. Route all tests through your CF proxy

**Long-term:**
- Implement Quantum Shield for all test scripts
- Add monitoring for test pattern abuse
- Regular security audits of test code
- Consider separate test environment with different domains
