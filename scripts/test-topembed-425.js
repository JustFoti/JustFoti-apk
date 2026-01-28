// Test if the topembed channel name exists
const channelNames = [
  'beINSPORTSUSA[USA]',
  'BeinSports[USA]',
  'beinsportsusa',
  'BeinSportsUSA[USA]',
  'beINSportsUSA[USA]',
];

async function test() {
  for (const name of channelNames) {
    const url = `https://topembed.pw/channel/${name}`;
    console.log(`Testing: ${url}`);
    
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://dlhd.link/',
        },
        signal: AbortSignal.timeout(5000),
      });
      
      const text = await res.text();
      const hasJWT = text.includes('eyJ');
      console.log(`  Status: ${res.status}, Length: ${text.length}, Has JWT: ${hasJWT}`);
      
      if (hasJWT) {
        const jwtMatch = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
        if (jwtMatch) {
          const payload = JSON.parse(Buffer.from(jwtMatch[0].split('.')[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString());
          console.log(`  JWT sub: ${payload.sub}`);
        }
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    console.log('');
  }
}

test();
