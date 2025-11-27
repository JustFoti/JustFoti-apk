const fs = require('fs');
const path = require('path');

console.log('DLHD Static Decoder - Extracting decoder components...\n');

// Read the obfuscated DLHD script
const inputFile = path.join(__dirname, 'dlhd-script.js');
let source = fs.readFileSync(inputFile, 'utf8');

// Remove BOM if present
if (source.charCodeAt(0) === 0xFEFF) {
    source = source.slice(1);
}

console.log(`Source file loaded: ${source.length} bytes`);

// Extract the array function _0x8b05
const arrayMatch = source.match(/function _0x8b05\(\)\{const _0x[a-f0-9]+=\[([^\]]+)\];/);
if (!arrayMatch) {
    console.error('Could not find _0x8b05 array definition');
    process.exit(1);
}

// Extract just the array content
const arrayContentMatch = source.match(/function _0x8b05\(\)\{const _0x[a-f0-9]+=(\[[^\[]*?\]);_0x8b05=function/s);
if (!arrayContentMatch) {
    console.error('Could not extract array content');
    process.exit(1);
}

const arrayContent = arrayContentMatch[1];
console.log('Extracted _0x8b05 array content');

// Extract the decoder function _0xb4a0
const decoderMatch = source.match(/function _0xb4a0\(_0x[a-f0-9]+,_0x[a-f0-9]+\)\{[\s\S]+?return _0xb4a0;}\(_0x[a-f0-9]+,_0x[a-f0-9]+\);/);
if (!decoderMatch) {
    console.error('Could not find _0xb4a0 decoder function');
    process.exit(1);
}

const decoderFunc = decoderMatch[0];
console.log('Extracted _0xb4a0 decoder function\n');

// Create standalone decoder script
const standaloneDecoder = `
// Standalone DLHD Decoder
${decoderFunc}

// Export the decoder to test
if (typeof module !== 'undefined') {
    module.exports = { _0xb4a0 };
}

// Test decoder
console.log('Testing decoder...');
try {
    // Test a few common indices
    console.log('_0xb4a0(0x8e):', _0xb4a0(0x8e));
    console.log('_0xb4a0(0x2ee):', _0xb4a0(0x2ee));
    console.log('_0xb4a0(0x100):', _0xb4a0(0x100));
} catch (e) {
    console.error('Decoder test failed:', e.message);
}
`;

// Save standalone decoder
const decoderPath = path.join(__dirname, 'dlhd-standalone-decoder.js');
fs.writeFileSync(decoderPath, standaloneDecoder, 'utf8');
console.log(`Standalone decoder saved to: ${decoderPath}`);

// Create decoder extraction script
const extractorScript = `
const fs = require('fs');
const path = require('path');

// Load and execute the standalone decoder
${decoderFunc}

console.log('Decoder loaded successfully\\n');
console.log('=== DECODING ALL POSSIBLE INDICES ===\\n');

const decodedMap = {};
let successCount = 0;
let failCount = 0;

// Try to decode a range of indices
// The obfuscation typically uses hex indices from 0x8e to around 0x1700
console.log('Decoding indices from 0x8e to 0x1700...');

for (let i = 0x8e; i <= 0x1700; i++) {
    try {
        const decoded = _0xb4a0(i);
        if (decoded && typeof decoded === 'string') {
            const hexIndex = '0x' + i.toString(16);
            decodedMap[hexIndex] = decoded;
            successCount++;
            
            // Log samples
            if (successCount <= 10 || successCount % 100 === 0) {
                console.log(\`  [\${hexIndex}] => "\${decoded.substring(0, 50)}\${decoded.length > 50 ? '...' : ''}"\`);
            }
        }
    } catch (e) {
        failCount++;
    }
}

console.log(\`\\nDecoding complete: \${successCount} successful, \${failCount} failed\`);

// Save the decoded map
const outputPath = path.join(__dirname, 'dlhd-decoded-map.json');
fs.writeFileSync(outputPath, JSON.stringify(decodedMap, null, 2), 'utf8');
console.log(\`\\nDecoded map saved to: \${outputPath}\`);

// Generate deobfuscated script
console.log('\\n=== GENERATING DEOBFUSCATED SCRIPT ===\\n');

const source = fs.readFileSync(path.join(__dirname, 'dlhd-script.js'), 'utf8');
let deobfuscated = source;
let replacements = 0;

// Replace all decoder calls with actual strings
for (const [hexIndex, value] of Object.entries(decodedMap)) {
    const pattern = new RegExp(\`_0xb4a0\\\\(\${hexIndex}\\\\)\`, 'g');
    const matches = (source.match(pattern) || []).length;
    
    if (matches > 0) {
        // Escape the string properly for JavaScript
        const escaped = value
            .replace(/\\\\/g, '\\\\\\\\')
            .replace(/'/g, "\\\\'")
            .replace(/\\n/g, '\\\\n')
            .replace(/\\r/g, '\\\\r')
            .replace(/\\t/g, '\\\\t');
        
        deobfuscated = deobfuscated.replace(pattern, \`'\${escaped}'\`);
        replacements += matches;
    }
}

console.log(\`Made \${replacements} replacements\`);

// Save deobfuscated script
const deobfPath = path.join(__dirname, 'dl hd-fully-deobfuscated.js');
fs.writeFileSync(deobfPath, deobfuscated, 'utf8');
console.log(\`Deobfuscated script saved to: \${deobfPath}\`);

// Find M3U8 and video-related strings
console.log('\\n=== SEARCHING FOR M3U8/VIDEO PATTERNS ===\\n');

const keywords = ['m3u8', 'stream', 'video', 'source', 'player', 'cdn', 'http', 'blob', 'jwplayer'];
const relevantStrings = {};

for (const [index, value] of Object.entries(decodedMap)) {
    const lowerValue = value.toLowerCase();
    for (const keyword of keywords) {
        if (lowerValue.includes(keyword)) {
            if (!relevantStrings[keyword]) {
                relevantStrings[keyword] = [];
            }
            relevantStrings[keyword].push({ index, value });
        }
    }
}

console.log('\\nFound relevant strings by keyword:');
for (const [keyword, strings] of Object.entries(relevantStrings)) {
    console.log(\`\\n\${keyword.toUpperCase()} (\${strings.length} matches):\`);
    strings.slice(0, 5).forEach(({ index, value }) => {
        console.log(\`  [\${index}] "\${value.substring(0, 80)}\${value.length > 80 ? '...' : ''}"\`);
    });
    if (strings.length > 5) {
        console.log(\`  ... and \${strings.length - 5} more\`);
    }
}

// Save relevant strings
const relevantPath = path.join(__dirname, 'dlhd-relevant-strings.json');
fs.writeFileSync(relevantPath, JSON.stringify(relevantStrings, null, 2), 'utf8');
console.log(\`\\nRelevant strings saved to: \${relevantPath}\`);

console.log('\\n=== EXTRACTION COMPLETE ===');
`;

// Save extractor script
const extractorPath = path.join(__dirname, 'dlhd-extract-all.js');
fs.writeFileSync(extractorPath, extractorScript, 'utf8');
console.log(`Extractor script saved to: ${extractorPath}\n`);

console.log('=== SETUP COMPLETE ===');
console.log('\nTo run the full extraction, execute:');
console.log(`  node ${path.basename(extractorPath)}\n`);
