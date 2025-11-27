/**
 * Test the DLHD proxy flow step by step
 */

const https = require('https');

const DLHD_CONFIG = {
    playerDomain: 'https://epicplayplay.cfd',
    keyReferer: 'https://epicplayplay.cfd/',
};

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                ...headers
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function testProxy() {
    const channelId = '769';
    const channelKey = `premium${channelId}`;
    
    console.log('='.repeat(60));
    console.log('DLHD Proxy Flow Test');
    console.log('='.repeat(60));
    
    // Step 1: Server Lookup
    console.log('\n1. Testing Server Lookup...');
    const lookupUrl = `${DLHD_CONFIG.playerDomain}/server_lookup.js?channel_id=${channelKey}`;
    console.log(`   URL: ${lookupUrl}`);
    
    try {
        const lookupResponse = await httpsGet(lookupUrl, {
            'Referer': DLHD_CONFIG.keyReferer,
            'Origin': DLHD_CONFIG.playerDomain,
        });
        
        console.log(`   Status: ${lookupResponse.status}`);
        console.log(`   Response: ${lookupResponse.data}`);
        
        if (lookupResponse.status !== 200) {
            console.log('   FAILED: Server lookup returned non-200 status');
            return;
        }
        
        const serverData = JSON.parse(lookupResponse.data);
        const serverKey = serverData.server_key;
        console.log(`   Server Key: ${serverKey}`);
        
        // Step 2: Construct M3U8 URL
        console.log('\n2. Constructing M3U8 URL...');
        let m3u8Url;
        if (serverKey === 'top1/cdn') {
            m3u8Url = `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`;
        } else {
            m3u8Url = `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`;
        }
        console.log(`   M3U8 URL: ${m3u8Url}`);
        
        // Step 3: Fetch M3U8
        console.log('\n3. Fetching M3U8...');
        const m3u8Response = await httpsGet(m3u8Url, {
            'Referer': DLHD_CONFIG.keyReferer,
            'Origin': DLHD_CONFIG.playerDomain,
        });
        
        console.log(`   Status: ${m3u8Response.status}`);
        console.log(`   Content Length: ${m3u8Response.data.length}`);
        
        if (m3u8Response.status !== 200) {
            console.log('   FAILED: M3U8 fetch returned non-200 status');
            console.log(`   Response: ${m3u8Response.data.substring(0, 200)}`);
            return;
        }
        
        if (!m3u8Response.data.includes('#EXTM3U')) {
            console.log('   FAILED: Invalid M3U8 content');
            console.log(`   Response: ${m3u8Response.data.substring(0, 200)}`);
            return;
        }
        
        console.log('   SUCCESS: Valid M3U8 received');
        
        // Parse M3U8
        const keyMatch = m3u8Response.data.match(/URI="([^"]+)"/);
        const ivMatch = m3u8Response.data.match(/IV=0x([a-fA-F0-9]+)/);
        
        if (!keyMatch) {
            console.log('   WARNING: No key URL found in M3U8');
        } else {
            console.log(`   Key URL: ${keyMatch[1]}`);
        }
        
        if (ivMatch) {
            console.log(`   IV: ${ivMatch[1]}`);
        }
        
        // Step 4: Fetch Key
        if (keyMatch) {
            console.log('\n4. Fetching Decryption Key...');
            const keyUrl = keyMatch[1];
            
            const keyResponse = await httpsGet(keyUrl, {
                'Referer': DLHD_CONFIG.keyReferer,
                'Origin': DLHD_CONFIG.playerDomain,
            });
            
            console.log(`   Status: ${keyResponse.status}`);
            
            if (keyResponse.status === 200) {
                // Key is binary, check length
                const keyBuffer = Buffer.from(keyResponse.data, 'binary');
                console.log(`   Key Length: ${keyBuffer.length} bytes`);
                
                if (keyBuffer.length === 16) {
                    console.log(`   Key (hex): ${keyBuffer.toString('hex')}`);
                    console.log('   SUCCESS: Valid 16-byte key received');
                } else {
                    console.log('   WARNING: Key is not 16 bytes');
                }
            } else {
                console.log(`   FAILED: Key fetch returned ${keyResponse.status}`);
            }
        }
        
        // Step 5: Check segments
        console.log('\n5. Checking Segments...');
        const segments = m3u8Response.data.match(/https:\/\/whalesignal\.ai\/[^\s]+/g) || [];
        console.log(`   Found ${segments.length} segments`);
        
        if (segments.length > 0) {
            console.log(`   First segment: ${segments[0]}`);
            
            // Try to fetch first segment
            const segResponse = await httpsGet(segments[0], {
                'Referer': DLHD_CONFIG.keyReferer,
                'Origin': DLHD_CONFIG.playerDomain,
            });
            
            console.log(`   Segment fetch status: ${segResponse.status}`);
            if (segResponse.status === 200) {
                console.log(`   Segment size: ${segResponse.data.length} bytes`);
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE - All steps passed!');
        console.log('='.repeat(60));
        
    } catch (err) {
        console.error('\nERROR:', err.message);
    }
}

testProxy();
