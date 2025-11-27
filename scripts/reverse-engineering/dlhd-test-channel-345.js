/**
 * Test channel 345 (CNN USA) to understand why it's failing
 */

const https = require('https');

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                ...headers
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function testChannel345() {
    const channelId = '345';
    const channelKey = `premium${channelId}`;
    
    console.log('Testing channel 345 (CNN USA)...\n');
    
    // Step 1: Server Lookup
    const lookupUrl = `https://epicplayplay.cfd/server_lookup.js?channel_id=${channelKey}`;
    console.log(`1. Server Lookup: ${lookupUrl}`);
    
    const lookupResponse = await httpsGet(lookupUrl, {
        'Referer': 'https://epicplayplay.cfd/',
        'Origin': 'https://epicplayplay.cfd',
    });
    
    console.log(`   Status: ${lookupResponse.status}`);
    console.log(`   Response: ${lookupResponse.data}`);
    
    const serverData = JSON.parse(lookupResponse.data);
    const serverKey = serverData.server_key;
    
    // Step 2: Construct M3U8 URL
    let m3u8Url;
    if (serverKey === 'top1/cdn') {
        m3u8Url = `https://top1.giokko.ru/top1/cdn/${channelKey}/mono.css`;
    } else {
        m3u8Url = `https://${serverKey}new.giokko.ru/${serverKey}/${channelKey}/mono.css`;
    }
    
    console.log(`\n2. M3U8 URL: ${m3u8Url}`);
    
    // Step 3: Fetch M3U8
    const m3u8Response = await httpsGet(m3u8Url, {
        'Referer': 'https://epicplayplay.cfd/',
        'Origin': 'https://epicplayplay.cfd',
    });
    
    console.log(`   Status: ${m3u8Response.status}`);
    console.log(`   Content Length: ${m3u8Response.data.length}`);
    console.log(`\n3. M3U8 Content:\n${m3u8Response.data}`);
}

testChannel345().catch(console.error);
