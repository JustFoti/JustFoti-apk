/**
 * Test what the key server returns to CF Worker
 * The "fetchpoolctx" response suggests the key server might be detecting CF IPs
 */

async function test() {
  console.log('=== Analyzing Key Server Response ===\n');
  
  // The response we're getting from CF worker
  const errorResponse = `{
  "fetchpoolctx": true,
  "proxySetupImpl": 200,
  ...
}`;
  
  console.log('The CF worker is receiving this weird response:');
  console.log(errorResponse);
  console.log('\nThis looks like the key server is detecting Cloudflare IPs and returning');
  console.log('a special response instead of the actual key.\n');
  
  // Let's check what headers the key server expects
  console.log('Testing key server with different approaches...\n');
  
  const keyUrl = 'https://chevy.kiko2.ru/key/premium51/5887280';
  
  // Test 1: No auth (should get E3)
  console.log('1. No auth headers:');
  try {
    const res = await fetch(keyUrl);
    const data = await res.arrayBuffer();
    const text = new TextDecoder().decode(data);
    console.log('   Status:', res.status);
    console.log('   Size:', data.byteLength);
    console.log('   Response:', text.substring(0, 100));
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  // Test 2: With fake auth (should get E2 or E3)
  console.log('\n2. With fake auth headers:');
  try {
    const res = await fetch(keyUrl, {
      headers: {
        'Authorization': 'Bearer fake-token',
        'X-Channel-Key': 'premium51',
        'X-Client-Token': 'fake-client-token',
        'Origin': 'https://epicplayplay.cfd',
        'Referer': 'https://epicplayplay.cfd/',
      }
    });
    const data = await res.arrayBuffer();
    const text = new TextDecoder().decode(data);
    console.log('   Status:', res.status);
    console.log('   Size:', data.byteLength);
    console.log('   Response:', text.substring(0, 100));
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  // Test 3: Check if CF-Connecting-IP header affects response
  console.log('\n3. With CF-Connecting-IP header (simulating CF):');
  try {
    const res = await fetch(keyUrl, {
      headers: {
        'CF-Connecting-IP': '1.2.3.4',
        'CF-IPCountry': 'US',
      }
    });
    const data = await res.arrayBuffer();
    const text = new TextDecoder().decode(data);
    console.log('   Status:', res.status);
    console.log('   Size:', data.byteLength);
    console.log('   Response:', text.substring(0, 100));
  } catch (e) {
    console.log('   Error:', e.message);
  }
  
  console.log('\n\nConclusion:');
  console.log('The key server (chevy.kiko2.ru) appears to be detecting Cloudflare');
  console.log('datacenter IPs and returning a different response.');
  console.log('\nPossible solutions:');
  console.log('1. Use residential proxy (RPI or Oxylabs) for key fetches');
  console.log('2. Check if there are alternative key servers that work from CF');
  console.log('3. The key server might be behind Cloudflare itself and detecting');
  console.log('   requests from other CF workers');
}

test();
