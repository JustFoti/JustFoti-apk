/**
 * DLHD.dad Key Capture
 * 
 * Captures the actual key request from the player to see what headers work
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function captureKey(streamId = 769) {
    console.log('DLHD Key Capture\n');
    console.log('='.repeat(70));

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
        ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    let capturedKey = null;
    let keyRequestHeaders = null;
    let m3u8Content = null;

    // Intercept all requests to see headers
    await page.setRequestInterception(true);
    
    page.on('request', request => {
        const url = request.url();
        
        if (url.includes('wmsxx.php') || url.includes('top2.giokko.ru')) {
            console.log(`\n[KEY REQUEST] ${url}`);
            console.log('Headers:', JSON.stringify(request.headers(), null, 2));
            keyRequestHeaders = request.headers();
        }
        
        request.continue();
    });

    page.on('response', async response => {
        const url = response.url();
        
        // Capture M3U8
        if (url.includes('mono.css')) {
            try {
                const body = await response.text();
                if (body.includes('#EXTM3U')) {
                    m3u8Content = body;
                    console.log(`\n[M3U8] Captured`);
                }
            } catch (e) {}
        }
        
        // Capture key
        if (url.includes('wmsxx.php') || url.includes('top2.giokko.ru')) {
            console.log(`\n[KEY RESPONSE] Status: ${response.status()}`);
            console.log('Response Headers:', JSON.stringify(response.headers(), null, 2));
            
            if (response.status() === 200) {
                try {
                    const buffer = await response.buffer();
                    if (buffer.length === 16) {
                        capturedKey = buffer;
                        console.log(`[KEY] Captured: ${buffer.toString('hex')}`);
                    } else {
                        console.log(`[KEY] Unexpected length: ${buffer.length}`);
                        console.log(`[KEY] Content: ${buffer.toString('utf8').substring(0, 100)}`);
                    }
                } catch (e) {
                    console.log(`[KEY] Error reading: ${e.message}`);
                }
            }
        }
    });

    // Go directly to the player iframe
    const playerUrl = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${streamId}`;
    console.log(`\nNavigating to player: ${playerUrl}\n`);

    try {
        await page.goto(playerUrl, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        // Wait for HLS to initialize and request key
        await new Promise(r => setTimeout(r, 10000));

    } catch (e) {
        console.log('Navigation error:', e.message);
    }

    await browser.close();

    // Results
    console.log('\n' + '='.repeat(70));
    console.log('RESULTS');
    console.log('='.repeat(70));

    if (capturedKey) {
        console.log(`\n✓ Key captured: ${capturedKey.toString('hex')}`);
        
        // Save the key
        const keyPath = path.join(__dirname, `dlhd-key-${streamId}.bin`);
        fs.writeFileSync(keyPath, capturedKey);
        console.log(`✓ Saved to: ${keyPath}`);

        // Now try to decrypt with this key
        if (m3u8Content) {
            const ivMatch = m3u8Content.match(/IV=0x([a-fA-F0-9]+)/);
            const segmentMatch = m3u8Content.match(/https:\/\/whalesignal\.ai\/[^\s]+/);
            
            if (ivMatch && segmentMatch) {
                console.log(`\nAttempting decryption...`);
                console.log(`IV: ${ivMatch[1]}`);
                console.log(`Segment: ${segmentMatch[0].substring(0, 60)}...`);
                
                // Fetch segment
                const https = require('https');
                const segmentData = await new Promise((resolve, reject) => {
                    https.get(segmentMatch[0], {
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://zekonew.giokko.ru/'
                        }
                    }, res => {
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    }).on('error', reject);
                });

                console.log(`Segment size: ${segmentData.length} bytes`);

                // Prepare IV
                const ivHex = ivMatch[1];
                const ivBuffer = Buffer.alloc(16, 0);
                const ivBytes = Buffer.from(ivHex, 'hex');
                ivBytes.copy(ivBuffer, 16 - ivBytes.length);

                // Decrypt
                try {
                    const decipher = crypto.createDecipheriv('aes-128-cbc', capturedKey, ivBuffer);
                    const decrypted = Buffer.concat([
                        decipher.update(segmentData),
                        decipher.final()
                    ]);

                    console.log(`\n✓ Decryption successful!`);
                    console.log(`Decrypted size: ${decrypted.length} bytes`);
                    
                    // Check for MPEG-TS
                    if (decrypted[0] === 0x47) {
                        console.log(`✓ Valid MPEG-TS (sync byte 0x47)`);
                    }

                    const outputPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
                    fs.writeFileSync(outputPath, decrypted);
                    console.log(`✓ Saved to: ${outputPath}`);

                } catch (e) {
                    console.log(`Decryption error: ${e.message}`);
                }
            }
        }
    } else {
        console.log('\n✗ No key captured');
        
        if (keyRequestHeaders) {
            console.log('\nKey request headers that were used:');
            console.log(JSON.stringify(keyRequestHeaders, null, 2));
        }
    }

    return { capturedKey: capturedKey?.toString('hex'), keyRequestHeaders };
}

captureKey(parseInt(process.argv[2]) || 769).catch(console.error);
