// Quick test of cloudstream extraction
const { extractCloudStream } = require('./app/lib/services/cloudstream-pure-fetch.ts');

async function test() {
  console.log('Testing CloudStream extraction...\n');
  
  const result = await extractCloudStream('1054867', 'movie');
  
  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.logs) {
    console.log('\n=== LOGS ===');
    result.logs.forEach(log => console.log(log));
  }
}

test().catch(console.error);
