/**
 * DLHD Authentication v2 - January 2026
 * 
 * New security measures discovered:
 * 1. HMAC-SHA256 signed key requests
 * 2. Browser fingerprinting
 * 3. Sequence number tracking
 * 4. JWT session tokens
 * 5. DYNAMIC HMAC secret per session (extracted from obfuscated JS)
 * 
 * Required headers for key requests:
 * - Authorization: Bearer <jwt_token>
 * - X-Key-Timestamp: <unix_timestamp>
 * - X-Key-Sequence: <incrementing_number>
 * - X-Key-Signature: <hmac_sha256_signature>
 * - X-Key-Fingerprint: <browser_fingerprint_hash>
 */

const crypto = require('crypto');
const https = require('https');

// Sequence counter per channel (mimics browser behavior)
const sequenceCounters = new Map();

// Cache for auth data per channel (includes dynamic HMAC secret)
const authCache = new Map();

/**
 * Generate browser fingerprint hash (SHA256, first 16 chars)
 * Mimics: CryptoJS.SHA256(userAgent|screenRes|timezone|language).toString().substring(0, 16)
 */
function generateFingerprint(userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36') {
  const screen = '1920x1080';
  const timezone = 'America/New_York';
  const language = 'en-US';
  
  const fingerprintData = `${userAgent}|${screen}|${timezone}|${language}`;
  const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
  
  return hash.substring(0, 16);
}

/**
 * Generate HMAC-SHA256 signature for key request
 * Mimics: CryptoJS.HmacSHA256(resource|number|timestamp|sequence|fingerprint, SECRET).toString()
 * 
 * @param {string} resource - Channel key (e.g., "premium51")
 * @param {string} keyNumber - Key segment number from URL
 * @param {number} timestamp - Unix timestamp
 * @param {number} sequence - Incrementing sequence number
 * @param {string} fingerprint - Browser fingerprint hash
 * @param {string} hmacSecret - Dynamic HMAC secret from page
 */
function generateKeySignature(resource, keyNumber, timestamp, sequence, fingerprint, hmacSecret) {
  const signData = `${resource}|${keyNumber}|${timestamp}|${sequence}|${fingerprint}`;
  const hmac = crypto.createHmac('sha256', hmacSecret);
  hmac.update(signData);
  return hmac.digest('hex');
}

/**
 * Get next sequence number for a channel
 */
function getNextSequence(channel) {
  const current = sequenceCounters.get(channel) || Math.floor(Math.random() * 1000);
  const next = current + 1;
  sequenceCounters.set(channel, next);
  return next;
}

/**
 * Extract HMAC secret from obfuscated JavaScript
 * The secret is stored as a base64 array that when joined and decoded gives a 64-char hex string
 * 
 * Pattern: const _XXXXXXXX = ["base64chunk1", "base64chunk2", ...];
 * The array is used with .join('') and passed to atob() to get the secret
 * 
 * @param {string} html - Player page HTML
 * @returns {string|null} - Decoded HMAC secret or null
 */
