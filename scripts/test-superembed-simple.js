/**
 * Simple test for Superembed extractor
 */

async function testSuperembed() {
  try {
    // Import the extractor
    const { extractSuperembed } = await import('../app/lib/services/superembed-extractor.ts');
    
    console.log('Testing Superembed extractor...\n');
    
    // Test with Fight Club
    const result = await extractSuperembed({
      tmdbId: '550',
      type: 'movie'
    });
    
    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SUCCESS!');
      console.log('URL:', result.url);
      console.log('Provider:', result.provider);
    } else {
      console.log('\n❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSuperembed();
