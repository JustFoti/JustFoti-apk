const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('DLHD Runtime Decoder - Loading script...');

// Read the obfuscated DLHD script
const inputFile = path.join(__dirname, 'dlhd-script.js');
let source = fs.readFileSync(inputFile, 'utf8');

// Remove BOM if present
if (source.charCodeAt(0) === 0xFEFF) {
    source = source.slice(1);
}

console.log(`Source file loaded: ${source.length} bytes`);

// Dictionary to store all decoded strings
const decodedStrings = {};
let decoderCallCount = 0;

// Prepare sandbox environment with mocks
const sandbox = {
    window: {},
    document: {
        createElement: () => ({
            style: {},
            setAttribute: () => { },
            addEventListener: () => { },
            appendChild: () => { },
            remove: () => { }
        }),
        getElementById: () => ({}),
        getElementsByTagName: () => ([]),
        querySelectorAll: () => ([]),
        body: { appendChild: () => { }, removeChild: () => { } },
        title: '',
        referrer: '',
        location: { href: 'http://localhost' },
        dispatchEvent: () => { }
    },
    navigator: {
        userAgent: 'Mozilla/5.0',
        platform: 'Win32',
        language: 'en-US',
        sendBeacon: () => true
    },
    location: {
        href: 'http://localhost',
        search: '',
        protocol: 'https:',
        hostname: 'localhost',
        pathname: '/'
    },
    screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1080,
        colorDepth: 24
    },
    console: {
        log: (...args) => console.log('[SCRIPT]', ...args),
        warn: () => { },
        error: (...args) => console.error('[SCRIPT ERROR]', ...args),
        info: () => { },
        table: () => { },
        trace: () => { }
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    String: String,
    Function: Function,
    Array: Array,
    Object: Object,
    Date: Date,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    JSON: JSON,
    RegExp: RegExp,
    Error: Error,
    Number: Number,
    Boolean: Boolean,
    btoa: (s) => Buffer.from(s).toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('utf8'),
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
    URL: function (url) {
        try {
            const parsed = require('url').parse(url);
            return {
                href: url,
                protocol: parsed.protocol,
                host: parsed.host,
                hostname: parsed.hostname,
                pathname: parsed.pathname,
                search: parsed.search || '',
                searchParams: {
                    entries: function* () { }
                },
                toString: () => url
            };
        } catch (e) {
            return { href: url, searchParams: { entries: function* () { } }, toString: () => url };
        }
    },
    localStorage: {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { }
    },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    Request: function () { return { keepalive: true }; },
    CustomEvent: function () { },
    MutationObserver: function () { return { observe: () => { }, disconnect: () => { } }; },
    decodedStrings: decodedStrings, // Expose to sandbox
};

sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.global = sandbox;

// Wrap the source to hook the decoder
const wrappedSource = `
${source}

// Hook into the decoder function after it's defined
if (typeof _0xb4a0 === 'function') {
    const originalDecoder = _0xb4a0;
    global._0xb4a0 = function(_0x447697, _0x51a3a4) {
        const result = originalDecoder.call(this, _0x447697, _0x51a3a4);
        const key = _0x447697 + '|' + _0x51a3a4;
        global.decodedStrings[key] = result;
        return result;
    };
    // Replace the function in the script context
    _0xb4a0 = global._0xb4a0;
    console.log('[DECODER] Hooked into _0xb4a0 function');
}

// Also try to capture the array if available
if (typeof _0x8b05 === 'function') {
    global._0x8b05_array = _0x8b05();
    console.log('[DECODER] Captured _0x8b05 array with ' + global._0x8b05_array.length + ' entries');
}

console.log('[DECODER] Initialization complete');
`;

