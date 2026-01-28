/**
 * Test CF Worker's WASM PoW vs RPI's WASM PoW
 */
const fs = require('fs');
const path = require('path');

// Load the WASM module (same one used by CF worker)
const wasmPath = path.join(__dirname, '../cloudflare-proxy/src/pow_wasm_bg.wasm');
const wasmBuffer = fs.readFileSync(wasmPath);

let wasmInstance = null;
let wasmMemory = null;
let WASM_VECTOR_LEN = 0;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

function getUint8Array() {
  return new Uint8Array(wasmMemory.buffer);
}

function getDataView() {
  return new DataView(wasmMemory.buffer);
}

function passStringToWasm(arg, malloc) {
  const buf = textEncoder.encode(arg);
  const ptr = malloc(buf.length, 1) >>> 0;
  getUint8Array().subarray(ptr, ptr + buf.length).set(buf);
  WASM_VECTOR_LEN = buf.length;
  return ptr;
}

function getStringFromWasm(ptr, len) {
  return textDecoder.decode(getUint8Array().subarray(ptr, ptr + len));
}

async function initWasm() {
  const imports = { './pow_wasm_bg.js': {} };
  const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
  wasmInstance = instance;
  wasmMemory = instance.exports.memory;
  console.log('[WASM] Initialized');
}

function computeNonce(resource, keyNumber, timestamp) {
  const exports = wasmInstance.exports;
  
  const ptr0 = passStringToWasm(resource, exports.__wbindgen_export);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm(keyNumber, exports.__wbindgen_export);
  const len1 = WASM_VECTOR_LEN;
  
  const nonce = exports.compute_nonce(ptr0, len0, ptr1, len1, BigInt(timestamp));
  return Number(nonce);
}

function getVersion() {
  const exports = wasmInstance.exports;
  
  const retptr = exports.__wbindgen_add_to_stack_pointer(-16);
  exports.get_version(retptr);
  const r0 = getDataView().getInt32(retptr + 0, true);
  const r1 = getDataView().getInt32(retptr + 4, true);
  const version = getStringFromWasm(r0, r1);
  exports.__wbindgen_add_to_stack_pointer(16);
  exports.__wbindgen_export3(r0, r1, 1);
  return version;
}

async function main() {
  console.log('Testing CF Worker WASM PoW');
  console.log('==========================\n');
  
  await initWasm();
  console.log('WASM Version:', getVersion());
  
  // Test with same params as before
  const resource = 'premium35';
  const keyNumber = '5898595';
  const timestamp = Math.floor(Date.now() / 1000);
  
  console.log('\nTest params:');
  console.log('  Resource:', resource);
  console.log('  Key Number:', keyNumber);
  console.log('  Timestamp:', timestamp);
  
  const nonce = computeNonce(resource, keyNumber, timestamp);
  console.log('  Computed Nonce:', nonce);
  
  // Now test key fetch with this nonce
  console.log('\nTesting key fetch...');
  
  const keyUrl = `https://chevy.dvalna.ru/key/${resource}/${keyNumber}`;
  
  // First get JWT
  const hitsplayRes = await fetch(`https://hitsplay.fun/premiumtv/daddyhd.php?id=35`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://dlhd.link/'
    }
  });
  const html = await hitsplayRes.text();
  const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  
  if (!jwtMatch) {
    console.log('FAILED: No JWT found');
    return;
  }
  
  const jwt = jwtMatch[0];
  console.log('JWT obtained');
  
  // Fetch key
  const keyRes = await fetch(keyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://dlhd.link',
      'Referer': 'https://dlhd.link/',
      'Authorization': `Bearer ${jwt}`,
      'X-Key-Timestamp': timestamp.toString(),
      'X-Key-Nonce': nonce.toString()
    }
  });
  
  console.log('Key response status:', keyRes.status);
  
  const keyData = await keyRes.arrayBuffer();
  console.log('Key response size:', keyData.byteLength);
  
  if (keyData.byteLength === 16) {
    console.log('KEY SUCCESS:', Buffer.from(keyData).toString('hex'));
  } else {
    const text = new TextDecoder().decode(keyData);
    console.log('Response:', text);
  }
}

main().catch(console.error);
