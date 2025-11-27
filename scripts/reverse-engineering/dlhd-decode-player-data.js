/**
 * DLHD.dad Player Data Decoder
 * 
 * Analyzes and decodes the encoded player configuration data
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('DLHD Player Data Decoder\n');

// Read the fresh HTML
const htmlPath = path.join(__dirname, 'dlhd-stream-fresh.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the encoded data
const encodedMatch = html.match(/window\['ZpQw9XkLmN8c3vR3'\]\s*=\s*'([^']+)'/);
if (!encodedMatch) {
    console.error('Could not find encoded player data');
    process.exit(1);
}

const encoded = encodedMatch[1];
console.log('Encoded data:');
console.log(`  Length: ${encoded.length}`);
console.log(`  First 100 chars: ${encoded.substring(0, 100)}`);
console.log(`  Character set analysis:`);

// Analyze character set
const charSet = new Set(encoded.split(''));
console.log(`  Unique characters: ${charSet.size}`);
console.log(`  Characters: ${[...charSet].sort().join('')}`);

// Check if it's base64-like
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const isBase64Like = [...charSet].every(c => base64Chars.includes(c));
console.log(`  Is base64-like: ${isBase64Like}`);

// Try different decoding approaches
console.log('\n' + '='.repeat(60));
console.log('DECODING ATTEMPTS');
console.log('='.repeat(60));

// 1. Standard Base64
console.log('\n1. Standard Base64:');
try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    console.log(`   Result (hex): ${Buffer.from(decoded).toString('hex').substring(0, 100)}`);
    console.log(`   Result (printable): ${decoded.replace(/[^\x20-\x7E]/g, '.').substring(0, 100)}`);
} catch (e) {
    console.log(`   Error: ${e.message}`);
}

// 2. URL-safe Base64
console.log('\n2. URL-safe Base64:');
try {
    const urlSafe = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(urlSafe, 'base64').toString('utf8');
    console.log(`   Result: ${decoded.replace(/[^\x20-\x7E]/g, '.').substring(0, 100)}`);
} catch (e) {
    console.log(`   Error: ${e.message}`);
}

// 3. Custom alphabet substitution (common in obfuscation)
console.log('\n3. Alphabet analysis:');
// The encoded string looks like it might use a custom base64 alphabet
// Let's check the frequency distribution
const freq = {};
for (const c of encoded) {
    freq[c] = (freq[c] || 0) + 1;
}
const sortedFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]);
console.log('   Top 10 most frequent characters:');
sortedFreq.slice(0, 10).forEach(([char, count]) => {
    console.log(`     '${char}': ${count} (${(count/encoded.length*100).toFixed(1)}%)`);
});

// 4. Look for the decoding function in the script
console.log('\n' + '='.repeat(60));
console.log('SEARCHING FOR DECODING FUNCTION');
console.log('='.repeat(60));

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

// Search for references to the encoded data variable
const varName = 'ZpQw9XkLmN8c3vR3';
const varRefs = scriptContent.match(new RegExp(`['"]?${varName}['"]?`, 'g')) || [];
console.log(`\nReferences to '${varName}': ${varRefs.length}`);

// Search for patterns that might decode this data
const decodePatterns = [
    /atob\s*\(/gi,
    /btoa\s*\(/gi,
    /fromCharCode/gi,
    /charCodeAt/gi,
    /split\s*\(\s*['"]['"]?\s*\)/gi,
    /join\s*\(\s*['"]['"]?\s*\)/gi,
    /reverse\s*\(\s*\)/gi,
    /substring|substr|slice/gi,
];

console.log('\nDecoding-related patterns found:');
decodePatterns.forEach(pattern => {
    const matches = scriptContent.match(pattern) || [];
    console.log(`  ${pattern}: ${matches.length} occurrences`);
});

// 5. Try to find and extract the actual decoding logic
console.log('\n' + '='.repeat(60));
console.log('EXTRACTING DECODING LOGIC');
console.log('='.repeat(60));

// Look for the context where ZpQw9XkLmN8c3vR3 is used
const contextPattern = new RegExp(`.{0,200}${varName}.{0,200}`, 'g');
const contexts = scriptContent.match(contextPattern) || [];
console.log(`\nFound ${contexts.length} usage contexts`);

if (contexts.length > 0) {
    console.log('\nFirst context (truncated):');
    console.log(contexts[0].substring(0, 300));
}

// 6. Try XOR decoding with the ad config key
console.log('\n' + '='.repeat(60));
console.log('XOR DECODING ATTEMPTS');
console.log('='.repeat(60));

const adConfigMatch = html.match(/window\['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'\]\s*=\s*(\{[^}]+\});/);
if (adConfigMatch) {
    // Try using parts of the config as XOR key
    const configStr = adConfigMatch[1];
    const potentialKeys = [
        'x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF',
        'ZpQw9XkLmN8c3vR3',
        'wpnxiswpuyrfn',
        'rpyztjadsbonh',
    ];
    
    potentialKeys.forEach(key => {
        // First decode base64, then XOR
        try {
            const b64decoded = Buffer.from(encoded, 'base64');
            let xorResult = '';
            for (let i = 0; i < Math.min(b64decoded.length, 100); i++) {
                xorResult += String.fromCharCode(b64decoded[i] ^ key.charCodeAt(i % key.length));
            }
            const printable = xorResult.replace(/[^\x20-\x7E]/g, '.');
            console.log(`\nXOR with '${key.substring(0, 20)}...':`);
            console.log(`  ${printable}`);
        } catch (e) {}
    });
}

// 7. Try a simple character shift/rotation
console.log('\n' + '='.repeat(60));
console.log('CHARACTER ROTATION ATTEMPTS');
console.log('='.repeat(60));

// ROT13 and similar
for (let shift = 1; shift <= 25; shift++) {
    let result = '';
    for (const c of encoded.substring(0, 50)) {
        const code = c.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            result += String.fromCharCode(((code - 65 + shift) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            result += String.fromCharCode(((code - 97 + shift) % 26) + 97);
        } else {
            result += c;
        }
    }
    // Check if result looks like valid data
    if (result.includes('http') || result.includes('stream') || result.includes('m3u8')) {
        console.log(`\nROT${shift}: ${result}`);
    }
}

// 8. Try to run the actual decoding in the sandbox
console.log('\n' + '='.repeat(60));
console.log('SANDBOX EXECUTION');
console.log('='.repeat(60));

// Create sandbox with the encoded data
const sandbox = {
    window: {},
    document: { 
        createElement: () => ({ style: {} }),
        getElementById: () => null,
    },
    navigator: { userAgent: 'Mozilla/5.0' },
    location: { href: 'https://dlhd.dad/' },
    console: { 
        log: (...args) => console.log('[SANDBOX]', ...args),
        warn: () => {}, 
        error: () => {} 
    },
    setTimeout: () => 1,
    setInterval: () => 1,
    String, Array, Object, Date, Math, Number, Boolean, RegExp, Error,
    parseInt, parseFloat, JSON,
    btoa: (s) => Buffer.from(s).toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
};
sandbox.window = sandbox;
sandbox.self = sandbox;

// Add the window variables
sandbox.window['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'] = JSON.parse(
    adConfigMatch[1].replace(/(\w+):/g, '"$1":')
);
sandbox.window['ZpQw9XkLmN8c3vR3'] = encoded;
sandbox['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'] = sandbox.window['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF'];
sandbox['ZpQw9XkLmN8c3vR3'] = encoded;

vm.createContext(sandbox);

try {
    vm.runInContext(scriptContent, sandbox, { timeout: 60000 });
    
    // Check if any decoded data appeared
    console.log('\nChecking sandbox for decoded data...');
    
    // Look for common player config properties
    const checkProps = ['source', 'file', 'src', 'url', 'stream', 'playlist'];
    for (const prop of checkProps) {
        if (sandbox[prop]) {
            console.log(`  Found ${prop}:`, sandbox[prop]);
        }
        if (sandbox.window[prop]) {
            console.log(`  Found window.${prop}:`, sandbox.window[prop]);
        }
    }
} catch (e) {
    console.log(`Sandbox error: ${e.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('ANALYSIS COMPLETE');
console.log('='.repeat(60));
