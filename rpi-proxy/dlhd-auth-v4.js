/**
 * DLHD Authentication v4 - January 2026
 * 
 * Uses the actual WASM PoW module from DLHD for nonce computation.
 * The WASM is downloaded and cached locally.
 * 
 * Required headers for key requests:
 * - Authorization: Bearer <jwt_token>
 * - X-Key-Timestamp: <unix_timestamp>
 * - X-Key-Nonce: <pow_nonce>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// WASM module state
let wasmModule = null;
let wasmExports = null;
let cachedUint8ArrayMemory0 = null;
let WASM_VECTOR_LEN = 0;

const WASM_URL = 'https://333418.fun/pow/pow_wasm_bg.wasm';
const WASM_CACHE_PATH = path.join(__dirname, 'pow_wasm_bg.wasm');

// SECURITY: Pin known-good WASM hash to prevent supply chain attacks
// Update this hash when DLHD updates their WASM module
const EXPECTED_WASM_HASHES = [
  // Add known-good hashes here - first run will log the hash
  // Format: SHA-256 hex digest
];

/**
 * Download WASM binary if not cached
 */
async function downloadWASM() {
  return new Promise((resolve, reject) => {
    console.log('[WASM] Downloading from', WASM_URL);
    https.get(WASM_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`WASM download failed: ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // SECURITY: Verify WASM integrity
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        console.log(`[WASM] Downloaded hash: ${hash}`);
        
        if (EXPECTED_WASM_HASHES.length > 0 && !EXPECTED_WASM_HASHES.includes(hash)) {
          console.error(`[WASM] ⚠️ INTEGRITY CHECK FAILED! Hash ${hash} not in allowed list`);
          console.error('[WASM] This could indicate a supply chain attack or DLHD update');
          // Continue anyway but log warning - in production you might want to reject
        }
        
        fs.writeFileSync(WASM_CACHE_PATH, buffer);
        console.log(`[WASM] Downloaded and cached: ${buffer.length} bytes`);
        resolve(buffer);
      });
    }).on('error', reject).on('timeout', () => reject(new Error('WASM download timeout')));
  });
}

/**
 * Initialize WASM module
 */
async function initWASM() {
  if (wasmExports) return true;
  
  try {
    let wasmBuffer;
    
    // Try to load from cache first
    if (fs.existsSync(WASM_CACHE_PATH)) {
      console.log('[WASM] Loading from cache');
      wasmBuffer = fs.readFileSync(WASM_CACHE_PATH);
    } else {
      wasmBuffer = await downloadWASM();
    }
    
    const imports = { './pow_wasm_bg.js': {} };
    const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
    wasmExports = instance.exports;
    console.log('[WASM] Module initialized');
    return true;
  } catch (e) {
    console.error('[WASM] Init failed:', e.message);
    return false;
  }
}

function getUint8ArrayMemory0() {
  if (!cachedUint8ArrayMemory0 || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasmExports.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getDataViewMemory0() {
  return new DataView(wasmExports.memory.buffer);
}

const cachedTextEncoder = new TextEncoder();
const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

function passStringToWasm0(arg, malloc) {
  const buf = cachedTextEncoder.encode(arg);
  const ptr = malloc(buf.length, 1) >>> 0;
  getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
  WASM_VECTOR_LEN = buf.length;
  return ptr;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

/**
 * Compute PoW nonce using WASM
 */
async function computePoWNonceV4(resource, keyNumber, timestamp) {
  if (!await initWASM()) {
    throw new Error('WASM not initialized');
  }
  
  // Reset memory cache after potential reallocation
  cachedUint8ArrayMemory0 = null;
  
  const ptr0 = passStringToWasm0(resource, wasmExports.__wbindgen_export);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm0(keyNumber, wasmExports.__wbindgen_export);
  const len1 = WASM_VECTOR_LEN;
  
  const nonce = wasmExports.compute_nonce(ptr0, len0, ptr1, len1, BigInt(timestamp));
  return Number(nonce);
}

/**
 * Get WASM version
 */
async function getWASMVersion() {
  if (!await initWASM()) return 'unknown';
  
  cachedUint8ArrayMemory0 = null;
  const retptr = wasmExports.__wbindgen_add_to_stack_pointer(-16);
  wasmExports.get_version(retptr);
  const r0 = getDataViewMemory0().getInt32(retptr + 0, true);
  const r1 = getDataViewMemory0().getInt32(retptr + 4, true);
  const version = getStringFromWasm0(r0, r1);
  wasmExports.__wbindgen_add_to_stack_pointer(16);
  wasmExports.__wbindgen_export3(r0, r1, 1);
  return version;
}

/**
 * Fetch JWT from hitsplay.fun
 */
async function fetchAuthDataV4(channel) {
  // Input validation: channel must be numeric to prevent SSRF
  if (!/^\d+$/.test(channel)) {
    console.log(`[AuthV4] Invalid channel ID: ${channel}`);
    return null;
  }
  
  console.log(`[AuthV4] Fetching auth for channel ${channel}...`);
  
  return new Promise((resolve) => {
    const url = `https://hitsplay.fun/premiumtv/daddyhd.php?id=${channel}`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://dlhd.link/',
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const jwtMatch = data.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        if (jwtMatch) {
          const token = jwtMatch[0];
          try {
            const payloadB64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
            // SECURITY: Don't log full JWT payload - may contain sensitive data
            console.log(`[AuthV4] JWT obtained for channel ${channel}, sub: ${payload.sub || 'unknown'}`);
            resolve({
              token,
              channelKey: payload.sub || `premium${channel}`,
              country: payload.country || 'US',
              exp: payload.exp,
              source: 'hitsplay.fun',
            });
          } catch (e) {
            resolve({ token, channelKey: `premium${channel}`, source: 'hitsplay.fun' });
          }
        } else {
          console.log(`[AuthV4] No JWT found`);
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.log(`[AuthV4] Error: ${e.message}`);
      resolve(null);
    }).on('timeout', () => resolve(null));
  });
}

