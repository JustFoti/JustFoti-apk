/**
 * DLHD.dad VAST Response Analysis
 * 
 * Analyzes how the VAST XML response is parsed to extract stream URLs
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD VAST Response Analysis\n');
console.log('='.repeat(70));

const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Initialize decoder
const decoder = new DLHDDecoder();
decoder.initialize(html);

// Key indices from the #Zt function analysis
const vastIndices = [
    0x925,  // ads/creatives array?
    0xe29,  // creatives property?
    0x13bf, // find method?
    0x3f7,  // type check value?
    0xc99,  // type property?
    0x229,  // mediaFiles?
    0x1317, // length
    0x13d7, // debug message part 1
    0x1177, // debug message part 2
    0xb9a,  // parseFrom
    0x13d3, // String
    0xb50,  // ?
    0x1052, // text/
    0x99d,  // xml
    0x95c,  // parse method?
    0x702,  // another parse method?
    0x2cd,  // debug message
    0x70d,  // error message part 1
    0x1076, // error message part 2
    0x824,  // error message part 3
    0x1297, // debug message
    0xbba,  // creative property
    0xc0e,  // ghURL / throughURL?
    0x26c,  // mediaFileU
    0xfdc,  // fileURL
    0xe9d,  // ?
    0x9b2,  // ?
];

console.log('VAST-RELATED DECODED INDICES:');
console.log('='.repeat(70));

for (const idx of vastIndices) {
    try {
        const value = decoder.decodeIndex(idx);
        console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ${value}`);
    } catch (e) {
        console.log(`  [0x${idx.toString(16).padStart(4, '0')}] ERROR`);
    }
}

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

// Look for the VAST parser class
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR VAST PARSER');
console.log('='.repeat(70));

// Look for class that has the parse methods (0x95c and 0x702)
const parseMethodPattern = /\[_0x[a-f0-9]+\(0x95c\)\]|\[_0x[a-f0-9]+\(0x702\)\]/g;
const parseMatches = scriptContent.match(parseMethodPattern) || [];
console.log(`\nFound ${parseMatches.length} parse method calls`);

// Get context around parse methods
const parseContext = /.{0,200}(?:0x95c|0x702).{0,300}/g;
const parseContextMatches = scriptContent.match(parseContext) || [];
parseContextMatches.slice(0, 3).forEach((ctx, i) => {
    console.log(`\n--- Parse Context ${i + 1} ---`);
    console.log(ctx);
});

// Look for mediaFileURL extraction
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR mediaFileURL');
console.log('='.repeat(70));

// Search for mediaFileURL in decoded strings
const mediaFileIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && (val.includes('mediaFile') || val.includes('MediaFile'))) {
            mediaFileIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nmediaFile-related strings:');
mediaFileIndices.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
});

// Look for the #Kt function which processes the stream
console.log('\n' + '='.repeat(70));
console.log('ANALYZING #Kt FUNCTION (Stream Processor)');
console.log('='.repeat(70));

// The #Kt function receives {mediaFileURL, clickThroughURL, ad, creative}
const ktPattern = /#Kt\s*\([^)]+\)\s*\{[^}]+\}/g;
const ktMatch = scriptContent.match(ktPattern);
if (ktMatch) {
    console.log('Found #Kt function:');
    console.log(ktMatch[0].substring(0, 1000));
}

// Look for broader context
const ktContext = /.{0,100}#Kt\s*\([^)]+\).{0,1000}/g;
const ktContextMatches = scriptContent.match(ktContext) || [];
ktContextMatches.slice(0, 2).forEach((ctx, i) => {
    console.log(`\n--- #Kt Context ${i + 1} ---`);
    console.log(ctx.substring(0, 800));
});

// Look for how the video element is created and source is set
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR VIDEO ELEMENT CREATION');
console.log('='.repeat(70));

// Look for createElement('video')
const videoCreateIndices = [];
for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && val === 'video') {
            videoCreateIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nvideo element strings:');
videoCreateIndices.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
    
    // Look for usage
    const hexStr = '0x' + p.index.toString(16);
    const usagePattern = new RegExp(`.{0,100}${hexStr}.{0,100}`, 'g');
    const usages = scriptContent.match(usagePattern) || [];
    usages.slice(0, 2).forEach((u, i) => {
        console.log(`    Usage ${i + 1}: ${u.substring(0, 150)}`);
    });
});

// Look for the actual stream URL being set
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR STREAM URL ASSIGNMENT');
console.log('='.repeat(70));

// Look for patterns like video.src = url or .src = mediaFileURL
const srcAssignPattern = /\[_0x[a-f0-9]+\(0x14b\)\]\s*=/g;
const srcAssignMatches = scriptContent.match(srcAssignPattern) || [];
console.log(`\nFound ${srcAssignMatches.length} .src assignments`);

// Get context
const srcContext = /.{0,100}\[_0x[a-f0-9]+\(0x14b\)\]\s*=.{0,200}/g;
const srcContextMatches = scriptContent.match(srcContext) || [];
srcContextMatches.slice(0, 5).forEach((ctx, i) => {
    console.log(`\n--- src Assignment ${i + 1} ---`);
    console.log(ctx);
});

// Look for the VAST response structure
console.log('\n' + '='.repeat(70));
console.log('VAST RESPONSE STRUCTURE');
console.log('='.repeat(70));

// Decode indices that might be VAST element names
const vastElementIndices = [];
const vastElements = ['Ad', 'InLine', 'Wrapper', 'Creative', 'Linear', 'MediaFile', 'MediaFiles', 
                      'Duration', 'TrackingEvents', 'VideoClicks', 'ClickThrough', 'ClickTracking',
                      'Impression', 'Error', 'Extensions', 'AdSystem', 'AdTitle'];

for (let i = 0; i < 0x2000; i++) {
    try {
        const val = decoder.decodeIndex(i);
        if (val && vastElements.some(e => val.toLowerCase().includes(e.toLowerCase()))) {
            vastElementIndices.push({ index: i, value: val });
        }
    } catch (e) {}
}

console.log('\nVAST element strings:');
vastElementIndices.forEach(p => {
    console.log(`  [0x${p.index.toString(16)}] ${p.value}`);
});

// Look for the CDN URL construction
console.log('\n' + '='.repeat(70));
console.log('CDN URL CONSTRUCTION');
console.log('='.repeat(70));

// The stream URL likely uses velocecdn.com or the cdnDomain from config
// Look for how the final stream URL is built

// Search for patterns that combine CDN domain with stream path
const cdnUrlPattern = /.{0,100}velocecdn.{0,200}/gi;
const cdnUrlMatches = scriptContent.match(cdnUrlPattern) || [];
console.log(`\nFound ${cdnUrlMatches.length} velocecdn references`);
cdnUrlMatches.slice(0, 3).forEach((ctx, i) => {
    console.log(`\n--- CDN URL ${i + 1} ---`);
    console.log(ctx);
});

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