try {
    console.log('Creating VM context...');
    vm.createContext(sandbox);

    console.log('Running script in sandbox (this may take a while)...');
    vm.runInContext(wrappedSource, sandbox, {
        timeout: 30000, // 30 second timeout
        displayErrors: true
    });

    console.log('\n=== DECODING COMPLETE ===\n');
    console.log(`Captured ${Object.keys(decodedStrings).length} decoded strings`);

    // Save the decoded strings dictionary
    const outputPath = path.join(__dirname, 'dlhd-decoded-dictionary.json');
    fs.writeFileSync(outputPath, JSON.stringify(decodedStrings, null, 2), 'utf8');
    console.log(`\nDecoded dictionary saved to: ${outputPath}`);

    // Generate statistics
    const uniqueValues = new Set(Object.values(decodedStrings));
    console.log(`Unique decoded values: ${uniqueValues.size}`);

    // Show sample decoded strings
    console.log('\n=== SAMPLE DECODED STRINGS ===');
    const samples = Object.entries(decodedStrings).slice(0, 20);
    samples.forEach(([key, value]) => {
        const [index, offset] = key.split('|');
        console.log(`  [${index}, ${offset}] => "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
    });

    // Try to extract the source array
    if (sandbox._0x8b05_array) {
        const arrayPath = path.join(__dirname, 'dlhd-source-array.json');
        fs.writeFileSync(arrayPath, JSON.stringify(sandbox._0x8b05_array, null, 2), 'utf8');
        console.log(`\nSource array saved to: ${arrayPath}`);
        console.log(`Source array contains ${sandbox._0x8b05_array.length} strings`);
    }

    // Generate a deobfuscated version by replacing calls
    console.log('\n=== GENERATING DEOBFUSCATED SCRIPT ===');
    let deobfuscated = source;

    // Replace decoder calls with actual strings
    // Pattern: _0xb4a0(0x...)
    const callPattern = /_0xb4a0\(0x([0-9a-f]+)\)/gi;
    let match;
    let replacements = 0;

    while ((match = callPattern.exec(source)) !== null) {
        const hexIndex = match[1];
        const decIndex = parseInt(hexIndex, 16);

        // Try to find the decoded value
        for (const [key, value] of Object.entries(decodedStrings)) {
            const [index] = key.split('|');
            if (parseInt(index) === decIndex) {
                // Replace with string literal
                const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                deobfuscated = deobfuscated.replace(match[0], `'${escaped}'`);
                replacements++;
                break;
            }
        }
    }

    console.log(`Made ${replacements} replacements`);

    // Save deobfuscated script
    const deobfPath = path.join(__dirname, 'dlhd-script-runtime-deobfuscated.js');
    fs.writeFileSync(deobfPath, deobfuscated, 'utf8');
    console.log(`\nDeobfuscated script saved to: ${deobfPath}`);

    // Search for M3U8 related strings
    console.log('\n=== M3U8 RELATED STRINGS ===');
    const m3u8Strings = Object.entries(decodedStrings)
        .filter(([, value]) =>
            value.toLowerCase().includes('m3u8') ||
            value.toLowerCase().includes('stream') ||
            value.toLowerCase().includes('video') ||
            value.toLowerCase().includes('source') ||
            value.includes('http')
        );

    console.log(`Found ${m3u8Strings.length} potentially relevant strings:`);
    m3u8Strings.slice(0, 10).forEach(([key, value]) => {
        console.log(`  ${key}: "${value.substring(0, 80)}${value.length > 80 ? '...' : ''}"`);
    });

} catch (e) {
    console.error('\n=== ERROR DURING EXECUTION ===');
    console.error(e.message);
    if (e.stack) {
        console.error('\nStack trace:');
        console.error(e.stack);
    }

    // Save what we got so far
    if (Object.keys(decodedStrings).length > 0) {
        const partialPath = path.join(__dirname, 'dlhd-decoded-dictionary-partial.json');
        fs.writeFileSync(partialPath, JSON.stringify(decodedStrings, null, 2), 'utf8');
        console.log(`\nPartial results saved to: ${partialPath}`);
        console.log(`Captured ${Object.keys(decodedStrings).length} strings before error`);
    }
}

console.log('\n=== DECODER FINISHED ===');
