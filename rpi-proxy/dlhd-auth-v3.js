/**
 * DLHD Authentication v3 - January 2026
 * 
 * Purpose: Implements the new Proof-of-Work (PoW) based key authentication
 * 
 * New security measures discovered:
 * 1. JWT session tokens (same as v2)
 * 2. Proof-of-Work nonce for key requests (NEW!)
 * 3. HMAC-based challenge-response
 * 
 * Required headers for key requests:
 * - Authorization: Bearer <jwt_token>
 * - X-Key-Timestamp: <unix_timestamp>
 * - X-Key-Nonce: <pow_nonce>
 * 
 * PoW Algorithm:
 *   hmac = HMAC-SHA256(resource, MASTER_SECRET)
 *   nonce = 0
 *   while nonce < 100000:
 *     hash = MD5(hmac + resource + keyNumber + timestamp + nonce)
 *     if parseInt(hash[0:4], 16) < 0x1000: break
 *     nonce++
 * 
 * Usage:
 *   const { fetchDLHDKeyV3 } = require('./dlhd-auth-v3');
 *   const result = await fetchDLHDKeyV3(keyUrl);
 */

const crypto = require('crypto');
const https = require('https');

// Master secret for HMAC - extracted from obfuscated player JS (January 2026)
const MASTER_SECRET = '7f9e2a8b3c5d1e4f6a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7';

// PoW threshold - hash prefix must be less than this value
const POW_THRESHOLD = 0x1000;
const POW_MAX_ITERATIONS = 100000;

/**
 * Compute Proof-of-Work nonce for key request
 * 
 * @param {string} resource - Channel key (e.g., "premium51")
 * @param {string} keyNumber - Key segment number from URL
 * @param {number} timestamp - Unix timestamp
 * @returns {number} - Valid nonce
 */
function computePoWNonce(resource, keyNumber, timestamp) {
  // Step 1: Compute HMAC of resource with master secret
  const hmac = crypto.createHmac('sha256', MASTER_SECRET)
    .update(resource)
    .digest('hex');
  
  // Step 2: Find nonce where MD5 hash prefix < threshold
  for (let nonce = 0; nonce < POW_MAX_ITERATIONS; nonce++) {
    const data = `${hmac}${resource}${keyNumber}${timestamp}${nonce}`;
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const prefix = parseInt(hash.substring(0, 4), 16);
    
    if (prefix < POW_THRESHOLD) {
      return nonce;
    }
  }
  
  // Fallback - should never reach here with proper threshold
  console.warn('[PoW] Max iterations reached, using last nonce');
  return POW_MAX_ITERATIONS - 1;
}

/**
 * Extract auth data from player page
 * 
 * @param {string} channel - Channel number
 * @returns {Promise<{token: string, channelKey: string, country: string, timestamp: string} | null>}
 */
async function fetchAuthData(channel) {
  console.log(`[AuthV3] Fetching auth data for channel ${channel}...`);
  
  return new Promise((resolve) => {
    const url = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${channel}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://daddyhd.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Find JWT token (eyJ...)
          const jwtMatch = data.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
          
          if (jwtMatch) {
            const token = jwtMatch[0];
            
            // Decode JWT payload
            try {
              const payloadB64 = token.split('.')[1];
              const payloadB64Fixed = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(Buffer.from(payloadB64Fixed, 'base64').toString('utf8'));
              
              console.log(`[AuthV3] JWT payload:`, payload);
              
              resolve({
                token,
                channelKey: payload.sub || `premium${channel}`,
                country: payload.country || 'US',
                timestamp: String(payload.iat || Math.floor(Date.now() / 1000)),
                expiry: payload.exp,
              });
              return;
            } catch (e) {
              console.log(`[AuthV3] JWT decode failed: ${e.message}`);
              resolve({
                token,
                channelKey: `premium${channel}`,
                country: 'US',
                timestamp: String(Math.floor(Date.now() / 1000)),
              });
              return;
            }
          }
          
          console.log(`[AuthV3] No JWT found in page`);
          resolve(null);
          
        } catch (err) {
          console.error(`[AuthV3] Parse error: ${err.message}`);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.error(`[AuthV3] Fetch error: ${e.message}`);
      resolve(null);
    });
  });
}

/**
 * Fetch key with v3 authentication (PoW nonce)
 * 
 * @param {string} keyUrl - Full key URL
 * @param {object} authData - Auth data from fetchAuthData
 * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
 */
