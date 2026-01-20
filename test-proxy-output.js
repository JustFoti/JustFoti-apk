/**
 * Test what our proxy actually returns
 */

async function testProxy() {
  // Test through local API
  const apiUrl = 'http://localhost:3000/api/dlhd-proxy?channel=51';
  
  console.log('Testing proxy:', apiUrl);
  console.log('');
  
  try {
    const response = await fetch(apiUrl);
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log('');
    
    const content = await response.text();
    
    if (response.ok) {
      console.log('Proxied M3U8:');
      console.log('─'.repeat(80));
      console.log(content);
      console.log('─'.repeat(80));
      
      // Check if segments are proxied
      const lines = content.split('\n');
      const segmentLines = lines.filter(line => line.trim() && !line.startsWith('#'));
      
      console.log(`\nFound ${segmentLines.length} segment lines`);
      console.log('\nFirst 3 segments:');
      for (const line of segmentLines.slice(0, 3)) {
        console.log(`  ${line.substring(0, 100)}...`);
      }
      
      const proxied = segmentLines.filter(line => line.includes('/dlhd/segment?'));
      const notProxied = segmentLines.filter(line => !line.includes('/dlhd/segment?'));
      
      console.log(`\nProxied: ${proxied.length}`);
      console.log(`Not proxied: ${notProxied.length}`);
      
      if (notProxied.length > 0) {
        console.log('\nNot proxied segments:');
        for (const line of notProxied.slice(0, 3)) {
          console.log(`  ${line.substring(0, 100)}`);
        }
      }
      
    } else {
      console.log('Error response:');
      console.log(content);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testProxy().catch(console.error);
