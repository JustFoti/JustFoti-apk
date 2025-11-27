/**
 * Simulate exactly what a browser would send (no custom Referer/Origin)
 */

async function test() {
  // Get key URL
  const m3u8Res = await fetch('https://zekonew.giokko.ru/zeko/premium769/mono.css');
  const m3u8 = await m3u8Res.text();
  const keyUrl = m3u8.match(/URI="([^"]+)"/)?.[1];
  
  console.log('=== Browser simulation (no Referer/Origin) ===\n');
  
  // M3U8 - browser style
  console.log('1. M3U8 (no headers):');
  const m3u8Test = await fetch('https://zekonew.giokko.ru/zeko/premium769/mono.css');
  console.log(`   Status: ${m3u8Test.status} ${m3u8Test.ok ? '✓' : '✗'}`);
  
  // Key - browser style (this is what HLS.js would do)
  console.log('\n2. Key (no headers):');
  const keyTest = await fetch(keyUrl);
  console.log(`   Status: ${keyTest.status} ${keyTest.ok ? '✓' : '✗'}`);
  if (keyTest.ok) {
    const buf = await keyTest.arrayBuffer();
    console.log(`   Length: ${buf.byteLength}`);
  }
  
  // Segment - browser style
  const segUrl = m3u8.match(/https:\/\/whalesignal\.ai\/[^\s]+/)?.[0];
  console.log('\n3. Segment (no headers):');
  const segTest = await fetch(segUrl);
  console.log(`   Status: ${segTest.status} ${segTest.ok ? '✓' : '✗'}`);
  if (segTest.ok) {
    const buf = await segTest.arrayBuffer();
    console.log(`   Length: ${buf.byteLength}`);
  }
  
  console.log('\n=== CONCLUSION ===');
  console.log(`M3U8: ${m3u8Test.ok ? 'Browser can fetch directly' : 'NEEDS PROXY'}`);
  console.log(`Key: ${keyTest.ok ? 'Browser can fetch directly' : 'NEEDS PROXY'}`);
  console.log(`Segments: ${segTest.ok ? 'Browser can fetch directly' : 'NEEDS PROXY'}`);
}

test().catch(console.error);
