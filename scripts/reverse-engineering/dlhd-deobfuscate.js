// DLHD Video Player Deobfuscation Script
// This script extracts and analyzes the M3U8 generation logic from dlhd-stream.html

const fs = require('fs');
const path = require('path');

// Read the HTML file
const htmlPath = path.join(__dirname, 'dlhd-stream.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract the obfuscated JavaScript section
const scriptMatch = htmlContent.match(/function _0x8b05\(\)\{[\s\S]+?\}\(\)\)\);/);
if (!scriptMatch) {
    console.error('Could not find obfuscated script section');
    process.exit(1);
}

const obfuscatedScript = scriptMatch[0];

// Extract the dictionary array
const dictionaryMatch = obfuscatedScript.match(/const _0x21580f=\[([\s\S]+?)\];/);
if (!dictionaryMatch) {
    console.error('Could not find dictionary array');
    process.exit(1);
}

// Parse the dictionary
const dictionaryContent = dictionaryMatch[1];
const dictionaryEntries = dictionaryContent.match(/'[^']*'/g);
console.log(`Found ${dictionaryEntries.length} dictionary entries\n`);

// Extract the decoder function
const decoderMatch = obfuscatedScript.match(/function _0xb4a0[\s\S]+?return _0xb4a0\(_0x447697,_0x51a3a4\);/);
if (!decoderMatch) {
    console.log('Warning: Could not extract decoder function, continuing...\n');
} else {
    console.log('Decoder function extracted\n');
}

// Extract window config variables
const configMatch = htmlContent.match(/window\['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'\]=(\{[^}]+\});/);
if (configMatch) {
    console.log('=== Ad Server Configuration ===');
    const adConfig = JSON.parse(configMatch[1].replace(/(\w+):/g, '"$1":'));
    console.log(JSON.stringify(adConfig, null, 2));
    console.log();
}

const encodedDataMatch = htmlContent.match(/window\['ZpQw9XkLmN8c3vR3'\]='([^']+)';/);
if (encodedDataMatch) {
    console.log('=== Encoded Player Config ===');
    const encodedData = encodedDataMatch[1];
    console.log('Length:', encodedData.length);
    console.log('First 100 chars:', encodedData.substring(0, 100));
    console.log('Last 100 chars:', encodedData.substring(encodedData.length - 100));

    // Try to decode as base64
    try {
        const decoded = Buffer.from(encodedData, 'base64').toString('utf8');
        console.log('\n=== Base64 Decoded (first 500 chars) ===');
        console.log(decoded.substring(0, 500));
    } catch (e) {
        console.log('Not valid base64');
    }
    console.log();
}

// Look for patterns that might indicate M3U8 generation
console.log('=== Searching for M3U8 Related Patterns ===\n');

const patterns = [
    /\.m3u8/gi,
    /playlist/gi,
    /master\.m3u8/gi,
    /stream/gi,
    /video/gi,
    /source/gi,
    /hls/gi,
    /segment/gi,
    /manifest/gi
];

patterns.forEach(pattern => {
    const matches = obfuscatedScript.match(pattern);
    if (matches && matches.length > 0) {
        console.log(`Pattern "${pattern}": Found ${matches.length} matches`);
    }
});

// Try to find URL construction patterns
const urlPatterns = [
    /https?:\/\/[^'"]+/gi,
    /protocol/gi,
    /hostname/gi,
    /pathname/gi
];

console.log('\n=== URL Construction Patterns ===\n');
urlPatterns.forEach(pattern => {
    const matches = obfuscatedScript.match(pattern);
    if (matches && matches.length > 0) {
        console.log(`Pattern "${pattern}": Found ${matches.length} matches`);
        if (pattern.toString().includes('http')) {
            matches.slice(0, 3).forEach(match => {
                console.log('  -', match);
            });
        }
    }
});

// Save dictionary to file for manual inspection
const dictionaryOutput = dictionaryEntries.map((entry, index) => {
    return `${index}: ${entry}`;
}).join('\n');

fs.writeFileSync(
    path.join(__dirname, 'dlhd-dictionary.txt'),
    dictionaryOutput,
    'utf8'
);

console.log('\n✓ Dictionary saved to dlhd-dictionary.txt');

// Save full obfuscated script for inspection
fs.writeFileSync(
    path.join(__dirname, 'dlhd-obfuscated-full.js'),
    obfuscatedScript,
    'utf8'
);

console.log('✓ Full obfuscated script saved to dlhd-obfuscated-full.js');