function extractHmacSecret(html) {
  // Look for base64 arrays that decode to 64-char hex strings (HMAC-SHA256 key)
  // Pattern: const _XXXXXXXX = ["base64", "base64", ...];
  // The secret array is typically 6 elements that decode to a 64-char hex string
  
  // Method 1: Find arrays with base64 strings that look like hex when decoded
  const arrayPattern = /const\s+_[a-f0-9]+\s*=\s*\[((?:"[A-Za-z0-9+/=]+"(?:\s*,\s*)?)+)\];/g;
  let match;
  
  while ((match = arrayPattern.exec(html)) !== null) {
    try {
      const arrayContent = match[1];
      // Extract individual base64 strings
      const parts = arrayContent.match(/"([A-Za-z0-9+/=]+)"/g);
      if (!parts || parts.length < 3 || parts.length > 10) continue;
      
      const cleanParts = parts.map(p => p.replace(/"/g, ''));
      const joined = cleanParts.join('');
      
      // Try to decode
      const decoded = Buffer.from(joined, 'base64').toString('utf8');
      
      // Check if it's a 64-char hex string (HMAC secret)
      if (/^[a-f0-9]{64}$/i.test(decoded)) {
        console.log(`[AuthV2] Found HMAC secret: ${decoded.substring(0, 20)}...`);
        return decoded;
      }
    } catch (e) {
      // Not valid base64, continue
    }
  }
  
  // Method 2: Look for the specific pattern with _b554c8cc or similar variable
  // that's assigned from atob(_XXXXXXXX.join(''))
  const secretAssignPattern = /const\s+(_[a-f0-9]+)\s*=\s*_[a-f0-9]+\((_[a-f0-9]+)\.join\(['"]['"]?\)\)/g;
  let secretMatch;
  
  while ((secretMatch = secretAssignPattern.exec(html)) !== null) {
    const arrayVarName = secretMatch[2];
    // Find the array definition
    const arrayDefPattern = new RegExp(`const\\s+${arrayVarName}\\s*=\\s*\\[((?:"[A-Za-z0-9+/=]+"(?:\\s*,\\s*)?)+)\\];`);
    const arrayDefMatch = html.match(arrayDefPattern);
    
    if (arrayDefMatch) {
      try {
        const parts = arrayDefMatch[1].match(/"([A-Za-z0-9+/=]+)"/g);
        if (parts) {
          const cleanParts = parts.map(p => p.replace(/"/g, ''));
          const decoded = Buffer.from(cleanParts.join(''), 'base64').toString('utf8');
          
          if (/^[a-f0-9]{64}$/i.test(decoded)) {
            console.log(`[AuthV2] Found HMAC secret via pattern 2: ${decoded.substring(0, 20)}...`);
            return decoded;
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }
  
  console.log(`[AuthV2] Could not extract HMAC secret from page`);
  return null;
}

/**
 * Extract auth data from player page (JWT token, channel key, HMAC secret, etc.)
 * The player page now uses obfuscated variable names and split base64 strings
 */
async function fetchAuthDataV2(channel) {
  console.log(`[AuthV2] Fetching auth data for channel ${channel}...`);
  
  return new Promise((resolve) => {
    const url = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${channel}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://daddyhd.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Extract HMAC secret first (this is critical!)
          const hmacSecret = extractHmacSecret(data);
          
          if (!hmacSecret) {
            console.log(`[AuthV2] WARNING: Could not extract HMAC secret - signatures will fail!`);
          }
          
          // Method 1: Find JWT token directly (most reliable)
          // JWT format: eyJ...header.payload.signature
          const jwtMatch = data.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
          
          if (jwtMatch) {
            const token = jwtMatch[0];
            
            // Decode JWT payload to get channel info
            try {
              const payloadB64 = token.split('.')[1];
              // Handle URL-safe base64
              const payloadB64Fixed = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(Buffer.from(payloadB64Fixed, 'base64').toString('utf8'));
              
              console.log(`[AuthV2] JWT payload:`, payload);
              console.log(`[AuthV2] HMAC secret: ${hmacSecret ? hmacSecret.substring(0, 20) + '...' : 'NOT FOUND'}`);
              
              resolve({
                token,
                hmacSecret,
                channelKey: payload.sub || `premium${channel}`,
                country: payload.country || 'US',
                timestamp: String(payload.iat || Math.floor(Date.now() / 1000)),
                expiry: String(payload.exp || Math.floor(Date.now() / 1000) + 18000),
                format: 'jwt-direct'
              });
              return;
            } catch (e) {
              console.log(`[AuthV2] JWT decode failed, using token as-is: ${e.message}`);
              resolve({
                token,
                hmacSecret,
                channelKey: `premium${channel}`,
                country: 'US',
                timestamp: String(Math.floor(Date.now() / 1000)),
                format: 'jwt-raw'
              });
              return;
            }
          }
          
          // Method 2: Try the obfuscated base64 array format for token
          const tokenPartsMatch = data.match(/const\s+_[a-f0-9]+a\s*=\s*\[([\s\S]*?)\];/);
          
          if (tokenPartsMatch) {
            const partsStr = tokenPartsMatch[1];
            const parts = partsStr.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
            
            if (parts.length > 0) {
              const encodedToken = parts.join('');
              const token = Buffer.from(encodedToken, 'base64').toString('utf8');
              
              console.log(`[AuthV2] Decoded obfuscated token: ${token.substring(0, 50)}...`);
              
              resolve({
                token,
                hmacSecret,
                channelKey: `premium${channel}`,
                country: 'US',
                timestamp: String(Math.floor(Date.now() / 1000)),
                format: 'v2-obfuscated'
              });
              return;
            }
          }
          
          // Method 3: Fallback to old AUTH_TOKEN format
          const tokenMatch = data.match(/AUTH_TOKEN\s*=\s*["']([^"']+)["']/);
          if (tokenMatch) {
            const countryMatch = data.match(/AUTH_COUNTRY\s*=\s*["']([^"']+)["']/);
            const tsMatch = data.match(/AUTH_TS\s*=\s*["']([^"']+)["']/);
            
            resolve({
              token: tokenMatch[1],
              hmacSecret,
              channelKey: `premium${channel}`,
              country: countryMatch ? countryMatch[1] : 'US',
              timestamp: tsMatch ? tsMatch[1] : String(Math.floor(Date.now() / 1000)),
              format: 'v1-legacy'
            });
            return;
          }
          
          console.log(`[AuthV2] No token found in page`);
          resolve(null);
          
        } catch (err) {
          console.error(`[AuthV2] Parse error: ${err.message}`);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.error(`[AuthV2] Fetch error: ${e.message}`);
      resolve(null);
    });
  });
}

/**
 * Fetch DLHD key with new v2 authentication headers
 * 
 * @param {string} keyUrl - Full key URL (e.g., https://chevy.kiko2.ru/key/premium51/5886102)
 * @param {object} authData - Auth data from fetchAuthDataV2 (includes hmacSecret)
 * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
 */
async function fetchKeyWithAuthV2(keyUrl, authData) {
  // Extract channel and key number from URL
  const keyMatch = keyUrl.match(/\/key\/(premium\d+)\/(\d+)/);
  if (!keyMatch) {
    return { success: false, error: 'Invalid key URL format' };
  }
  
  const resource = keyMatch[1]; // e.g., "premium51"
  const keyNumber = keyMatch[2]; // e.g., "5886102"
  const channel = resource.replace('premium', '');
  
  // Check if we have HMAC secret
  if (!authData.hmacSecret) {
    return { success: false, error: 'No HMAC secret available - cannot sign request' };
  }
  
  // Generate auth headers
  const timestamp = Math.floor(Date.now() / 1000);
  const sequence = getNextSequence(channel);
  const fingerprint = generateFingerprint();
  const signature = generateKeySignature(resource, keyNumber, timestamp, sequence, fingerprint, authData.hmacSecret);
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  console.log(`[KeyV2] Fetching key for ${resource}/${keyNumber}`);
  console.log(`[KeyV2] Timestamp: ${timestamp}, Sequence: ${sequence}`);
  console.log(`[KeyV2] Fingerprint: ${fingerprint}`);
  console.log(`[KeyV2] Signature: ${signature.substring(0, 32)}...`);
  console.log(`[KeyV2] HMAC Secret: ${authData.hmacSecret.substring(0, 16)}...`);
  
  return new Promise((resolve) => {
    const url = new URL(keyUrl);
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': '*/*',
        'Origin': 'https://epicplayplay.cfd',
        'Referer': 'https://epicplayplay.cfd/',
        'Authorization': `Bearer ${authData.token}`,
        'X-Key-Timestamp': timestamp.toString(),
        'X-Key-Sequence': sequence.toString(),
        'X-Key-Signature': signature,
        'X-Key-Fingerprint': fingerprint,
      },
      timeout: 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        const text = data.toString('utf8');
        
        console.log(`[KeyV2] Response: ${res.statusCode}, ${data.length} bytes`);
        
        // Check for errors
        if (text.includes('"E2"') || text.includes('Session must be created')) {
          resolve({ success: false, error: 'E2: Session not established', code: 'E2' });
          return;
        }
        if (text.includes('"E3"') || text.includes('Token expired')) {
          resolve({ success: false, error: 'E3: Token expired', code: 'E3' });
          return;
        }
        if (text.includes('"E4"') || text.includes('Invalid signature')) {
          resolve({ success: false, error: 'E4: Invalid signature', code: 'E4' });
          return;
        }
        if (text.includes('"E5"') || text.includes('Invalid fingerprint')) {
          resolve({ success: false, error: 'E5: Invalid fingerprint', code: 'E5' });
          return;
        }
        
        // Valid key is exactly 16 bytes (AES-128)
        if (data.length === 16 && !text.startsWith('{') && !text.startsWith('[')) {
          console.log(`[KeyV2] ✅ Valid key: ${data.toString('hex')}`);
          resolve({ success: true, data });
          return;
        }
        
        // Unexpected response
        console.log(`[KeyV2] Unexpected response: ${text.substring(0, 100)}`);
        resolve({ success: false, error: `Unexpected response: ${data.length} bytes`, response: text });
      });
    });
    
    req.on('error', (err) => {
      console.error(`[KeyV2] Request error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

/**
 * Full key fetch flow with v2 authentication
 * 1. Fetch auth data from player page
 * 2. Establish heartbeat session (if needed)
 * 3. Fetch key with signed headers
 */
async function fetchDLHDKeyV2(keyUrl) {
  // Extract channel from URL
  const channelMatch = keyUrl.match(/premium(\d+)/);
  if (!channelMatch) {
    return { success: false, error: 'Could not extract channel from URL' };
  }
  const channel = channelMatch[1];
  
  // Step 1: Get auth data
  const authData = await fetchAuthDataV2(channel);
  if (!authData) {
    return { success: false, error: 'Failed to get auth data' };
  }
  
  console.log(`[DLHD-V2] Auth format: ${authData.format}`);
  
  // Step 2: Fetch key with v2 headers
  const result = await fetchKeyWithAuthV2(keyUrl, authData);
  
  // If E2 error, try establishing heartbeat first
  if (result.code === 'E2') {
    console.log(`[DLHD-V2] E2 error - trying heartbeat first...`);
    
    // Call heartbeat
    const hbResult = await callHeartbeatV2(channel, authData);
    if (hbResult.success) {
      // Retry key fetch
      console.log(`[DLHD-V2] Heartbeat OK, retrying key fetch...`);
      return await fetchKeyWithAuthV2(keyUrl, authData);
    }
  }
  
  return result;
}

/**
 * Call heartbeat endpoint with v2 authentication
 */
async function callHeartbeatV2(channel, authData) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const channelKey = `premium${channel}`;
  
  // Generate CLIENT_TOKEN (same as before)
  const screen = '1920x1080';
  const tz = 'America/New_York';
  const lang = 'en-US';
  const fingerprint = `${userAgent}|${screen}|${tz}|${lang}`;
  const signData = `${channelKey}|${authData.country}|${authData.timestamp}|${userAgent}|${fingerprint}`;
  const clientToken = Buffer.from(signData).toString('base64');
  
  console.log(`[HeartbeatV2] Calling heartbeat for channel ${channel}...`);
  
  return new Promise((resolve) => {
    const req = https.get('https://chevy.kiko2.ru/heartbeat', {
      headers: {
        'User-Agent': userAgent,
        'Accept': '*/*',
        'Origin': 'https://epicplayplay.cfd',
        'Referer': 'https://epicplayplay.cfd/',
        'Authorization': `Bearer ${authData.token}`,
        'X-Channel-Key': channelKey,
        'X-Client-Token': clientToken,
        'X-User-Agent': userAgent,
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[HeartbeatV2] Response: ${res.statusCode} - ${data.substring(0, 100)}`);
        
        if (res.statusCode === 200 && (data.includes('"ok"') || data.includes('"status":"ok"'))) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: data });
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`[HeartbeatV2] Error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

module.exports = {
  fetchAuthDataV2,
  fetchKeyWithAuthV2,
  fetchDLHDKeyV2,
  callHeartbeatV2,
  generateFingerprint,
  generateKeySignature,
  getNextSequence,
  extractHmacSecret,
};
