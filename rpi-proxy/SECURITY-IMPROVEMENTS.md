# RPI Proxy Security Improvements

## Current Security Analysis

### Issues Found

1. **Weak API Key Handling**
   - Default key is hardcoded
   - No timing-safe comparison
   - No key rotation

2. **Overly Permissive CORS**
   - All endpoints return `Access-Control-Allow-Origin: *`
   - Any website can call the proxy

3. **Rate Limiting Disabled**
   - Authenticated requests bypass rate limiting entirely
   - Leaked API key = unlimited abuse

4. **Missing URL Validation**
   - `/proxy`, `/animekai`, `/dlhd-key` accept any URL
   - Potential SSRF vulnerability

5. **No Request Signing**
   - Unlike CF anti-leech proxy, no signed tokens
   - No fingerprint binding or nonce tracking

## Recommended Fixes

### 1. Implement Origin Validation (High Priority)

```javascript
// Add at top of file
const ALLOWED_ORIGINS = [
  'https://tv.vynx.cc',
  'https://flyx.tv',
  'https://www.flyx.tv',
  'http://localhost:3000',
  'http://localhost:3001',
];

const ALLOWED_ORIGIN_PATTERNS = [
  /\.vercel\.app$/,
  /\.pages\.dev$/,
  /\.workers\.dev$/,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Check patterns
  try {
    const hostname = new URL(origin).hostname;
    return ALLOWED_ORIGIN_PATTERNS.some(p => p.test(hostname));
  } catch {
    return false;
  }
}

// In request handler, add:
const origin = req.headers['origin'];
const referer = req.headers['referer'];
const refererOrigin = referer ? new URL(referer).origin : null;

if (!isAllowedOrigin(origin) && !isAllowedOrigin(refererOrigin)) {
  // For CF Worker requests, check X-Forwarded-Origin header
  const forwardedOrigin = req.headers['x-forwarded-origin'];
  if (!isAllowedOrigin(forwardedOrigin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Origin not allowed' }));
  }
}
```

### 2. Add URL Domain Allowlist (High Priority)

```javascript
// Allowed domains for proxying
const PROXY_ALLOWED_DOMAINS = [
  // DLHD key servers
  'kiko2.ru',
  'giokko.ru',
  'dvalna.ru',
  // AnimeKai/MegaUp
  'megaup.net',
  'enc-dec.app',
  // VIPRow
  'boanki.net',
  'peulleieo.net',
  'casthill.net',
  // PPV
  'poocloud.in',
  // IPTV (add specific domains)
];

function isAllowedProxyDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return PROXY_ALLOWED_DOMAINS.some(d => 
      hostname === d || hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

// Add to each proxy endpoint:
if (!isAllowedProxyDomain(targetUrl)) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ error: 'Domain not allowed' }));
}
```

### 3. Implement Timing-Safe API Key Comparison (Medium Priority)

```javascript
const crypto = require('crypto');

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Replace:
// if (apiKey !== API_KEY)
// With:
if (!timingSafeEqual(apiKey, API_KEY))
```

### 4. Re-enable Rate Limiting with API Key Identifier (Medium Priority)

```javascript
// Rate limit by API key instead of IP
function checkRateLimitByKey(apiKey) {
  const now = Date.now();
  const record = rateLimiter.get(apiKey) || { count: 0, resetAt: now + RATE_WINDOW };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_WINDOW;
  }
  
  record.count++;
  rateLimiter.set(apiKey, record);
  
  // Higher limit for authenticated requests, but still limited
  const limit = 5000; // 5000 requests per minute
  return record.count <= limit;
}

// In request handler:
if (!checkRateLimitByKey(apiKey)) {
  res.writeHead(429, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ error: 'Rate limited' }));
}
```

### 5. Add Request Signing (Optional - For High Security)

If you want to match the security level of `anti-leech-proxy.ts`:

```javascript
const crypto = require('crypto');

// CF Worker signs requests with: HMAC(secret, url + timestamp)
function verifyRequestSignature(url, timestamp, signature, secret) {
  // Check timestamp is recent (5 minute window)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return false;
  }
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(url + timestamp)
    .digest('hex')
    .substring(0, 32);
  
  return timingSafeEqual(signature, expected);
}

// Usage in endpoints:
const signature = reqUrl.searchParams.get('sig');
const timestamp = reqUrl.searchParams.get('ts');
const SIGNING_SECRET = process.env.SIGNING_SECRET || API_KEY;

if (signature && timestamp) {
  if (!verifyRequestSignature(targetUrl, timestamp, signature, SIGNING_SECRET)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid signature' }));
  }
}
```

### 6. Sanitize Error Messages (Low Priority)

```javascript
// Instead of:
res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));

// Use:
const safeError = process.env.NODE_ENV === 'development' 
  ? err.message 
  : 'Internal error';
res.end(JSON.stringify({ error: 'Proxy error', code: 'PROXY_FAILED' }));
console.error(`[Proxy Error] ${err.message}`); // Log full error server-side
```

## Implementation Priority

1. **High**: Origin validation + URL domain allowlist
2. **Medium**: Timing-safe comparison + Rate limiting
3. **Low**: Request signing + Error sanitization

## Comparison with CF Anti-Leech Proxy

| Feature | RPI Proxy | CF Anti-Leech |
|---------|-----------|---------------|
| Origin validation | ❌ None | ✅ Strict |
| URL domain allowlist | ⚠️ Partial | ✅ Full |
| Signed tokens | ❌ None | ✅ HMAC |
| Fingerprint binding | ❌ None | ✅ Yes |
| Nonce tracking | ❌ None | ✅ KV-based |
| Token expiry | ❌ None | ✅ 5 minutes |
| Rate limiting | ❌ Disabled | ✅ Per-session |
| CORS | ⚠️ Wildcard | ✅ Origin-specific |
