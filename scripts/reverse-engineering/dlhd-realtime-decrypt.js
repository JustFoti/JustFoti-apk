/**
 * DLHD.dad Realtime Decryption
 * 
 * Fetches fresh M3U8, key, and segment in quick succession
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...headers
            }
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({ 
                status: res.statusCode, 
                data: Buffer.concat(chunks),
                headers: res.headers 
            }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function realtimeDecrypt(streamId = 769) {
    console.log('DLHD Realtime Decryption\n');
    console.log('='.repeat(70));

    // Step 1: Fetch fresh M3U8
    const m3u8Url = `https://zekonew.giokko.ru/zeko/premium${streamId}/mono.css`;
    console.log(`\n1. Fetching M3U8: ${m3u8Url}`);

    const m3u8Response = await httpsGet(m3u8Url, {
        'Referer': 'https://epicplayplay.cfd/',
        'Origin': 'https://epicplayplay.cfd'
    });

    if (m3u8Response.status !== 200) {
        console.log(`   ✗ M3U8 failed: ${m3u8Response.status}`);
        return;
    }

    const m3u8Content = m3u8Response.data.toString();
    console.log(`   ✓ M3U8 fetched (${m3u8Content.length} chars)`);

    // Parse M3U8
    const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
    const ivMatch = m3u8Content.match(/IV=0x([a-fA-F0-9]+)/);
    const segmentMatch = m3u8Content.match(/https:\/\/whalesignal\.ai\/[^\s]+/);

    if (!keyMatch || !ivMatch || !segmentMatch) {
        console.log('   ✗ Failed to parse M3U8');
        console.log(m3u8Content);
        return;
    }

    const keyUrl = keyMatch[1];
    const ivHex = ivMatch[1];
    const segmentUrl = segmentMatch[0];

    console.log(`\n   Key URL: ${keyUrl}`);
    console.log(`   IV: 0x${ivHex}`);
    console.log(`   Segment: ${segmentUrl.substring(0, 60)}...`);

    // Step 2: Fetch the key IMMEDIATELY with various header combinations
    console.log(`\n2. Fetching key...`);

    const headerCombinations = [
        { 'Referer': 'https://zekonew.giokko.ru/', 'Origin': 'https://zekonew.giokko.ru' },
        { 'Referer': 'https://epicplayplay.cfd/', 'Origin': 'https://epicplayplay.cfd' },
        { 'Referer': 'https://dlhd.dad/', 'Origin': 'https://dlhd.dad' },
        { 'Referer': `https://zekonew.giokko.ru/zeko/premium${streamId}/` },
        { }, // No extra headers
    ];

    let keyData = null;

    for (let i = 0; i < headerCombinations.length; i++) {
        const headers = headerCombinations[i];
        console.log(`   Attempt ${i + 1}: ${JSON.stringify(headers)}`);
        
        try {
            const keyResponse = await httpsGet(keyUrl, headers);
            console.log(`   Status: ${keyResponse.status}, Size: ${keyResponse.data.length}`);
            
            if (keyResponse.status === 200 && keyResponse.data.length === 16) {
                keyData = keyResponse.data;
                console.log(`   ✓ Key: ${keyData.toString('hex')}`);
                break;
            } else if (keyResponse.status === 200) {
                console.log(`   Response: ${keyResponse.data.toString().substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`   Error: ${e.message}`);
        }
    }

    // Step 3: Try using Puppeteer to get the key from the player context
    if (!keyData) {
        console.log(`\n3. Trying Puppeteer to get key from player context...`);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Intercept the key request
        let interceptedKey = null;
        page.on('response', async response => {
            const url = response.url();
            if (url.includes('wmsxx.php') && response.status() === 200) {
                try {
                    const buffer = await response.buffer();
                    if (buffer.length === 16) {
                        interceptedKey = buffer;
                        console.log(`   ✓ Intercepted key: ${buffer.toString('hex')}`);
                    }
                } catch (e) {}
            }
        });

        // Navigate to the player
        await page.goto(`https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${streamId}`, {
            waitUntil: 'networkidle2',
            timeout: 20000
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 5000));

        if (interceptedKey) {
            keyData = interceptedKey;
        }

        await browser.close();
    }

    // Step 4: Fetch segment
    console.log(`\n4. Fetching segment...`);
    
    const segmentResponse = await httpsGet(segmentUrl, {
        'Referer': 'https://zekonew.giokko.ru/',
        'Origin': 'https://zekonew.giokko.ru'
    });

    if (segmentResponse.status !== 200) {
        console.log(`   ✗ Segment failed: ${segmentResponse.status}`);
        return;
    }

    const segmentData = segmentResponse.data;
    console.log(`   ✓ Segment: ${segmentData.length} bytes`);
    console.log(`   First 32 bytes: ${segmentData.slice(0, 32).toString('hex')}`);

    // Save encrypted segment
    fs.writeFileSync(path.join(__dirname, `dlhd-encrypted-${streamId}.bin`), segmentData);

    // Step 5: Decrypt
    console.log('\n' + '='.repeat(70));
    console.log('5. DECRYPTION');
    console.log('='.repeat(70));

    if (!keyData) {
        console.log('\n✗ No key available');
        
        // Try some common/default keys
        console.log('\nTrying common keys...');
        const commonKeys = [
            Buffer.alloc(16, 0),  // All zeros
            Buffer.from('0123456789abcdef'),  // Sequential
            Buffer.from(ivHex.substring(0, 32), 'hex'),  // IV as key
        ];

        const ivBuffer = Buffer.alloc(16, 0);
        Buffer.from(ivHex, 'hex').copy(ivBuffer, 16 - Buffer.from(ivHex, 'hex').length);

        for (const testKey of commonKeys) {
            try {
                const decipher = crypto.createDecipheriv('aes-128-cbc', testKey, ivBuffer);
                const decrypted = Buffer.concat([decipher.update(segmentData), decipher.final()]);
                console.log(`✓ Key ${testKey.toString('hex')} worked!`);
                fs.writeFileSync(path.join(__dirname, `dlhd-decrypted-${streamId}.ts`), decrypted);
                return;
            } catch (e) {}
        }
        
        return;
    }

    // Prepare IV
    const ivBuffer = Buffer.alloc(16, 0);
    const ivBytes = Buffer.from(ivHex, 'hex');
    ivBytes.copy(ivBuffer, 16 - ivBytes.length);

    console.log(`\nKey: ${keyData.toString('hex')}`);
    console.log(`IV:  ${ivBuffer.toString('hex')}`);
    console.log(`Segment: ${segmentData.length} bytes`);

    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, ivBuffer);
        const decrypted = Buffer.concat([
            decipher.update(segmentData),
            decipher.final()
        ]);

        console.log(`\n✓ Decryption successful!`);
        console.log(`Decrypted: ${decrypted.length} bytes`);
        console.log(`First 32 bytes: ${decrypted.slice(0, 32).toString('hex')}`);

        if (decrypted[0] === 0x47) {
            console.log(`✓ Valid MPEG-TS (sync byte 0x47)`);
        }

        const outputPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
        fs.writeFileSync(outputPath, decrypted);
        console.log(`\n✓ Saved: ${outputPath}`);

    } catch (e) {
        console.log(`\n✗ Decryption failed: ${e.message}`);
    }
}

realtimeDecrypt(parseInt(process.argv[2]) || 769).catch(console.error);
