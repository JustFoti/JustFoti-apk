/**
 * Test the generated M3U8 by downloading and decrypting a segment
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function testM3U8(channelId) {
    const m3u8Path = path.join(__dirname, `dlhd-channel-${channelId}.m3u8`);
    
    if (!fs.existsSync(m3u8Path)) {
        console.log(`M3U8 file not found: ${m3u8Path}`);
        console.log('Run: node dlhd-stream-api.js ' + channelId);
        return;
    }

    const m3u8Content = fs.readFileSync(m3u8Path, 'utf8');
    console.log('Testing M3U8 for channel', channelId);
    console.log('='.repeat(60));

    // Extract key from data URI
    const keyMatch = m3u8Content.match(/URI="data:application\/octet-stream;base64,([^"]+)"/);
    const ivMatch = m3u8Content.match(/IV=0x([a-fA-F0-9]+)/);
    const segmentMatch = m3u8Content.match(/https:\/\/whalesignal\.ai\/[^\s]+/);

    if (!keyMatch || !ivMatch || !segmentMatch) {
        console.log('Failed to parse M3U8');
        return;
    }

    const keyBase64 = keyMatch[1];
    const keyData = Buffer.from(keyBase64, 'base64');
    const ivHex = ivMatch[1];
    const segmentUrl = segmentMatch[0];

    console.log(`Key (base64): ${keyBase64}`);
    console.log(`Key (hex): ${keyData.toString('hex')}`);
    console.log(`IV: 0x${ivHex}`);
    console.log(`Segment: ${segmentUrl.substring(0, 60)}...`);

    // Fetch segment
    console.log('\nFetching segment...');
    const segmentData = await new Promise((resolve, reject) => {
        https.get(segmentUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://zekonew.giokko.ru/'
            }
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });

    console.log(`Segment size: ${segmentData.length} bytes`);

    // Prepare IV
    const ivBuffer = Buffer.alloc(16, 0);
    const ivBytes = Buffer.from(ivHex, 'hex');
    ivBytes.copy(ivBuffer, 16 - ivBytes.length);

    // Decrypt
    console.log('\nDecrypting...');
    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, ivBuffer);
        const decrypted = Buffer.concat([
            decipher.update(segmentData),
            decipher.final()
        ]);

        console.log(`Decrypted size: ${decrypted.length} bytes`);
        console.log(`First 16 bytes: ${decrypted.slice(0, 16).toString('hex')}`);

        if (decrypted[0] === 0x47) {
            console.log('\n✓ SUCCESS! Valid MPEG-TS (sync byte 0x47)');
            
            const outputPath = path.join(__dirname, `dlhd-test-${channelId}.ts`);
            fs.writeFileSync(outputPath, decrypted);
            console.log(`Saved to: ${outputPath}`);
        } else {
            console.log('\n✗ Decryption produced invalid data');
        }

    } catch (e) {
        console.log(`\n✗ Decryption failed: ${e.message}`);
    }
}

const channelId = process.argv[2] || 769;
testM3U8(channelId);
