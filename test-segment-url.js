/**
 * Test if the obfuscated segment URLs actually work
 */

async function testSegment() {
  // Take one of the segment URLs from ABC USA
  const segmentUrl = 'https://chevy.dvalna.ru/UUFESEADFh5aUQoXBl5KAVgXXFhHRRoCDQwYBRAWU1dRWFVWR0oWAAoHUgBUAQBSDlwOCwMHAFJaURhVUFQABQ4FAQwGCggDCQ1XAFUPFhRaEAwMXENOEgwOVkoOEQ1RQQgGAQVdCgYABUJQEQoPWwEHXQ8GBRIJD1xSUVBWAlcBDFUAVwoOUlgMXFoHAltUVAZcWwMHUQVVAFVWBloEVQ5QUQkHXQEEDg0BXQMHDlsHXQhYAQZRUFUDEQ';
  
  console.log('Testing segment URL:');
  console.log(segmentUrl);
  console.log('');
  
  try {
    const response = await fetch(segmentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://epicplayplay.cfd',
        'Referer': 'https://epicplayplay.cfd/',
      },
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')}`);
    
    const buffer = await response.arrayBuffer();
    console.log(`Actual size: ${buffer.byteLength} bytes`);
    
    // Check if it's a TS segment (starts with 0x47 sync byte)
    const bytes = new Uint8Array(buffer);
    console.log(`First 16 bytes: ${Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    if (bytes[0] === 0x47) {
      console.log('✅ Valid MPEG-TS segment (starts with 0x47 sync byte)');
    } else {
      console.log('❌ Not a valid MPEG-TS segment');
      
      // Try to decode as text
      const text = new TextDecoder().decode(buffer.slice(0, 200));
      console.log(`Text preview: ${text}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testSegment().catch(console.error);
