/**
 * DLHD.dad Deep Stream URL Analysis
 * 
 * Traces how getCdnDomain and video paths are used
 */

const fs = require('fs');
const path = require('path');
const DLHDDecoder = require('./dlhd-decoder-module');

console.log('DLHD Deep Stream URL Analysis\n');
console.log('='.repeat(70));

const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Initialize decoder
const decoder = new DLHDDecoder();
decoder.initialize(html);

// Key indices we found
const keyIndices = {
    'velocecdn.': 0xd00,
    'cdnDomain': 0xc0b,
    'getCdnDoma': 0x1075,
    '/video/sli': 0x73f,
    '/video/sel': 0x122a,
    'url5.php': 0x12e9,
    'https:': 0xc20,
    'http://': 0xc91,
};

console.log('KEY DECODED STRINGS:');
console.log('='.repeat(70));
for (const [name, idx] of Object.entries(keyIndices)) {
    const decoded = decoder.decodeIndex(idx);
    console.log(`  [0x${idx.toString(16)}] ${name} => "${decoded}"`);
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

// Search for usage of these key indices in the script
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR KEY INDEX USAGE IN SCRIPT');
console.log('='.repeat(70));

for (const [name, idx] of Object.entries(keyIndices)) {
    const hexStr = '0x' + idx.toString(16);
    const patterns = [
        new RegExp(`\\(${hexStr}\\)`, 'g'),
        new RegExp(`\\[${hexStr}\\]`, 'g'),
    ];
    
    let totalMatches = 0;
    patterns.forEach(p => {
        const matches = scriptContent.match(p) || [];
        totalMatches += matches.length;
    });
    
    if (totalMatches > 0) {
        console.log(`\n${name} (${hexStr}): ${totalMatches} usages`);
        
        // Find context around usage
        const contextPattern = new RegExp(`.{0,100}${hexStr.replace('0x', '0x')}.{0,100}`, 'g');
        const contexts = scriptContent.match(contextPattern) || [];
        contexts.slice(0, 3).forEach((ctx, i) => {
            console.log(`  Context ${i + 1}: ...${ctx.substring(0, 150)}...`);
        });
    }
}

// Look for the getCdnDomain function definition
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR getCdnDomain FUNCTION');
console.log('='.repeat(70));

// The function name is at 0x1075, so look for patterns like:
// function _0xXXXXXX() { ... _0x8b05(0x1075) ... }
// or _0xXXXXXX = function() { ... }

const getCdnPattern = /function\s+(_0x[a-f0-9]+)\s*\([^)]*\)\s*\{[^}]*0x1075[^}]*\}/g;
let match;
while ((match = getCdnPattern.exec(scriptContent)) !== null) {
    console.log(`\nFound function using getCdnDomain:`);
    console.log(`  ${match[0].substring(0, 300)}...`);
}

// Look for cdnDomain property access
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR cdnDomain PROPERTY ACCESS');
console.log('='.repeat(70));

const cdnDomainPattern = /\[_0x[a-f0-9]+\(0xc0b\)\]/g;
const cdnMatches = scriptContent.match(cdnDomainPattern) || [];
console.log(`\nFound ${cdnMatches.length} cdnDomain property accesses`);

// Find context
const cdnContextPattern = /.{0,150}\[_0x[a-f0-9]+\(0xc0b\)\].{0,150}/g;
const cdnContexts = scriptContent.match(cdnContextPattern) || [];
cdnContexts.slice(0, 5).forEach((ctx, i) => {
    console.log(`\nContext ${i + 1}:`);
    console.log(`  ${ctx}`);
});

// Look for velocecdn usage
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR velocecdn USAGE');
console.log('='.repeat(70));

const velocePattern = /.{0,150}0xd00.{0,150}/g;
const veloceContexts = scriptContent.match(velocePattern) || [];
console.log(`\nFound ${veloceContexts.length} velocecdn references`);
veloceContexts.slice(0, 5).forEach((ctx, i) => {
    console.log(`\nContext ${i + 1}:`);
    console.log(`  ${ctx}`);
});

// Look for video path construction
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR VIDEO PATH CONSTRUCTION');
console.log('='.repeat(70));

// /video/sli is at 0x73f, /video/sel is at 0x122a
const videoPathPatterns = [
    /.{0,150}0x73f.{0,150}/g,
    /.{0,150}0x122a.{0,150}/g,
];

videoPathPatterns.forEach((pattern, i) => {
    const contexts = scriptContent.match(pattern) || [];
    console.log(`\nVideo path pattern ${i + 1}: ${contexts.length} matches`);
    contexts.slice(0, 3).forEach((ctx, j) => {
        console.log(`  Context ${j + 1}: ${ctx.substring(0, 200)}`);
    });
});

// Look for URL construction with protocol + domain + path
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR FULL URL CONSTRUCTION');
console.log('='.repeat(70));

// Look for patterns like: 'https://' + domain + '/video/...'
// In obfuscated form: _0x8b05(0xc20) + ... + _0x8b05(0x73f)
const urlConstructPattern = /0xc20[^;]{0,500}0x(73f|122a)/g;
const urlConstructMatches = scriptContent.match(urlConstructPattern) || [];
console.log(`\nFound ${urlConstructMatches.length} potential URL constructions`);
urlConstructMatches.slice(0, 3).forEach((m, i) => {
    console.log(`\n  ${i + 1}. ${m.substring(0, 300)}`);
});

// Look for the stream ID variable
console.log('\n' + '='.repeat(70));
console.log('SEARCHING FOR STREAM ID HANDLING');
console.log('='.repeat(70));

// Look for patterns that might be stream ID
const streamIdPatterns = [
    /stream.*=.*\d+/gi,
    /channel.*=.*\d+/gi,
    /id.*=.*\d+/gi,
];

// Also look for the PHP variable that might contain stream info
const phpVarPattern = /window\['[^']+'\]\s*=\s*\{[^}]+\}/g;
const phpVars = html.match(phpVarPattern) || [];
console.log(`\nFound ${phpVars.length} window variables:`);
phpVars.forEach((v, i) => {
    console.log(`\n  ${i + 1}. ${v.substring(0, 500)}`);
});

// Look for any embedded stream configuration
console.log('\n' + '='.repeat(70));
console.log('EMBEDDED STREAM CONFIGURATION');
console.log('='.repeat(70));

// The XOR-encoded config we found earlier
const xorConfigMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (xorConfigMatch) {
    console.log('\nXOR-encoded config found (first 100 chars):');
    console.log(`  ${xorConfigMatch[1].substring(0, 100)}...`);
    
    // Try to decode it
    const playerConfig = decoder.extractConfig(html);
    console.log('\nDecoded player config:');
    console.log(JSON.stringify(playerConfig, null, 2));
}

// Look for any other encoded data
const base64Pattern = /['"][A-Za-z0-9+/=]{50,}['"]/g;
const base64Matches = html.match(base64Pattern) || [];
console.log(`\nFound ${base64Matches.length} potential base64 encoded strings`);

console.log('\n' + '='.repeat(70));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(70));
