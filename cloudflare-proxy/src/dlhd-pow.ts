/**
 * DLHD PoW WASM Module for Cloudflare Workers
 * 
 * Loads the WASM binary and provides nonce computation for key requests.
 * The WASM is embedded at build time via wrangler.toml [wasm_modules].
 */

// WASM module will be imported via wrangler.toml binding
// @ts-ignore - WASM module binding
import wasmModule from './pow_wasm_bg.wasm';

let wasmInstance: WebAssembly.Instance | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');

let WASM_VECTOR_LEN = 0;

function getUint8Array(): Uint8Array {
  return new Uint8Array(wasmMemory!.buffer);
}

function getDataView(): DataView {
  return new DataView(wasmMemory!.buffer);
}

function passStringToWasm(arg: string, malloc: (len: number, align: number) => number): number {
  const buf = textEncoder.encode(arg);
  const ptr = malloc(buf.length, 1) >>> 0;
  getUint8Array().subarray(ptr, ptr + buf.length).set(buf);
  WASM_VECTOR_LEN = buf.length;
  return ptr;
}

function getStringFromWasm(ptr: number, len: number): string {
  return textDecoder.decode(getUint8Array().subarray(ptr, ptr + len));
}

/**
 * Initialize the WASM module
 */
export async function initDLHDPoW(): Promise<boolean> {
  if (wasmInstance) return true;
  
  try {
    const imports = { './pow_wasm_bg.js': {} };
    const instance = await WebAssembly.instantiate(wasmModule, imports);
    wasmInstance = instance;
    wasmMemory = instance.exports.memory as WebAssembly.Memory;
    console.log('[POW-WASM] Initialized');
    return true;
  } catch (e) {
    console.error('[POW-WASM] Init failed:', e);
    return false;
  }
}

/**
 * Compute PoW nonce for key request
 */
export function computeNonce(resource: string, keyNumber: string, timestamp: number): bigint {
  if (!wasmInstance) {
    throw new Error('WASM not initialized - call initDLHDPoW() first');
  }
  
  const exports = wasmInstance.exports as any;
  
  const ptr0 = passStringToWasm(resource, exports.__wbindgen_export);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passStringToWasm(keyNumber, exports.__wbindgen_export);
  const len1 = WASM_VECTOR_LEN;
  
  const nonce = exports.compute_nonce(ptr0, len0, ptr1, len1, BigInt(timestamp));
  return nonce;
}

/**
 * Get WASM version string
 */
export function getVersion(): string {
  if (!wasmInstance) return 'not-initialized';
  
  const exports = wasmInstance.exports as any;
  
  const retptr = exports.__wbindgen_add_to_stack_pointer(-16);
  exports.get_version(retptr);
  const r0 = getDataView().getInt32(retptr + 0, true);
  const r1 = getDataView().getInt32(retptr + 4, true);
  const version = getStringFromWasm(r0, r1);
  exports.__wbindgen_add_to_stack_pointer(16);
  exports.__wbindgen_export3(r0, r1, 1);
  return version;
}

/**
 * Get secret key from WASM (for debugging)
 */
export function getSecretKey(): string {
  if (!wasmInstance) return 'not-initialized';
  
  const exports = wasmInstance.exports as any;
  
  const retptr = exports.__wbindgen_add_to_stack_pointer(-16);
  exports.get_secret_key(retptr);
  const r0 = getDataView().getInt32(retptr + 0, true);
  const r1 = getDataView().getInt32(retptr + 4, true);
  const key = getStringFromWasm(r0, r1);
  exports.__wbindgen_add_to_stack_pointer(16);
  exports.__wbindgen_export3(r0, r1, 1);
  return key;
}
