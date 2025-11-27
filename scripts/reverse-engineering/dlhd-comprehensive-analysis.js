/**
 * DLHD.dad Comprehensive Stream Analysis
 * 
 * This script analyzes the dlhd.dad streaming page to understand:
 * 1. How streams are loaded from 3rd party CDNs
 * 2. The obfuscation/encoding mechanisms used
 * 3. The player initialization flow
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('='.repeat(60));
console.log('DLHD.dad Stream Analysis');
console.log('='.repeat(60));

// Read the fresh HTML
const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
if (!fs.existsSync(htmlPath)) {
    console.error('Error: dlhd-stream-fresh.html not found. Run fetch-dlhd.js first.');
    process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
console.log(`\nLoaded HTML: ${html.length} bytes`);

// Extract key window variables
console.log('\n' + '='.repeat(60));
console.log('1. WINDOW CONFIGURATION VARIABLES');
console.log('='.repeat(60));

// Ad server config
const adConfigMatch = html.match(/window\['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'\]\s*=\s*(\{[^}]+\});/);
if (adConfigMatch) {
    try {
        const config = JSON.parse(adConfigMatch[1].replace(/(\w+):/g, '"$1":'));
        console.log('\nAd Server Configuration:');
        console.log(JSON.stringify(config, null, 2));
    } catch (e) {
        console.log('\nAd Config (raw):', adConfigMatch[1]);
    }
}

// Encoded player data
const encodedDataMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (encodedDataMatch) {
    const encoded = encodedDataMatch[1];
    console.log('\nEncoded Player Data:');
    console.log(`  Length: ${encoded.length} chars`);
    console.log(`  First 100: ${encoded.substring(0, 100)}`);
    
    // Try base64 decode
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        console.log(`\n  Base64 Decoded (first 200 chars):`);
        console.log(`  ${decoded.substring(0, 200)}`);
    } catch (e) {
        console.log('  Not valid base64');
    }
}

// Extract all script tags
console.log('\n' + '='.repeat(60));
console.log('2. SCRIPT ANALYSIS');
console.log('='.repeat(60));

const scriptTags = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
console.log(`\nFound ${scriptTags.length} script tags`);

scriptTags.forEach((script, i) => {
    const srcMatch = script.match(/src=["']([^"']+)["']/);
    const content = script.replace(/<\/?script[^>]*>/gi, '').trim();
    
    if (srcMatch) {
        console.log(`\n[Script ${i + 1}] External: ${srcMatch[1]}`);
    } else if (content.length > 0) {
        console.log(`\n[Script ${i + 1}] Inline: ${content.length} chars`);
        
        // Check for interesting patterns
        if (content.includes('_0x')) {
            console.log('  - Contains obfuscated code (_0x pattern)');
        }
        if (content.includes('jwplayer') || content.includes('JWPlayer')) {
            console.log('  - Contains JWPlayer references');
        }
        if (content.includes('clappr') || content.includes('Clappr')) {
            console.log('  - Contains Clappr player references');
        }
        if (content.includes('m3u8')) {
            console.log('  - Contains m3u8 references');
        }
        if (content.includes('hls') || content.includes('HLS')) {
            console.log('  - Contains HLS references');
        }
        if (content.includes('velocecdn') || content.includes('cdn')) {
            console.log('  - Contains CDN references');
        }
    }
});

// Extract the main obfuscated script
console.log('\n' + '='.repeat(60));
console.log('3. OBFUSCATED SCRIPT EXTRACTION');
console.log('='.repeat(60));

const mainScriptMatch = html.match(/function _0x8b05\(\)\{[\s\S]+/);
if (mainScriptMatch) {
    const mainScript = mainScriptMatch[0];
    console.log(`\nMain obfuscated script: ${mainScript.length} chars`);
    
    // Extract the string array
    const arrayMatch = mainScript.match(/const _0x[a-f0-9]+\s*=\s*\[([\s\S]+?)\];/);
    if (arrayMatch) {
        const strings = arrayMatch[1].match(/'[^']*'/g) || [];
        console.log(`\nString array contains ${strings.length} entries`);
        
        // Look for interesting strings
        const interesting = strings.filter(s => {
            const lower = s.toLowerCase();
            return lower.includes('m3u8') || 
                   lower.includes('stream') || 
                   lower.includes('cdn') ||
                   lower.includes('http') ||
                   lower.includes('video') ||
                   lower.includes('player') ||
                   lower.includes('source') ||
                   lower.includes('hls') ||
                   lower.includes('veloce');
        });
        
        if (interesting.length > 0) {
            console.log(`\nInteresting strings found (${interesting.length}):`);
            interesting.slice(0, 20).forEach(s => console.log(`  ${s}`));
        }
    }
}

// Look for CDN/stream URL patterns
console.log('\n' + '='.repeat(60));
console.log('4. CDN AND STREAM URL PATTERNS');
console.log('='.repeat(60));

const urlPatterns = [
    /https?:\/\/[^\s'"<>]+\.m3u8[^\s'"<>]*/gi,
    /https?:\/\/[^\s'"<>]*cdn[^\s'"<>]*/gi,
    /https?:\/\/[^\s'"<>]*stream[^\s'"<>]*/gi,
    /https?:\/\/[^\s'"<>]*veloce[^\s'"<>]*/gi,
    /https?:\/\/[^\s'"<>]*live[^\s'"<>]*/gi,
];

urlPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
        console.log(`\nPattern ${pattern}:`);
        [...new Set(matches)].forEach(m => console.log(`  ${m}`));
    }
});

