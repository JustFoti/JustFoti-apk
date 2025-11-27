/**
 * DLHD.dad Stream API v2
 * 
 * Takes any channel number and returns a proper M3U8 with working decryption key
 * Also verifies the stream works by decrypting a segment
 * 
 * Usage:
 *   node dlhd-stream-api-v2.js <channel_id>
 *   node dlhd-stream-api-v2.js 769
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class DLHDStreamAPI {
    constructor() {
        this.m3u8BaseUrl = 'https://zekonew.giokko.ru/zeko/premium';
        this.keyReferer = 'https://epicplayplay.cfd/';
        this.segmentReferer = 'https://zekonew.giokko.ru/';
    }

    httpGet(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    ...headers
                }
            };

            https.get(options, res => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve({
                    status: res.statusCode,
                    data: Buffer.concat(chunks),
                    headers: res.headers
                }));
            }).on('error', reject);
        });
    }

    async fetchM3U8(channelId) {
        const url = `${this.m3u8BaseUrl}${channelId}/mono.css`;
        const response = await this.httpGet(url, {
            'Referer': this.segmentReferer
        });
        
        if (response.status !== 200) {
            throw new Error(`Failed to fetch M3U8: HTTP ${response.status}`);
        }

        return response.data.toString();
    }

    parseM3U8(content) {
        const keyMatch = content.match(/URI="([^"]+)"/);
        const ivMatch = content.match(/IV=0x([a-fA-F0-9]+)/);
        const segments = content.match(/https:\/\/whalesignal\.ai\/[^\s]+/g) || [];
        const sequenceMatch = content.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);

        return {
            keyUrl: keyMatch ? keyMatch[1] : null,
            iv: ivMatch ? ivMatch[1] : null,
            segments,
            sequence: sequenceMatch ? parseInt(sequenceMatch[1]) : 0
        };
    }

    async fetchKey(keyUrl) {
        const response = await this.httpGet(keyUrl, {
            'Referer': this.keyReferer,
            'Origin': 'https://epicplayplay.cfd'
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch key: HTTP ${response.status}`);
        }

        if (response.data.length !== 16) {
            throw new Error(`Invalid key length: ${response.data.length} (expected 16)`);
        }

        return response.data;
    }

    async fetchSegment(segmentUrl) {
        const response = await this.httpGet(segmentUrl, {
            'Referer': this.segmentReferer,
            'Origin': 'https://zekonew.giokko.ru'
        });

        if (response.status !== 200) {
            throw new Error(`Failed to fetch segment: HTTP ${response.status}`);
        }

        return response.data;
    }

    decryptSegment(encryptedData, keyData, ivHex) {
        const ivBuffer = Buffer.alloc(16, 0);
        const ivBytes = Buffer.from(ivHex, 'hex');
        ivBytes.copy(ivBuffer, 16 - ivBytes.length);

        const decipher = crypto.createDecipheriv('aes-128-cbc', keyData, ivBuffer);
        return Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);
    }

    generateProxiedM3U8(originalM3U8, keyData) {
        const keyBase64 = keyData.toString('base64');
        const keyDataUri = `data:application/octet-stream;base64,${keyBase64}`;

        return originalM3U8.replace(
            /URI="[^"]+"/,
            `URI="${keyDataUri}"`
        );
    }

    async getStream(channelId, verify = true) {
        console.log(`Fetching stream for channel ${channelId}...`);

        // Step 1: Fetch M3U8
        const m3u8Content = await this.fetchM3U8(channelId);
        const parsed = this.parseM3U8(m3u8Content);

        if (!parsed.keyUrl) {
            throw new Error('No key URL found in M3U8');
        }

        console.log(`Key URL: ${parsed.keyUrl}`);
        console.log(`IV: 0x${parsed.iv}`);
        console.log(`Segments: ${parsed.segments.length}`);

        // Step 2: Fetch the decryption key
        const keyData = await this.fetchKey(parsed.keyUrl);
        console.log(`Key: ${keyData.toString('hex')}`);

        // Step 3: Verify by decrypting a segment
        let verified = false;
        let decryptedSegment = null;

        if (verify && parsed.segments.length > 0) {
            console.log(`\nVerifying decryption...`);
            try {
                const segmentData = await this.fetchSegment(parsed.segments[0]);
                console.log(`Segment size: ${segmentData.length} bytes`);

                if (segmentData.length > 1000) {
                    decryptedSegment = this.decryptSegment(segmentData, keyData, parsed.iv);
                    console.log(`Decrypted size: ${decryptedSegment.length} bytes`);

                    if (decryptedSegment[0] === 0x47) {
                        console.log(`✓ Valid MPEG-TS (sync byte 0x47)`);
                        verified = true;
                    }
                } else {
                    console.log(`Segment too small (${segmentData.length} bytes) - may be error response`);
                }
            } catch (e) {
                console.log(`Verification failed: ${e.message}`);
            }
        }

        // Step 4: Generate proxied M3U8
        const proxiedM3U8 = this.generateProxiedM3U8(m3u8Content, keyData);

        return {
            channelId,
            originalM3U8: m3u8Content,
            proxiedM3U8,
            key: keyData.toString('hex'),
            keyBase64: keyData.toString('base64'),
            iv: parsed.iv,
            segments: parsed.segments,
            m3u8Url: `${this.m3u8BaseUrl}${channelId}/mono.css`,
            verified,
            decryptedSegment
        };
    }
}

async function main() {
    const channelId = process.argv[2];

    if (!channelId) {
        console.log('DLHD Stream API v2\n');
        console.log('Usage: node dlhd-stream-api-v2.js <channel_id>');
        console.log('Example: node dlhd-stream-api-v2.js 769');
        process.exit(1);
    }

    const api = new DLHDStreamAPI();

    try {
        const stream = await api.getStream(channelId);

        console.log('\n' + '='.repeat(70));
        console.log('STREAM INFO');
        console.log('='.repeat(70));

        console.log(`\nChannel ID: ${stream.channelId}`);
        console.log(`M3U8 URL: ${stream.m3u8Url}`);
        console.log(`Key (hex): ${stream.key}`);
        console.log(`Key (base64): ${stream.keyBase64}`);
        console.log(`IV: 0x${stream.iv}`);
        console.log(`Segments: ${stream.segments.length}`);
        console.log(`Verified: ${stream.verified ? '✓ YES' : '✗ NO'}`);

        // Save files
        const outputDir = __dirname;
        
        const m3u8Path = path.join(outputDir, `dlhd-channel-${channelId}.m3u8`);
        fs.writeFileSync(m3u8Path, stream.proxiedM3U8);
        console.log(`\nSaved M3U8: ${m3u8Path}`);

        const jsonPath = path.join(outputDir, `dlhd-channel-${channelId}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify({
            channelId: stream.channelId,
            m3u8Url: stream.m3u8Url,
            key: stream.key,
            keyBase64: stream.keyBase64,
            iv: stream.iv,
            segmentCount: stream.segments.length,
            verified: stream.verified,
            timestamp: new Date().toISOString()
        }, null, 2));
        console.log(`Saved JSON: ${jsonPath}`);

        if (stream.decryptedSegment) {
            const tsPath = path.join(outputDir, `dlhd-channel-${channelId}-sample.ts`);
            fs.writeFileSync(tsPath, stream.decryptedSegment);
            console.log(`Saved sample: ${tsPath}`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('PROXIED M3U8');
        console.log('='.repeat(70));
        console.log(stream.proxiedM3U8);

        console.log('\n' + '='.repeat(70));
        console.log('HOW TO PLAY');
        console.log('='.repeat(70));
        console.log(`\nvlc "${m3u8Path}"`);
        console.log(`ffplay "${m3u8Path}"`);
        console.log(`ffmpeg -i "${m3u8Path}" -c copy output.ts`);

    } catch (error) {
        console.error(`\nError: ${error.message}`);
        process.exit(1);
    }
}

module.exports = DLHDStreamAPI;

if (require.main === module) {
    main();
}
