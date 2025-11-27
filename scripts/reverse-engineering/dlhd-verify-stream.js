/**
 * DLHD.dad Stream Verification
 * 
 * Verifies the extracted stream URL works
 */

const https = require('https');
const http = require('http');

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://dlhd.dad/',
                'Origin': 'https://dlhd.dad',
                ...options.headers
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function verifyStream() {
    console.log('DLHD Stream Verification\n');
    console.log('='.repeat(70));

    const streamId = 769;
    const m3u8Url = `https://zekonew.giokko.ru/zeko/premium${streamId}/mono.css`;
    const keyUrl = `https://top2.giokko.ru/wmsxx.php?test=true&name=premium${streamId}&number=5880710`;

    // Test 1: Fetch M3U8 playlist
    console.log('\n1. Testing M3U8 Playlist...');
    console.log(`   URL: ${m3u8Url}`);
    
    try {
        const m3u8Response = await fetch(m3u8Url);
        console.log(`   Status: ${m3u8Response.status}`);
        console.log(`   Content-Type: ${m3u8Response.headers['content-type']}`);
        
        if (m3u8Response.status === 200) {
            console.log(`   ✓ M3U8 playlist accessible!`);
            console.log(`\n   Content preview:`);
            console.log('   ' + m3u8Response.data.substring(0, 500).split('\n').join('\n   '));
            
            // Extract segment URLs
            const segments = m3u8Response.data.match(/https?:\/\/[^\s]+/g) || [];
            console.log(`\n   Found ${segments.length} segment URLs`);
            
            if (segments.length > 0) {
                // Test first segment
                console.log('\n2. Testing first segment...');
                const firstSegment = segments[0];
                console.log(`   URL: ${firstSegment.substring(0, 80)}...`);
                
                try {
                    const segResponse = await fetch(firstSegment);
                    console.log(`   Status: ${segResponse.status}`);
                    console.log(`   Content-Type: ${segResponse.headers['content-type']}`);
                    console.log(`   Content-Length: ${segResponse.headers['content-length'] || segResponse.data.length} bytes`);
                    
                    if (segResponse.status === 200) {
                        console.log(`   ✓ Segment accessible!`);
                    } else {
                        console.log(`   ✗ Segment returned ${segResponse.status}`);
                    }
                } catch (e) {
                    console.log(`   ✗ Segment error: ${e.message}`);
                }
            }
        } else {
            console.log(`   ✗ M3U8 returned ${m3u8Response.status}`);
        }
    } catch (e) {
        console.log(`   ✗ M3U8 error: ${e.message}`);
    }

    // Test 3: Fetch decryption key
    console.log('\n3. Testing Decryption Key...');
    console.log(`   URL: ${keyUrl}`);
    
    try {
        const keyResponse = await fetch(keyUrl);
        console.log(`   Status: ${keyResponse.status}`);
        console.log(`   Content-Type: ${keyResponse.headers['content-type']}`);
        console.log(`   Content-Length: ${keyResponse.headers['content-length'] || keyResponse.data.length} bytes`);
        
        if (keyResponse.status === 200) {
            console.log(`   ✓ Key accessible!`);
            // AES-128 key should be 16 bytes
            if (keyResponse.data.length === 16) {
                console.log(`   ✓ Key is correct size (16 bytes for AES-128)`);
                // Show key as hex
                const keyHex = Buffer.from(keyResponse.data, 'binary').toString('hex');
                console.log(`   Key (hex): ${keyHex}`);
            }
        } else {
            console.log(`   ✗ Key returned ${keyResponse.status}`);
        }
    } catch (e) {
        console.log(`   ✗ Key error: ${e.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('STREAM INFORMATION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`
Stream ID: ${streamId}
M3U8 URL:  ${m3u8Url}
Key URL:   ${keyUrl}

To play this stream:
1. Use a player that supports HLS with AES-128 encryption (VLC, ffplay, etc.)
2. Or use ffmpeg to download:
   ffmpeg -i "${m3u8Url}" -c copy output.ts

Note: The stream URL pattern is:
  https://zekonew.giokko.ru/zeko/premium{streamId}/mono.css
  
Key URL pattern:
  https://top2.giokko.ru/wmsxx.php?test=true&name=premium{streamId}&number={number}
`);
}

verifyStream().catch(console.error);
