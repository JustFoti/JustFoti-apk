/**
 * DLHD.dad Direct Stream Decryption
 * 
 * Directly fetches and decrypts stream segments
 */

const puppeteer = require('puppeteer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function directDecrypt(streamId = 769) {
    console.log('DLHD Direct Stream Decryption\n');
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

    // Step 1: Fetch the M3U8 playlist
    const m3u8Url = `https://zekonew.giokko.ru/zeko/premium${streamId}/mono.css`;
    console.log(`\n1. Fetching M3U8 playlist: ${m3u8Url}`);

    await page.goto('about:blank');
    
    const m3u8Content = await page.evaluate(async (url) => {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (e) {
            return { error: e.message };
        }
    }, m3u8Url);

    if (typeof m3u8Content !== 'string' || !m3u8Content.includes('#EXTM3U')) {
        console.log('   ✗ Failed to fetch M3U8:', m3u8Content);
        await browser.close();
        return null;
    }

    console.log('   ✓ M3U8 fetched successfully');
    console.log('\n   Content:');
    console.log('   ' + m3u8Content.split('\n').slice(0, 15).join('\n   '));

    // Parse M3U8 for key URL, IV, and segments
    const keyMatch = m3u8Content.match(/URI="([^"]+)"/);
    const ivMatch = m3u8Content.match(/IV=0x([a-fA-F0-9]+)/);
    const segmentMatches = m3u8Content.match(/https:\/\/whalesignal\.ai\/[^\s]+/g) || [];

    if (!keyMatch) {
        console.log('   ✗ No key URL found in M3U8');
        await browser.close();
        return null;
    }

    const keyUrl = keyMatch[1];
    const ivHex = ivMatch ? ivMatch[1] : null;
    const segmentUrl = segmentMatches[0];

    console.log(`\n2. Parsed M3U8:`);
    console.log(`   Key URL: ${keyUrl}`);
    console.log(`   IV: 0x${ivHex}`);
    console.log(`   Segments: ${segmentMatches.length} found`);
    console.log(`   First segment: ${segmentUrl ? segmentUrl.substring(0, 60) + '...' : 'none'}`);

    // Step 2: Fetch the decryption key
    console.log(`\n3. Fetching decryption key...`);
    
    // First, visit the main site to establish session
    console.log('   Setting up session...');
    await page.goto(`https://dlhd.dad/casting/stream-${streamId}.php`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
    }).catch(() => {});
    
    await new Promise(r => setTimeout(r, 2000));

    // Now fetch the key with proper headers
    // The key server expects Referer from the player domain
    const keyResponse = await page.evaluate(async (url) => {
        try {
            const response = await fetch(url, {
                credentials: 'omit',
                mode: 'cors',
                headers: {
                    'Accept': '*/*',
                    'Origin': 'https://zekonew.giokko.ru',
                    'Referer': 'https://zekonew.giokko.ru/',
                }
            });
            
            if (!response.ok) {
                return { error: `HTTP ${response.status}`, status: response.status };
            }
            
            const buffer = await response.arrayBuffer();
            return {
                data: Array.from(new Uint8Array(buffer)),
                length: buffer.byteLength,
                status: response.status
            };
        } catch (e) {
            return { error: e.message };
        }
    }, keyUrl);
    
    // If that failed, try fetching from the player context
    if (keyResponse.error || !keyResponse.data || keyResponse.data.length !== 16) {
        console.log(`   First attempt failed, trying from player context...`);
        
        // Navigate to the player page first
        await page.goto(`https://zekonew.giokko.ru/zeko/premium${streamId}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        }).catch(() => {});
        
        const keyResponse2 = await page.evaluate(async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    return { error: `HTTP ${response.status}`, status: response.status };
                }
                const buffer = await response.arrayBuffer();
                return {
                    data: Array.from(new Uint8Array(buffer)),
                    length: buffer.byteLength,
                    status: response.status
                };
            } catch (e) {
                return { error: e.message };
            }
        }, keyUrl);
        
        if (keyResponse2.data && keyResponse2.data.length === 16) {
            Object.assign(keyResponse, keyResponse2);
        }
    }

    console.log(`   Key response:`, keyResponse.error || `${keyResponse.length} bytes, status ${keyResponse.status}`);

    let keyData = null;
    if (keyResponse.data && keyResponse.data.length === 16) {
        keyData = Buffer.from(keyResponse.data);
        console.log(`   ✓ Key: ${keyData.toString('hex')}`);
    } else if (keyResponse.data) {
        console.log(`   Key data (${keyResponse.data.length} bytes): ${Buffer.from(keyResponse.data).toString('hex').substring(0, 64)}`);
        // Try using it anyway if it's close to 16 bytes
        if (keyResponse.data.length >= 16) {
            keyData = Buffer.from(keyResponse.data.slice(0, 16));
            console.log(`   Using first 16 bytes as key: ${keyData.toString('hex')}`);
        }
    }

    // Step 3: Fetch a segment
    console.log(`\n4. Fetching video segment...`);
    
    if (!segmentUrl) {
        console.log('   ✗ No segment URL found');
        await browser.close();
        return null;
    }

    const segmentResponse = await page.evaluate(async (url) => {
        try {
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Accept': '*/*',
                    'Origin': 'https://zekonew.giokko.ru',
                    'Referer': 'https://zekonew.giokko.ru/'
                }
            });
            
            if (!response.ok) {
                return { error: `HTTP ${response.status}`, status: response.status };
            }
            
            const buffer = await response.arrayBuffer();
            return {
                data: Array.from(new Uint8Array(buffer)),
                length: buffer.byteLength,
                status: response.status
            };
        } catch (e) {
            return { error: e.message };
        }
    }, segmentUrl);

    console.log(`   Segment response:`, segmentResponse.error || `${segmentResponse.length} bytes, status ${segmentResponse.status}`);

    let segmentData = null;
    if (segmentResponse.data && segmentResponse.data.length > 100) {
        segmentData = Buffer.from(segmentResponse.data);
        console.log(`   ✓ Segment: ${segmentData.length} bytes`);
        console.log(`   First 32 bytes: ${segmentData.slice(0, 32).toString('hex')}`);
    }

    await browser.close();

    // Step 4: Decrypt the segment
    console.log('\n' + '='.repeat(70));
    console.log('5. DECRYPTION');
    console.log('='.repeat(70));

    if (!keyData) {
        console.log('\n✗ No valid key data. Cannot decrypt.');
        
        // Save what we have for analysis
        if (segmentData) {
            const encPath = path.join(__dirname, `dlhd-encrypted-${streamId}.bin`);
            fs.writeFileSync(encPath, segmentData);
            console.log(`\nSaved encrypted segment to: ${encPath}`);
        }
        
        return { m3u8Content, keyUrl, ivHex, segmentUrl };
    }

    if (!segmentData) {
        console.log('\n✗ No segment data. Cannot decrypt.');
        return { keyData: keyData.toString('hex'), keyUrl, ivHex };
    }

    // Prepare IV
    let ivBuffer;
    if (ivHex) {
        // IV from M3U8 - pad to 16 bytes
        ivBuffer = Buffer.alloc(16, 0);
        const ivBytes = Buffer.from(ivHex, 'hex');
        ivBytes.copy(ivBuffer, 16 - ivBytes.length);
    } else {
        // Use sequence number as IV (common fallback)
        ivBuffer = Buffer.alloc(16, 0);
    }

    console.log(`\n   Key: ${keyData.toString('hex')}`);
    console.log(`   IV:  ${ivBuffer.toString('hex')}`);
    console.log(`   Encrypted segment: ${segmentData.length} bytes`);

    // Try decryption
    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, ivBuffer);
        decipher.setAutoPadding(true);
        
        const decrypted = Buffer.concat([
            decipher.update(segmentData),
            decipher.final()
        ]);

        console.log(`\n   ✓ Decryption successful!`);
        console.log(`   Decrypted size: ${decrypted.length} bytes`);
        console.log(`   First 32 bytes: ${decrypted.slice(0, 32).toString('hex')}`);

        // Check for MPEG-TS sync byte (0x47)
        let syncFound = false;
        for (let i = 0; i < Math.min(188, decrypted.length); i++) {
            if (decrypted[i] === 0x47) {
                console.log(`   ✓ MPEG-TS sync byte found at offset ${i}`);
                syncFound = true;
                break;
            }
        }

        if (!syncFound) {
            console.log(`   Note: No MPEG-TS sync byte in first 188 bytes`);
        }

        // Save files
        const decryptedPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
        const encryptedPath = path.join(__dirname, `dlhd-encrypted-${streamId}.bin`);
        
        fs.writeFileSync(decryptedPath, decrypted);
        fs.writeFileSync(encryptedPath, segmentData);
        
        console.log(`\n   ✓ Saved decrypted segment: ${decryptedPath}`);
        console.log(`   ✓ Saved encrypted segment: ${encryptedPath}`);

        return {
            success: true,
            key: keyData.toString('hex'),
            iv: ivBuffer.toString('hex'),
            encryptedSize: segmentData.length,
            decryptedSize: decrypted.length,
            decryptedPath,
            encryptedPath,
        };

    } catch (e) {
        console.log(`\n   ✗ Decryption failed: ${e.message}`);
        
        // Save encrypted data for manual analysis
        const encryptedPath = path.join(__dirname, `dlhd-encrypted-${streamId}.bin`);
        fs.writeFileSync(encryptedPath, segmentData);
        console.log(`\n   Saved encrypted segment for analysis: ${encryptedPath}`);
        
        // Try with different IV interpretations
        console.log('\n   Trying alternative approaches...');
        
        const alternatives = [
            { name: 'Zero IV', iv: Buffer.alloc(16, 0) },
            { name: 'IV as-is (right-padded)', iv: Buffer.from(ivHex.padEnd(32, '0'), 'hex') },
            { name: 'Sequence 0', iv: Buffer.from('00000000000000000000000000000000', 'hex') },
        ];

        for (const alt of alternatives) {
            try {
                const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, alt.iv);
                decipher.setAutoPadding(true);
                
                const decrypted = Buffer.concat([
                    decipher.update(segmentData),
                    decipher.final()
                ]);

                console.log(`\n   ✓ ${alt.name} worked!`);
                
                const decryptedPath = path.join(__dirname, `dlhd-decrypted-${streamId}.ts`);
                fs.writeFileSync(decryptedPath, decrypted);
                console.log(`   Saved to: ${decryptedPath}`);
                
                return {
                    success: true,
                    key: keyData.toString('hex'),
                    iv: alt.iv.toString('hex'),
                    method: alt.name,
                    decryptedPath,
                };
            } catch (e2) {
                console.log(`   ${alt.name}: ${e2.message}`);
            }
        }

        return {
            success: false,
            key: keyData.toString('hex'),
            iv: ivHex,
            error: e.message,
        };
    }
}

// Run
const streamId = process.argv[2] || 769;
directDecrypt(parseInt(streamId))
    .then(result => {
        console.log('\n' + '='.repeat(70));
        console.log('RESULT');
        console.log('='.repeat(70));
        console.log(JSON.stringify(result, null, 2));
    })
    .catch(console.error);
