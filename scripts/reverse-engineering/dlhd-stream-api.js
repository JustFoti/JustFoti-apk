/**
 * DLHD.dad Stream API
 * 
 * Takes any channel number and returns a proper M3U8 with working decryption key
 * 
 * Usage:
 *   node dlhd-stream-api.js <channel_id>
 *   node dlhd-stream-api.js 769
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class DLHDStreamAPI {
    constructor() {
        this.m3u8BaseUrl = 'https://zekonew.giokko.ru/zeko/premium';
        this.keyReferer = 'https://epicplayplay.cfd/';
    }

    /**
     * HTTP GET request with custom headers
     */
    httpGet(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

    /**
     * Fetch the M3U8 playlist for a channel
     */
    async fetchM3U8(channelId) {
        const url = `${this.m3u8BaseUrl}${channelId}/mono.css`;
        const response = await this.httpGet(url);
        
        if (response.status !== 200) {
            throw new Error(`Failed to fetch M3U8: HTTP ${response.status}`);
        }

        return response.data.toString();
    }

    /**
     * Parse M3U8 content to extract key URL, IV, and segments
     */
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

    /**
     * Fetch the decryption key with proper headers
     */
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

    /**
     * Generate a modified M3U8 with embedded key (data URI)
     */
    generateProxiedM3U8(originalM3U8, keyData) {
        // Convert key to base64 data URI
        const keyBase64 = keyData.toString('base64');
        const keyDataUri = `data:application/octet-stream;base64,${keyBase64}`;

        // Replace the key URL with the data URI
        const modifiedM3U8 = originalM3U8.replace(
            /URI="[^"]+"/,
            `URI="${keyDataUri}"`
        );

        return modifiedM3U8;
    }

    /**
     * Get complete stream info for a channel
     */
    async getStream(channelId) {
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

        // Step 3: Generate proxied M3U8 with embedded key
        const proxiedM3U8 = this.generateProxiedM3U8(m3u8Content, keyData);

        return {
            channelId,
            originalM3U8: m3u8Content,
            proxiedM3U8,
            key: keyData.toString('hex'),
            keyBase64: keyData.toString('base64'),
            iv: parsed.iv,
            segments: parsed.segments,
            m3u8Url: `${this.m3u8BaseUrl}${channelId}/mono.css`
        };
    }
}

// CLI interface
async function main() {
    const channelId = process.argv[2];

    if (!channelId) {
        console.log('DLHD Stream API\n');
        console.log('Usage: node dlhd-stream-api.js <channel_id>');
        console.log('Example: node dlhd-stream-api.js 769');
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

        // Save the proxied M3U8
        const outputPath = path.join(__dirname, `dlhd-channel-${channelId}.m3u8`);
        fs.writeFileSync(outputPath, stream.proxiedM3U8);
        console.log(`\nSaved proxied M3U8 to: ${outputPath}`);

        // Also save stream info as JSON
        const jsonPath = path.join(__dirname, `dlhd-channel-${channelId}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify({
            channelId: stream.channelId,
            m3u8Url: stream.m3u8Url,
            key: stream.key,
            keyBase64: stream.keyBase64,
            iv: stream.iv,
            segmentCount: stream.segments.length,
            timestamp: new Date().toISOString()
        }, null, 2));
        console.log(`Saved stream info to: ${jsonPath}`);

        console.log('\n' + '='.repeat(70));
        console.log('PROXIED M3U8 (with embedded key)');
        console.log('='.repeat(70));
        console.log(stream.proxiedM3U8);

        console.log('\n' + '='.repeat(70));
        console.log('HOW TO PLAY');
        console.log('='.repeat(70));
        console.log(`\nOption 1: Use the proxied M3U8 file:`);
        console.log(`  vlc "${outputPath}"`);
        console.log(`  ffplay "${outputPath}"`);
        console.log(`\nOption 2: Use ffmpeg to download:`);
        console.log(`  ffmpeg -i "${outputPath}" -c copy output.ts`);

    } catch (error) {
        console.error(`\nError: ${error.message}`);
        process.exit(1);
    }
}

// Export for use as module
module.exports = DLHDStreamAPI;

// Run CLI if executed directly
if (require.main === module) {
    main();
}
