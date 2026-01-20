/**
 * Test the M3U8 rewriting logic with multi-line URLs
 */

const sampleM3U8 = `#EXTM3U
# Powered by V.CDN 1.5.7
#EXT-X-MEDIA-SEQUENCE:23419
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:5
#EXT-X-KEY:METHOD=AES-128,URI="https://chevy.dvalna.ru/key/premium51/5895596",IV=0x303030303030303030303030696be589,KEYFORMAT="identity"
#EXT-X-PROGRAM-DATE-TIME:2026-01-17T19:42:09.043+00:00
#EXTINF:4.004,
https://chevy.dvalna.ru/UUFESEADFh5aUQoXBl5KAVgXXFhHRRoCDQwYBRAWU1dRWFVWR0o
WAAoHUgBUAQBSDlwOCwMHAFJaURhVUFQABQ4FAQwGCggDCQ1XAFUPFhRaEAwMXENOEgwOVkoOEQ1RQQgGAQVdCgYABUJQEQoPWwEHXQ8GBRIJD1xSUVBWAlcBDFUAVwoOUlgMXFoHAltUVAZcWwMHUQVVAFVWBloEVQ5QUQkHXQEEDg0BXQMHDlsHXQhYAQZRUFUDEQ
#EXTINF:4.004,
https://chevy.dvalna.ru/UUFESEADFh5aUQoXBl5KAVgXXFhHRRoCDQwYBRAWU1dRWFVWR0o
WAAoHUgBQAwFbBFQNCgcFAVRbWRhVUFQABQ4FAQ0GCAgJDQxXDlQHFlJFH1APQ0JDCBoUREoQGkYLXE0NDgoPXQIODFYfC0QEVA5TWlwBBAZHCgwKXVxRCwYOBQQKClwIVQkCXQBRUlwEUwdZCFNRBQVSUQJcUFsCUQ0HCFpSDV8AAAJWX1oAWgNVU1wLAwFXUFtQAUI
#EXTINF:4.004,
https://chevy.dvalna.ru/UUFESEADFh5aUQoXBl5KAVgXXFhHRRoCDQwYBRAWU1dRWFVWR0o
WAA0BXQBTBw5TBlEPAAMGAVVWVhhVUFQABQ4FAQEFDgoFCwFTC1MCFgoCElVMD0dRFQoZXEoOEQ1RQQgGAQVdCgYAVkJQEQoPWwEHXQ8GVhIJD1wFXVNXBFULVAQAUA9bAQ8AVgsHAw5TDwNZDQQMVVUBWQMHV1FTUAwEBwkKAVoJDQ0BXVABDgBVUQtaBFdXVgAHEQ`;

function rewriteM3U8(content, proxyOrigin, m3u8BaseUrl, jwt) {
  let modified = content;

  // Rewrite key URLs
  modified = modified.replace(/URI="([^"]+)"/g, (_, originalKeyUrl) => {
    return `URI="${proxyOrigin}/dlhd/key?url=${encodeURIComponent(originalKeyUrl)}&jwt=${jwt}"`;
  });

  // Remove ENDLIST
  modified = modified.replace(/\n?#EXT-X-ENDLIST\s*$/m, '');

  // Fix: Join multi-line URLs
  const rawLines = modified.split('\n');
  const joinedLines = [];
  let currentLine = '';
  
  for (const line of rawLines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      if (currentLine) {
        joinedLines.push(currentLine);
        currentLine = '';
      }
      joinedLines.push(line);
    }
    else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (currentLine) {
        joinedLines.push(currentLine);
      }
      currentLine = trimmed;
    }
    else {
      currentLine += trimmed;
    }
  }
  
  if (currentLine) {
    joinedLines.push(currentLine);
  }

  // Proxy segments
  const processedLines = joinedLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    if (trimmed.includes('/dlhd/segment?')) return line;
    
    const isAbsoluteUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const isDlhdSegment = trimmed.includes('.dvalna.ru/');
    
    if (isAbsoluteUrl && isDlhdSegment && !trimmed.includes('mono.css')) {
      return `${proxyOrigin}/dlhd/segment?url=${encodeURIComponent(trimmed)}`;
    }
    
    return line;
  });

  return processedLines.join('\n');
}

console.log('Testing M3U8 rewriting with multi-line URLs...\n');

const rewritten = rewriteM3U8(
  sampleM3U8,
  'https://proxy.example.com',
  'https://zekonew.dvalna.ru/zeko/premium51/mono.css',
  'test-jwt-token'
);

console.log('Rewritten M3U8:');
console.log('─'.repeat(80));
console.log(rewritten);
console.log('─'.repeat(80));

// Check results
const lines = rewritten.split('\n');
const segmentLines = lines.filter(line => line.trim() && !line.startsWith('#'));

console.log(`\nTotal segment lines: ${segmentLines.length}`);

const proxied = segmentLines.filter(line => line.includes('/dlhd/segment?'));
const notProxied = segmentLines.filter(line => !line.includes('/dlhd/segment?'));

console.log(`Proxied: ${proxied.length}`);
console.log(`Not proxied: ${notProxied.length}`);

if (proxied.length > 0) {
  console.log('\n✅ SUCCESS - Segments are being proxied!');
  console.log('\nFirst proxied segment:');
  console.log(proxied[0].substring(0, 150) + '...');
} else {
  console.log('\n❌ FAIL - Segments are NOT being proxied!');
  if (notProxied.length > 0) {
    console.log('\nNot proxied segments:');
    for (const line of notProxied) {
      console.log(`  ${line.substring(0, 100)}`);
    }
  }
}

// Check key proxying
const keyMatch = rewritten.match(/URI="([^"]+)"/);
if (keyMatch && keyMatch[1].includes('/dlhd/key?')) {
  console.log('\n✅ Key is being proxied');
} else {
  console.log('\n❌ Key is NOT being proxied');
}
