/**
 * DLHD.dad Decoder Module
 * 
 * This module provides functions to decode the obfuscated player configuration
 * and extract stream information from dlhd.dad pages.
 */

const vm = require('vm');

class DLHDDecoder {
    constructor() {
        this.decoder = null;
        this.sandbox = null;
    }

    /**
     * Initialize the decoder from HTML content
     * @param {string} html - The HTML content of a dlhd.dad stream page
     */
    initialize(html) {
        // Extract the main obfuscated script
        let scriptContent = null;
        const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        
        for (const tag of scriptTags) {
            const content = tag.replace(/<\/?script[^>]*>/gi, '');
            if (content.includes('function _0x8b05')) {
                scriptContent = content;
                break;
            }
        }

        if (!scriptContent) {
            throw new Error('Could not find obfuscated script in HTML');
        }

        // Create sandbox
        this.sandbox = {
            window: {},
            document: { createElement: () => ({ style: {} }) },
            navigator: { userAgent: 'Mozilla/5.0' },
            location: { href: 'https://dlhd.dad/' },
            console: { log: () => {}, warn: () => {}, error: () => {} },
            setTimeout: () => 1,
            setInterval: () => 1,
            String, Array, Object, Date, Math, Number, Boolean, RegExp, Error,
            parseInt, parseFloat, JSON,
            btoa: (s) => Buffer.from(s).toString('base64'),
            atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
        };
        this.sandbox.window = this.sandbox;
        this.sandbox.self = this.sandbox;

        vm.createContext(this.sandbox);

        try {
            vm.runInContext(scriptContent, this.sandbox, { timeout: 60000 });
        } catch (e) {
            // Ignore errors, we just need the decoder function
        }

        this.decoder = this.sandbox._0xb4a0;
        
        if (typeof this.decoder !== 'function') {
            throw new Error('Failed to extract decoder function');
        }

        return this;
    }

    /**
     * Decode a string by index
     * @param {number} index - The index to decode
     * @returns {string} The decoded string
     */
    decodeIndex(index) {
        if (!this.decoder) {
            throw new Error('Decoder not initialized');
        }
        return this.decoder(index);
    }

    /**
     * Find the XOR key by trying known index combinations
     * @returns {string} The XOR key
     */
    findXorKey() {
        // Known key index combinations
        const keyIndices = [
            [0xbad, 0xb73],  // Most common
            [0xcba, 0x98a],
            [0x705, 0x939],
        ];

        for (const [idx1, idx2] of keyIndices) {
            try {
                const part1 = this.decodeIndex(idx1);
                const part2 = this.decodeIndex(idx2);
                const key = part1 + part2;
                
                // Validate key looks reasonable
                if (key && key.length >= 10 && /^[a-zA-Z0-9]+$/.test(key)) {
                    return key;
                }
            } catch (e) {
                continue;
            }
        }

        throw new Error('Could not find XOR key');
    }

    /**
     * XOR decode data with a key
     * @param {Buffer|string} data - The data to decode
     * @param {string} key - The XOR key
     * @returns {string} The decoded string
     */
    xorDecode(data, key) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');
        let result = '';
        
        for (let i = 0; i < buffer.length; i++) {
            result += String.fromCharCode(buffer[i] ^ key.charCodeAt(i % key.length));
        }
        
        return result;
    }

    /**
     * Extract and decode the player configuration from HTML
     * @param {string} html - The HTML content
     * @returns {object} The decoded configuration
     */
    extractConfig(html) {
        // Extract encoded data
        const encodedMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
        if (!encodedMatch) {
            throw new Error('Could not find encoded player data');
        }

        const encoded = encodedMatch[1];
        const key = this.findXorKey();
        const decoded = this.xorDecode(encoded, key);

        try {
            return JSON.parse(decoded);
        } catch (e) {
            throw new Error(`Failed to parse decoded config: ${e.message}`);
        }
    }

    /**
     * Extract the ad server configuration from HTML
     * @param {string} html - The HTML content
     * @returns {object} The ad server configuration
     */
    extractAdConfig(html) {
        const match = html.match(/window\['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'\]\s*=\s*(\{[^}]+\});/);
        if (!match) {
            return null;
        }

        try {
            return JSON.parse(match[1].replace(/(\w+):/g, '"$1":'));
        } catch (e) {
            return null;
        }
    }

    /**
     * Get all stream-related decoded strings
     * @returns {object} Categorized stream-related strings
     */
    getStreamStrings() {
        const categories = {
            cdn: [],
            stream: [],
            video: [],
            source: [],
            url: [],
        };

        const keywords = {
            cdn: ['cdn', 'veloce'],
            stream: ['stream', 'm3u8', 'hls', 'playlist'],
            video: ['video', 'player'],
            source: ['source', 'file', 'src'],
            url: ['http', '://'],
        };

        for (let i = 0; i < 0x2000; i++) {
            try {
                const decoded = this.decodeIndex(i);
                if (!decoded || typeof decoded !== 'string') continue;

                const lower = decoded.toLowerCase();
                
                for (const [category, kws] of Object.entries(keywords)) {
                    if (kws.some(kw => lower.includes(kw))) {
                        categories[category].push({ index: i, value: decoded });
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        return categories;
    }
}

// Export for use as module
module.exports = DLHDDecoder;

// CLI usage
if (require.main === module) {
    const fs = require('fs');
    const path = require('path');

    const htmlPath = process.argv[2] || path.join(__dirname, 'dlhd-stream-fresh.html');
    
    if (!fs.existsSync(htmlPath)) {
        console.error(`File not found: ${htmlPath}`);
        process.exit(1);
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const decoder = new DLHDDecoder();

    try {
        decoder.initialize(html);
        console.log('Decoder initialized successfully\n');

        // Extract configurations
        const adConfig = decoder.extractAdConfig(html);
        console.log('Ad Server Config:');
        console.log(JSON.stringify(adConfig, null, 2));

        console.log('\nPlayer Config:');
        const playerConfig = decoder.extractConfig(html);
        console.log(JSON.stringify(playerConfig, null, 2));

        console.log('\nXOR Key:', decoder.findXorKey());

        // Get stream-related strings
        console.log('\nStream-related strings:');
        const streamStrings = decoder.getStreamStrings();
        for (const [category, strings] of Object.entries(streamStrings)) {
            if (strings.length > 0) {
                console.log(`\n${category.toUpperCase()}:`);
                strings.slice(0, 5).forEach(s => {
                    console.log(`  [0x${s.index.toString(16)}] ${s.value}`);
                });
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