async function fetchKeyWithAuth(keyUrl, authData) {
  // Extract resource and key number from URL
  const keyMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyMatch) {
    return { success: false, error: 'Invalid key URL format' };
  }
  
  const resource = keyMatch[1]; // e.g., "premium51"
  const keyNumber = keyMatch[2]; // e.g., "5893400"
  
  // Generate auth headers
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = computePoWNonce(resource, keyNumber, timestamp);
  
  console.log(`[KeyV3] Fetching key for ${resource}/${keyNumber}`);
  console.log(`[KeyV3] Timestamp: ${timestamp}, PoW Nonce: ${nonce}`);
  
  return new Promise((resolve) => {
    const url = new URL(keyUrl);
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Origin': 'https://epicplayplay.cfd',
        'Referer': 'https://epicplayplay.cfd/',
        'Authorization': `Bearer ${authData.token}`,
        'X-Key-Timestamp': timestamp.toString(),
        'X-Key-Nonce': nonce.toString(),
      },
      timeout: 15000,
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        const text = data.toString('utf8');
        
        console.log(`[KeyV3] Response: ${res.statusCode}, ${data.length} bytes`);
        
        // Check for error responses
        if (text.includes('"error"') || text.startsWith('{')) {
          try {
            const errJson = JSON.parse(text);
            console.log(`[KeyV3] Error response:`, errJson);
            return resolve({ 
              success: false, 
              error: errJson.error || errJson.message || text,
              code: errJson.code,
            });
          } catch {}
        }
        
        // Valid key is exactly 16 bytes (AES-128)
        if (data.length === 16 && !text.startsWith('{') && !text.startsWith('[')) {
          console.log(`[KeyV3] ✅ Valid key: ${data.toString('hex')}`);
          return resolve({ success: true, data });
        }
        
        // Unexpected response
        console.log(`[KeyV3] Unexpected response: ${text.substring(0, 100)}`);
        resolve({ 
          success: false, 
          error: `Unexpected response: ${data.length} bytes`,
          response: text.substring(0, 200),
        });
      });
    });
    
    req.on('error', (err) => {
      console.error(`[KeyV3] Request error: ${err.message}`);
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
 * Call heartbeat to establish session
 * 
 * @param {object} authData - Auth data from fetchAuthData
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function callHeartbeat(authData) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  // Generate CLIENT_TOKEN
  const screen = '1920x1080';
  const tz = 'America/New_York';
  const lang = 'en-US';
  const fingerprint = `${userAgent}|${screen}|${tz}|${lang}`;
  const signData = `${authData.channelKey}|${authData.country}|${authData.timestamp}|${userAgent}|${fingerprint}`;
  const clientToken = Buffer.from(signData).toString('base64');
  
  console.log(`[HeartbeatV3] Calling heartbeat...`);
  
  return new Promise((resolve) => {
    const req = https.get('https://chevy.dvalna.ru/heartbeat', {
      headers: {
        'User-Agent': userAgent,
        'Accept': '*/*',
        'Origin': 'https://epicplayplay.cfd',
        'Referer': 'https://epicplayplay.cfd/',
        'Authorization': `Bearer ${authData.token}`,
        'X-Channel-Key': authData.channelKey,
        'X-Client-Token': clientToken,
        'X-User-Agent': userAgent,
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[HeartbeatV3] Response: ${res.statusCode} - ${data.substring(0, 100)}`);
        
        if (res.statusCode === 200 && (data.includes('"ok"') || data.includes('session'))) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: data });
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`[HeartbeatV3] Error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

/**
 * Full key fetch flow with v3 authentication
 * 
 * @param {string} keyUrl - Full key URL
 * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
 */
async function fetchDLHDKeyV3(keyUrl) {
  // Extract channel from URL
  const channelMatch = keyUrl.match(/premium(\d+)/);
  if (!channelMatch) {
    return { success: false, error: 'Could not extract channel from URL' };
  }
  const channel = channelMatch[1];
  
  // Step 1: Get auth data
  const authData = await fetchAuthData(channel);
  if (!authData) {
    return { success: false, error: 'Failed to get auth data' };
  }
  
  // Step 2: Establish heartbeat session
  const hbResult = await callHeartbeat(authData);
  if (!hbResult.success) {
    console.log(`[DLHD-V3] Heartbeat failed: ${hbResult.error}, continuing anyway...`);
  }
  
  // Step 3: Fetch key with PoW nonce
  return await fetchKeyWithAuth(keyUrl, authData);
}

module.exports = {
  fetchDLHDKeyV3,
  fetchAuthData,
  fetchKeyWithAuth,
  callHeartbeat,
  computePoWNonce,
  MASTER_SECRET,
  POW_THRESHOLD,
};
