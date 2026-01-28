const RPI_URL = 'https://rpi-proxy.vynx.cc';
const KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

async function test() {
  // Test health first
  console.log('1. Testing RPI health...');
  try {
    const h = await fetch(`${RPI_URL}/health`, { signal: AbortSignal.timeout(5000) });
    console.log('   Health:', await h.text());
  } catch (e) {
    console.log('   Health error:', e.message);
  }

  // Test JWT fetch for channel 425 via hitsplay
  console.log('\n2. Testing JWT fetch for 425 via hitsplay...');
  const hitsplayUrl = `https://hitsplay.fun/premiumtv/daddyhd.php?id=425`;
  const rpiUrl = `${RPI_URL}/animekai?url=${encodeURIComponent(hitsplayUrl)}&key=${KEY}`;
  
  try {
    const res = await fetch(rpiUrl, { signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    console.log('   Response length:', html.length);
    
    const jwt = html.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (jwt) {
      console.log('   JWT found!');
      const payload = JSON.parse(Buffer.from(jwt[0].split('.')[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
      console.log('   Channel key:', payload.sub);
    } else {
      console.log('   No JWT found');
      console.log('   Preview:', html.substring(0, 200));
    }
  } catch (e) {
    console.log('   Error:', e.message);
  }
}

test();