/**
 * Fetch key with v4 authentication
 */
async function fetchKeyWithAuthV4(keyUrl, authData) {
  const keyMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyMatch) {
    return { success: false, error: 'Invalid key URL format' };
  }
  
  const resource = keyMatch[1];
  const keyNumber = keyMatch[2];
  const timestamp = Math.floor(Date.now() / 1000);
  
  let nonce;
  try {
    nonce = await computePoWNonceV4(resource, keyNumber, timestamp);
  } catch (e) {
    return { success: false, error: `PoW computation failed: ${e.message}` };
  }
  
  console.log(`[KeyV4] ${resource}/${keyNumber} ts=${timestamp} nonce=${nonce}`);
  
  return new Promise((resolve) => {
    const url = new URL(keyUrl);
    const origin = 'https://hitsplay.fun';
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Origin': origin,
        'Referer': `${origin}/`,
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
        
        console.log(`[KeyV4] Response: ${res.statusCode}, ${data.length} bytes`);
        
        if (data.length === 16 && !text.startsWith('{') && !text.startsWith('E')) {
          // SECURITY: Only log key hash, not actual key data
          const keyHash = require('crypto').createHash('md5').update(data).digest('hex').slice(0, 8);
          console.log(`[KeyV4] ✅ Valid key received (${data.length} bytes, hash: ${keyHash}...)`);
          return resolve({ success: true, data });
        }
        
        console.log(`[KeyV4] ❌ Invalid response: ${text.substring(0, 100)}`);
        resolve({ 
          success: false, 
          error: `Invalid response: ${res.statusCode}`,
          response: text.substring(0, 200),
          statusCode: res.statusCode,
        });
      });
    });
    
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.end();
  });
}

/**
 * Full key fetch flow
 */
async function fetchDLHDKeyV4(keyUrl) {
  const keyMatch = keyUrl.match(/\/key\/([^/]+)\/(\d+)/);
  if (!keyMatch) {
    return { success: false, error: 'Invalid key URL' };
  }
  
  const channelKey = keyMatch[1];
  const premiumMatch = channelKey.match(/^premium(\d+)$/);
  const channel = premiumMatch ? premiumMatch[1] : null;
  
  console.log(`[DLHD-V4] Key: ${channelKey}, channel: ${channel || 'named'}`);
  
  // Get auth data
  let authData = null;
  if (channel) {
    authData = await fetchAuthDataV4(channel);
  } else {
    // Named channel mapping
    const namedMap = {
      'skysportsnews_uk': '576', 'skysportsf1_uk': '60', 'skysportscricket_uk': '65',
      'skysportsgolf_uk': '70', 'skysportsfootball_uk': '35', 'skysportsarena_uk': '36',
      'skysportsaction_uk': '37', 'skysportsmainevent_uk': '38', 'skysportstennis_uk': '46',
    };
    const mapped = namedMap[channelKey.toLowerCase()];
    if (mapped) authData = await fetchAuthDataV4(mapped);
  }
  
  if (!authData) {
    return { success: false, error: `No auth for ${channelKey}` };
  }
  
  return await fetchKeyWithAuthV4(keyUrl, authData);
}

// Pre-initialize WASM on module load
initWASM().then(ok => {
  if (ok) getWASMVersion().then(v => console.log(`[WASM] Version: ${v}`));
});

module.exports = {
  fetchDLHDKeyV4,
  fetchAuthDataV4,
  fetchKeyWithAuthV4,
  computePoWNonceV4,
  initWASM,
  getWASMVersion,
};