// Look for domain references
const domainPatterns = [
    /velocecdn\.[a-z]+/gi,
    /[a-z0-9-]+\.icu/gi,
    /[a-z0-9-]+\.store/gi,
    /[a-z0-9-]+\.live/gi,
];

console.log('\nDomain references:');
domainPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
        [...new Set(matches)].forEach(m => console.log(`  ${m}`));
    }
});

// Extract and analyze the decoder function
console.log('\n' + '='.repeat(60));
console.log('5. DECODER FUNCTION ANALYSIS');
console.log('='.repeat(60));

// Find the decoder function pattern
const decoderMatch = html.match(/function _0xb4a0\s*\([^)]*\)\s*\{[\s\S]+?return _0xb4a0\([^)]+\);?\s*\}/);
if (decoderMatch) {
    console.log('\nDecoder function found');
    console.log(`Length: ${decoderMatch[0].length} chars`);
    
    // Look for the rotation/shuffle logic
    if (decoderMatch[0].includes('push') && decoderMatch[0].includes('shift')) {
        console.log('Contains array rotation logic (push/shift)');
    }
}

// Look for player initialization
console.log('\n' + '='.repeat(60));
console.log('6. PLAYER INITIALIZATION');
console.log('='.repeat(60));

const playerPatterns = [
    /jwplayer\s*\([^)]*\)\s*\.setup\s*\(/gi,
    /new\s+Clappr\.Player\s*\(/gi,
    /Hls\s*\(\s*\)/gi,
    /videojs\s*\(/gi,
    /player\s*\.\s*setup\s*\(/gi,
    /player\s*\.\s*load\s*\(/gi,
];

playerPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
        console.log(`\nPattern ${pattern}: ${matches.length} matches`);
    }
});

// Look for source/file configuration
const sourcePatterns = [
    /file\s*:\s*['"][^'"]+['"]/gi,
    /source\s*:\s*['"][^'"]+['"]/gi,
    /src\s*:\s*['"][^'"]+['"]/gi,
    /sources\s*:\s*\[/gi,
];

sourcePatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
        console.log(`\nSource pattern ${pattern}:`);
        matches.slice(0, 5).forEach(m => console.log(`  ${m}`));
    }
});

// Save extracted data for further analysis
console.log('\n' + '='.repeat(60));
console.log('7. SAVING EXTRACTED DATA');
console.log('='.repeat(60));

const extractedData = {
    timestamp: new Date().toISOString(),
    htmlLength: html.length,
    scriptCount: scriptTags.length,
    adConfig: adConfigMatch ? adConfigMatch[1] : null,
    encodedData: encodedDataMatch ? encodedDataMatch[1] : null,
};

const outputPath = path.join(__dirname, 'dlhd-analysis-output.json');
fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));
console.log(`\nAnalysis saved to: ${outputPath}`);

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));

