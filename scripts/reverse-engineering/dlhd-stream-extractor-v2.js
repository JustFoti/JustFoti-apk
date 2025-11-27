/**
 * DLHD.dad Stream Extractor v2
 * 
 * Extracts stream URLs from DLHD.dad pages using the decoded obfuscation
 */

const fs = require('fs');
const path = require('path');

class DLHDStreamExtractor {
    constructor() {
        this.decoderFunc = null;
        this.stringArray = null;
        this.config = null;
        this.xorKey = 'xR9tB2pL6q7MwVe';
    }

    /**
     * Initialize the extractor with HTML content
     */
    initialize(html) {
        // Extract the string array
        this.extractStringArray(html);
        
        // Extract configurations
        this.extractConfigs(html);
        
        return this;
    }

    /**
     * Extract the obfuscated string array from the script
     */
    extractStringArray(html) {
        // Find the string array definition
        const arrayMatch = html.match(/var\s+_0x[a-f0-9]+\s*=\s*\[([\s\S]*?)\];/);
        if (!arrayMatch) {
            throw new Error('Could not find string array');
        }

        // Parse the array
        const arrayContent = arrayMatch[1];
        const strings = [];
        const stringPattern = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
        let match;
        while ((match = stringPattern.exec(arrayContent)) !== null) {
            // Decode escape sequences
            let str = match[1]
                .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\')
                .replace(/\\'/g, "'");
            strings.push(str);
        }

        this.stringArray = strings;
        console.log(`Extracted ${strings.length} strings from array`);

        // Find the rotation amount
        const rotateMatch = html.match(/while\s*\(!!\[\]\)\s*\{[^}]*push\s*\(\s*[^)]*shift\s*\(\s*\)/);
        if (rotateMatch) {
            // Find the target value for rotation
            const targetMatch = html.match(/===\s*(0x[a-f0-9]+|[\d]+)\s*\)/);
            if (targetMatch) {
                const target = parseInt(targetMatch[1]);
                this.rotateArray(target);
            }
        }
    }

    /**
     * Rotate the string array to match the decoder
     */
    rotateArray(target) {
        // This is a simplified rotation - the actual rotation depends on the specific obfuscation
        // For now, we'll try to find the correct rotation by checking known values
        const knownValues = {
            0xd00: 'velocecdn.',
            0xc0b: 'cdnDomain',
            0x925: 'ads',
        };

        // Try different rotations
        for (let rotation = 0; rotation < this.stringArray.length; rotation++) {
            let matches = 0;
            for (const [idx, expected] of Object.entries(knownValues)) {
                const actualIdx = (parseInt(idx) - 0x8b + rotation) % this.stringArray.length;
                if (actualIdx >= 0 && actualIdx < this.stringArray.length) {
                    if (this.stringArray[actualIdx] === expected) {
                        matches++;
                    }
                }
            }
            if (matches >= 2) {
                console.log(`Found rotation: ${rotation}`);
                // Apply rotation
                const rotated = this.stringArray.slice(rotation).concat(this.stringArray.slice(0, rotation));
                this.stringArray = rotated;
                break;
            }
        }
    }

    /**
     * Decode a string by index
     */
    decodeIndex(index) {
        // The actual index calculation depends on the obfuscation
        // This is a simplified version
        const baseOffset = 0x8b; // Common offset
        const actualIndex = index - baseOffset;
        
        if (actualIndex >= 0 && actualIndex < this.stringArray.length) {
            return this.stringArray[actualIndex];
        }
        return null;
    }

    /**
     * Extract configurations from the HTML
     */
    extractConfigs(html) {
        this.config = {};

        // Extract plain JSON config
        const plainConfigMatch = html.match(/window\['[A-Za-z0-9]+'\]\s*=\s*(\{[^}]+\})/);
        if (plainConfigMatch) {
            try {
                this.config.plain = JSON.parse(plainConfigMatch[1]);
                console.log('Extracted plain config');
            } catch (e) {
                console.log('Failed to parse plain config');
            }
        }

        // Extract XOR-encoded config
        const xorConfigMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
        if (xorConfigMatch) {
            try {
                this.config.xor = this.decodeXorConfig(xorConfigMatch[1]);
                console.log('Extracted XOR config');
            } catch (e) {
                console.log('Failed to decode XOR config:', e.message);
            }
        }

        // Merge configs
        this.config.merged = { ...this.config.plain, ...this.config.xor };
    }

    /**
     * Decode XOR-encoded configuration
     */
    decodeXorConfig(encoded) {
        const decoded = [...atob(encoded)]
            .map((char, i) => String.fromCharCode(
                char.charCodeAt(0) ^ this.xorKey.charCodeAt(i % this.xorKey.length)
            ))
            .join('');
        
        return JSON.parse(decoded);
    }

    /**
     * Build the VAST request URL
     */
    buildVastUrl() {
        const config = this.config.merged;
        
        if (!config || !config.adserverDomain) {
            throw new Error('No adserver domain in config');
        }

        let url = `https://${config.adserverDomain}/video/select.php`;
        
        // Add parameters
        const params = new URLSearchParams();
        
        if (config.zoneId) {
            params.append('r', config.zoneId);
        }
        
        if (config.sub1) {
            params.append('sub1', config.sub1);
        }
        
        params.append('atv', '72.0');
        params.append('ts', Date.now().toString());

        return url + '?' + params.toString();
    }

    /**
     * Get the CDN domain
     */
    getCdnDomain() {
        return this.config.merged?.cdnDomain || 'velocecdn.com';
    }

    /**
     * Get stream info
     */
    getStreamInfo() {
        return {
            cdnDomain: this.getCdnDomain(),
            adserverDomain: this.config.merged?.adserverDomain,
            vastUrl: this.buildVastUrl(),
            config: this.config.merged,
        };
    }
}

// Main execution
async function main() {
    console.log('DLHD Stream Extractor v2\n');
    console.log('='.repeat(60));

    const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
    
    if (!fs.existsSync(htmlPath)) {
        console.error('HTML file not found:', htmlPath);
        return;
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    
    const extractor = new DLHDStreamExtractor();
    
    try {
        extractor.initialize(html);
        
        console.log('\n' + '='.repeat(60));
        console.log('STREAM INFO');
        console.log('='.repeat(60));
        
        const info = extractor.getStreamInfo();
        
        console.log('\nCDN Domain:', info.cdnDomain);
        console.log('Ad Server Domain:', info.adserverDomain);
        console.log('\nVAST URL:', info.vastUrl);
        
        console.log('\nFull Config:');
        console.log(JSON.stringify(info.config, null, 2));
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

// Export for use as module
module.exports = DLHDStreamExtractor;

// Run if executed directly
if (require.main === module) {
    main();
}
