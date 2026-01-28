const RPI_URL = 'https://rpi-proxy.vynx.cc';
const KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

async function test() {
  console.log('=== Testing Channel 425 Full Flow ===\n');
  
  // Step 1: Fetch JWT from topembed via RPI
  console.log('1. Fetching JWT from topembed.pw via RPI...');
  const topembedUrl = 'https://topembed.pw/channel/beINSPORTSUSA[USA]';
  const rpiUrl = `${RPI_URL}/animekai?url=${encodeURIComponent(topembedUrl)}&key=${KEY}&referer=${encodeURIComponent('https://dlhd.link/')}`;
  
  let jwt, channelKey, timestamp;
  
  try {
    const start = Date.now();
    const res = await fetch(rpiUrl, { signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    console.log(`   Response: ${res.status}, ${html.length} bytes (${Date.now() - start}ms)`);
    
    const jwtMatch = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (jwtMatch) {
      jwt = jwtMatch[0];
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
      channelKey = payload.sub;
      console.log(`   JWT found! Channel key: ${channelKey}`);
    } else {
      console.log('   No JWT found!');
      console.log('   Preview:', html.substring(0, 200));
      return;
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
    return;
  }
  
  // Step 2: Compute PoW nonce (simplified - just use a test value)
  console.log('\n2. Computing PoW nonce...');
  timestamp = Math.floor(Date.now() / 1000);
  const nonce = 12345; // Placeholder - real nonce computed by WASM
  console.log(`   Timestamp: ${timestamp}, Nonce: ${nonce} (placeholder)`);
  
  // Step 3: Fetch key via RPI /dlhd-key-v4
  console.log('\n3. Fetching key via RPI /dlhd-key-v4...');
  const keyUrl = `https://chevy.dvalna.ru/key/${channelKey}/12345`;
  const rpiKeyUrl = `${RPI_URL}/dlhd-key-v4?url=${encodeURIComponent(keyUrl)}&key=${KEY}&jwt=${jwt}&timestamp=${timestamp}&nonce=${nonce}`;
  
  try {
    const start = Date.now();
    const res = await fetch(rpiKeyUrl, { signal: AbortSignal.timeout(15000) });
    const elapsed = Date.now() - start;
    
    console.log(`   Response: ${res.status} (${elapsed}ms)`);
    
    if (res.ok) {
      const data = await res.arrayBuffer();
      console.log(`   Data size: ${data.byteLength} bytes`);
      if (data.byteLength === 16) {
        console.log(`   ✅ Valid 16-byte key!`);
        console.log(`   Key hex: ${Buffer.from(data).toString('hex')}`);
      } else {
        const text = new TextDecoder().decode(data);
        console.log(`   Response: ${text.substring(0, 200)}`);
      }
    } else {
      const text = await res.text();
      console.log(`   Error: ${text.substring(0, 300)}`);
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
  }
}

test();
