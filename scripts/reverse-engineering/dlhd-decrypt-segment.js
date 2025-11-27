/**
 * DLHD.dad Stream Decryption
 * 
 * Fetches the encryption key and decrypts a video segment
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function decryptStream(streamId = 769) {
    console.log('DLHD Stream Decryption\n');
    console.log('='.repeat(70));
    console.log(`Target: Stream ${streamId}`);
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

    // Storage for captured data
    let m3u8Content = null;
    let keyData = null;
    let segmentData = null;
    let keyUrl = null;
    let segmentUrl = null;
    let iv = null;

    // Intercept responses
    page.on('response', async response => {
        const url = response.url();
        
        // Capture M3U8 content
        if (url.includes('mono.css') || url.includes('giokko.ru/zeko')) {
            try {
                const body = await response.text();
                if (body.includes('#EXTM3U')) {
                    m3u8Content = body;
                    console.log(`\n[M3U8] Captured playlist from ${url}`);
                    
                    // Extract key URL and IV
                    const keyMatch = body.match(/URI="([^"]+)"/);
                    const ivMatch = body.match(/IV=0x([a-fA-F0-9]+)/);
                    
                    if (keyMatch) {
                        keyUrl = keyMatch[1];
                        console.log(`[KEY URL] ${keyUrl}`);
                    }
                    if (ivMatch) {
                        iv = ivMatch[1];
                        console.log(`[IV] 0x${iv}`);
                    }
                    
                    // Extract first segment URL
                    const segMatch = body.match(/https:\/\/whalesignal\.ai\/[^\s]+/);
                    if (segMatch) {
                        segmentUrl = segMatch[0];
                        console.log(`[SEGMENT] ${segmentUrl.substring(0, 80)}...`);
                    }
                }
            } catch (e) {}
        }
        
        // Capture key
        if (url.includes('wmsxx.php') || url.includes('top2.giokko.ru')) {
            try {
                const buffer = await response.buffer();
                if (buffer.length === 16) {
                    keyData = buffer;
                    console.log(`\n[KEY] Captured 16-byte key from ${url}`);
                    console.log(`[KEY HEX] ${buffer.toString('hex')}`);
                }
            } catch (e) {}
        }
        
        // Capture segment
        if (url.includes('whalesignal.ai')) {
            try {
                const buffer = await response.buffer();
                if (buffer.length > 1000) {
                    segmentData = buffer;
                    console.log(`\n[SEGMENT] Captured ${buffer.length} bytes from whalesignal.ai`);
                }
            } catch (e) {}
        }
    });

    // Navigate to the player iframe directly
    const iframeUrl = `https://epicplayplay.cfd/premiumtv/daddyhd.php?id=${streamId}`;
    console.log(`\nNavigating to player: ${iframeUrl}\n`);

    try {
        await page.goto(iframeUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        // Wait for stream to load
        await new Promise(r => setTimeout(r, 8000));

        // If we didn't capture the key, try to fetch it manually
        if (!keyData && keyUrl) {
            console.log('\nFetching key manually...');
            
            const keyResponse = await page.evaluate(async (url) => {
                try {
                    const response = await fetch(url, { credentials: 'include' });
                    const buffer = await response.arrayBuffer();
                    return Array.from(new Uint8Array(buffer));
                } catch (e) {
                    return { error: e.message };
                }
            }, keyUrl);

            if (Array.isArray(keyResponse) && keyResponse.length === 16) {
                keyData = Buffer.from(keyResponse);
                console.log(`[KEY] Fetched manually: ${keyData.toString('hex')}`);
            } else {
                console.log(`[KEY] Manual fetch failed:`, keyResponse);
            }
        }

        // If we didn't capture a segment, try to fetch it manually
        if (!segmentData && segmentUrl) {
            console.log('\nFetching segment manually...');
            
            const segResponse = await page.evaluate(async (url) => {
                try {
                    const response = await fetch(url, { credentials: 'include' });
                    const buffer = await response.arrayBuffer();
                    return Array.from(new Uint8Array(buffer));
                } catch (e) {
                    return { error: e.message };
                }
            }, segmentUrl);

            if (Array.isArray(segResponse) && segResponse.length > 1000) {
                segmentData = Buffer.from(segResponse);
                console.log(`[SEGMENT] Fetched manually: ${segmentData.length} bytes`);
            } else {
                console.log(`[SEGMENT] Manual fetch failed:`, segResponse);
            }
        }

    } catch (e) {
        console.error('Navigation error:', e.message);
    }

    await browser.close();

    // Now decrypt the segment
    console.log('\n' + '='.repeat(70));
    console.log('DECRYPTION');
    console.log('='.repeat(70));

    if (!keyData) {
        console.log('\n✗ No key data captured. Cannot decrypt.');
        return null;
    }

    if (!segmentData) {
        console.log('\n✗ No segment data captured. Cannot decrypt.');
        return null;
    }

    if (!iv) {
        console.log('\n✗ No IV found. Cannot decrypt.');
        return null;
    }

    console.log(`\nKey: ${keyData.toString('hex')}`);
    console.log(`IV:  ${iv}`);
    console.log(`Segment size: ${segmentData.length} bytes`);

    // Prepare IV (pad to 16 bytes if needed)
    let ivBuffer = Buffer.from(iv, 'hex');
    if (ivBuffer.length < 16) {
        const padded = Buffer.alloc(16, 0);
        ivBuffer.copy(padded, 16 - ivBuffer.length);
        ivBuffer = padded;
    }
    console.log(`IV Buffer: ${ivBuffer.toString('hex')}`);

    // Decrypt using AES-128-CBC
    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, ivBuffer);
        decipher.setAutoPadding(true);
        
        const decrypted = Buffer.concat([
            decipher.update(segmentData),
            decipher.final()
        ]);

        console.log(`\n✓ Decryption successful!`);
        console.log(`Decrypted size: ${decrypted.length} bytes`);

        // Check if it's valid MPEG-TS (starts with 0x47 sync byte)
        if (decrypted[0] === 0x47) {
            console.log(`✓ Valid MPEG-TS data (sync byte 0x47 found)`);
        } else {
            console.log(`First bytes: ${decrypted.slice(0, 16).toString('hex')}`);
        }

        // Save the decrypted segment
        const outputPath = path.join(__dirname, `dlhd-decrypted-segment-${streamId}.ts`);
        fs.writeFileSync(outputPath, decrypted);
        console.log(`\n✓ Saved decrypted segment to: ${outputPath}`);

        // Also save the encrypted segment for comparison
        const encryptedPath = path.join(__dirname, `dlhd-encrypted-segment-${streamId}.ts`);
        fs.writeFileSync(encryptedPath, segmentData);
        console.log(`✓ Saved encrypted segment to: ${encryptedPath}`);

        return {
            key: keyData.toString('hex'),
            iv: iv,
            encryptedSize: segmentData.length,
            decryptedSize: decrypted.length,
            outputPath,
        };

    } catch (e) {
        console.error(`\n✗ Decryption failed: ${e.message}`);
        
        // Try alternative IV interpretations
        console.log('\nTrying alternative IV formats...');
        
        // Try with IV as-is (left-padded)
        const altIvs = [
            Buffer.from(iv.padStart(32, '0'), 'hex'),
            Buffer.from(iv.padEnd(32, '0'), 'hex'),
            Buffer.alloc(16, 0), // All zeros
        ];

        for (let i = 0; i < altIvs.length; i++) {
            try {
                const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, altIvs[i]);
                decipher.setAutoPadding(true);
                
                const decrypted = Buffer.concat([
                    decipher.update(segmentData),
                    decipher.final()
                ]);

                console.log(`\n✓ Alternative IV ${i + 1} worked!`);
                console.log(`IV used: ${altIvs[i].toString('hex')}`);
                
                const outputPath = path.join(__dirname, `dlhd-decrypted-segment-${streamId}.ts`);
                fs.writeFileSync(outputPath, decrypted);
                console.log(`✓ Saved to: ${outputPath}`);
                
                return { success: true, iv: altIvs[i].toString('hex') };
            } catch (e2) {
                console.log(`Alternative IV ${i + 1} failed: ${e2.message}`);
            }
        }

        return null;
    }
}

// Run decryption
const streamId = process.argv[2] || 769;
decryptStream(parseInt(streamId))
    .then(result => {
        if (result) {
            console.log('\n' + '='.repeat(70));
            console.log('SUCCESS!');
            console.log('='.repeat(70));
            console.log('\nDecryption completed successfully.');
            console.log(JSON.stringify(result, null, 2));
        }
    })
    .catch(console.error);
