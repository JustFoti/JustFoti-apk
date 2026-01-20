/**
 * Test RPI proxy directly
 */

const RPI_URL = 'https://rpi-proxy.vynx.cc';
const RPI_KEY = '5f1845926d725bb2a8230a6ed231fce1d03f07782f74a3f683c30ec04d4ac560';

async function testEndpoint(endpoint, params) {
  const url = new URL(endpoint, RPI_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  
  console.log(`\nTesting: ${url.toString().substring(0, 150)}...`);
  
  try {
    const response = await fetch(url.toString());
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`Response length: ${text.length} bytes`);
    console.log(`Preview: ${text.substring(0, 200)}`);
    
    return response.ok;
  } catch (error) {
    console.log(`Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing RPI Proxy endpoints...\n');
  console.log(`RPI URL: ${RPI_URL}`);
  console.log(`RPI KEY: ${RPI_KEY.substring(0, 20)}...`);
  
  // Test health
  console.log('\n' + '='.repeat(80));
  console.log('Testing /health');
  console.log('='.repeat(80));
  await testEndpoint('/health', {});
  
  // Test /proxy
  console.log('\n' + '='.repeat(80));
  console.log('Testing /proxy');
  console.log('='.repeat(80));
  await testEndpoint('/proxy', {
    key: RPI_KEY,
    url: 'https://zekonew.dvalna.ru/zeko/premium51/mono.css'
  });
  
  // Test /dlhd-key
  console.log('\n' + '='.repeat(80));
  console.log('Testing /dlhd-key');
  console.log('='.repeat(80));
  await testEndpoint('/dlhd-key', {
    key: RPI_KEY,
    url: 'https://chevy.dvalna.ru/key/premium51/5895596'
  });
}

main().catch(console.error);
