/**
 * DLHD.dad URL Decoding - Final Analysis
 * 
 * Decodes all the indices needed to understand URL construction
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD URL Decoding - Final Analysis\n');
console.log('='.repeat(70));

const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Initialize decoder
const decoder = new DLHDDecoder();
decoder.initialize(html);

// Key indices to decode based on our analysis
const indicesToDecode = [
    // CDN domain construction
    0xd00,  // velocecdn.
    0xca,   // second part of CDN domain
    0xc0b,  // cdnDomain
    0x1075, // getCdnDoma
    
    // Video paths
    0x73f,  // /video/sli
    0xfe3,  // der.php
    0x122a, // /video/sel
    0x141c, // ect.php
    
    // URL5 path
    0x2ed,  // /script/su
    0x12e9, // url5.php
    
    // Protocol
    0xc20,  // https:
    0xc91,  // http://
    0x5c2,  // protocol property?
    
    // Ad server
    0x123e, // adserverDo
    0x1341, // main?
    
    // Other potentially useful
    0x9dc,  // first part of default CDN?
    0x1353, // second part?
    0x543,  // location?
    0x578,  // hostname?
    0x106f, // url
    0x429,  // URLHandler
    0xd09,  // ?
    
    // From context analysis
    0x163d, // ?
    0x486,  // &cbcdn=
    0x895,  // ?
    0x88e,  // ?
    0x13fb, // ?
    0xb60,  // ?
    
    // More indices from the script
    0xe17,  // ?
    0x140b, // ?
    0xfd1,  // ?
    0x469,  // ?
    0x509,  // ?
    0x12bb, // ?
    0xb36,  // ?
    0x99c,  // ?
    0x351,  // ?
    0x117,  // ?
    0x15a6, // ?
    0xfb3,  // ?
    0xce9,  // ?
    0x1596, // zIndex
    0x105,  // display
    0x11a,  // ?
    
    // XOR key indices
    0xbad,  // first part of XOR key
    0xb73,  // second part of XOR key
    
    // Additional indices from velocecdn context
    0x1317, // length?
    0xeb1,  // join?
    0x10a7, // charCodeAt?
    0x157f, // stringify?
    0x1b0,  // parse
    0x48c,  // ?
    0x14b,  // ?
];

console.log('DECODED INDICES:');
console.log('='.repeat(70));

const decoded = {};
for (const idx of indicesToDecode) {
    try {
        const value = decoder.decodeIndex(idx);
        decoded[idx] = value;
        console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ${value}`);
    } catch (e) {
        console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ERROR: ${e.message}`);
    }
}

// Now let's reconstruct the URLs
console.log('\n' + '='.repeat(70));
console.log('RECONSTRUCTED URLS:');
console.log('='.repeat(70));

// Default CDN domain
const defaultCdn = (decoded[0x9dc] || '') + (decoded[0x1353] || '');
console.log(`\nDefault CDN: ${defaultCdn}`);

// velocecdn domain
const veloceCdn = (decoded[0xd00] || '') + (decoded[0xca] || '');
console.log(`Veloce CDN: ${veloceCdn}`);

// Video slider path
const videoSlider = (decoded[0x73f] || '') + (decoded[0xfe3] || '');
console.log(`Video Slider: ${videoSlider}`);

// Video select path
const videoSelect = (decoded[0x122a] || '') + (decoded[0x141c] || '');
console.log(`Video Select: ${videoSelect}`);

// Script URL5 path
const scriptUrl5 = (decoded[0x2ed] || '') + (decoded[0x12e9] || '');
console.log(`Script URL5: ${scriptUrl5}`);

// XOR key
const xorKey = (decoded[0xbad] || '') + (decoded[0xb73] || '');
console.log(`XOR Key: ${xorKey}`);

// Look for more patterns in the script
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR STREAM URL PATTERNS IN SCRIPT');
console.log('='.repeat(70));

// Extract the main script
let scriptContent = null;
const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
for (const tag of scriptTags) {
    const content = tag.replace(/<\/?script[^>]*>/gi, '');
    if (content.includes('function _0x8b05')) {
        scriptContent = content;
        break;
    }
}

// Look for the #Ft property (base URL)
console.log('\nSearching for base URL (#Ft) construction...');
const ftPattern = /#Ft\s*=\s*[^;]+/g;
const ftMatches = scriptContent.match(ftPattern) || [];
ftMatches.forEach(m => console.log(`  ${m}`));

// Look for fetch calls to video endpoints
console.log('\nSearching for video endpoint fetch calls...');
const videoFetchPattern = /fetch\s*\([^)]*(?:video|slider|select)[^)]*\)/gi;
const videoFetchMatches = scriptContent.match(videoFetchPattern) || [];
videoFetchMatches.forEach(m => console.log(`  ${m}`));

// Look for the actual stream URL construction
console.log('\nSearching for m3u8/HLS patterns...');
const m3u8Indices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && (val.includes('m3u8') || val.includes('.ts') || val.includes('hls') || val.includes('manifest'))) {
            m3u8Indices.push({ index: i, value: val });
        }
    } catch (e) {}
}
m3u8Indices.forEach(item => {
    console.log(`  [0x${item.index.toString(16)}] ${item.value}`);
});

// Look for WebSocket patterns (live streams often use WebSocket)
console.log('\nSearching for WebSocket patterns...');
const wsIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && (val.includes('ws://') || val.includes('wss://') || val.toLowerCase().includes('websocket'))) {
            wsIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}
wsIndices.forEach(item => {
    console.log(`  [0x${item.index.toString(16)}] ${item.value}`);
});

// Look for the actual player source setting
console.log('\nSearching for player source patterns...');
const sourceIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && (val === 'source' || val === 'src' || val === 'file' || val === 'sources' || val === 'playlist')) {
            sourceIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}
sourceIndices.forEach(item => {
    console.log(`  [0x${item.index.toString(16)}] ${item.value}`);
});

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
