/**
 * Superembed Source Analysis Script
 * 
 * This script analyzes the captured srcrcp page to extract video source listings
 * and decode the obfuscated data from Superembed.
 */

const fs = require('fs');
const path = require('path');

// Read the captured HTML
const htmlPath = path.join(__dirname, 'debug-srcrcp-550.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== Analyzing Superembed Source Listing Mechanism ===\n');

// Extract btoa encoded strings
const btoaPattern = /btoa\("([^"]+)"\)/g;
let match;
const encodedStrings = [];

while ((match = btoaPattern.exec(html)) !== null) {
    encodedStrings.push(match[1]);
}

console.log(`Found ${encodedStrings.length} btoa() encoded strings:\n`);
encodedStrings.forEach((str, i) => {
    console.log(`${i + 1}. ${str.substring(0, 100)}${str.length > 100 ? '...' : ''}`);
});

// Look for base64 strings (the "play=" parameter value)
const playParamPattern = /play=([A-Za-z0-9+/=]+)/g;
const playParams = [];

while ((match = playParamPattern.exec(html)) !== null) {
    playParams.push(match[1]);
}

console.log(`\n\nFound ${playParams.length} play= parameters:\n`);
playParams.forEach((param, i) => {
    console.log(`${i + 1}. ${param.substring(0, 80)}...`);

    // Try to decode it
    try {
        const decoded = Buffer.from(param, 'base64').toString('utf8');
        console.log(`   Decoded (Base64): ${decoded.substring(0, 100)}${decoded.length > 100 ? '...' : ''}\n`);

        // Check if it's double-encoded
        if (/^[A-Za-z0-9+/=]+$/.test(decoded)) {
            try {
                const decoded2 = Buffer.from(decoded, 'base64').toString('utf8');
                console.log(`   Decoded (Double Base64): ${decoded2.substring(0, 100)}${decoded2.length > 100 ? '...' : ''}\n`);
            } catch (e) {
                // Not double encoded
            }
        }
    } catch (e) {
        console.log(`   Failed to decode: ${e.message}\n`);
    }
});

// Extract all variables assigned in the page
const varPattern = /var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:btoa\()?["']([^"']+)["']\)?/g;
const variables = {};

while ((match = varPattern.exec(html)) !== null) {
    variables[match[1]] = match[2];
}

console.log('\n\nExtracted Variables:');
Object.entries(variables).forEach(([name, value]) => {
    console.log(`  ${name} = ${value.substring(0, 80)}${value.length > 80 ? '...' : ''}`);

    // Try to decode if it looks like base64
    if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0) {
        try {
            const decoded = Buffer.from(value, 'base64').toString('utf8');
            console.log(`    -> Decoded: ${decoded}`);
        } catch (e) {
            //  Ignore
        }
    }
});

// Look for function calls and patterns that might indicate video source loading
const patterns = [
    /\.src\s*=\s*["']([^"']+)["']/g,
    /\.setAttribute\s*\(\s*["']src["']\s*,\s*["']([^"']+)["']/g,
    /location\.href\s*=\s*["']([^"']+)["']/g,
    /window\.location\s*=\s*["']([^"']+)["']/g,
];

console.log('\n\n=== Potential Source URLs ===\n');
patterns.forEach(pattern => {
    while ((match = pattern.exec(html)) !== null) {
        console.log(`  ${match[1]}`);
    }
});

console.log('\n\n=== Key Findings ===\n');
console.log('1. The page uses heavy obfuscation with base64 encoding');
console.log('2. The "play=" parameter contains a base64-encoded hash/ID');
console.log('3. This redirects to streamingnow.mov domain');
console.log('4. The actual video source is not directly embedded in this HTML');
console.log('5. Further JavaScript execution is required to reveal the source');

console.log('\n\n=== Next Steps ===\n');
console.log('1. Decode the play= parameter to understand the hashing mechanism');
console.log('2. Use Puppeteer to execute the JavaScript and capture the final video source');
console.log('3. Intercept network requests to find where the actual m3u8/mp4 is loaded from');
