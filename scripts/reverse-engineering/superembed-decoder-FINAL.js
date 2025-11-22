/**
 * Superembed Decoder - Reverse Engineered
 * 
 * This script decodes the double-base64 encoding used by Superembed
 * to obfuscate video source URLs and player URLs.
 */

const Buffer = require('buffer').Buffer;

console.log('=== SUPEREMBED DECODER - REVERSE ENGINEERED ===\n');

// The play parameter from the HTML (line 73)
const playParam = 'S0dhU1FEaUcxTUlhNTdMUFRGb0tTaXFUVStmQnNRdkFNcXFtOWtBaWljR09nQ1JNd210bmdFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09';

console.log('Play Parameter:');
console.log(playParam);
console.log('\n');

// First decode: base64 -> another base64 string
const firstDecode = Buffer.from(playParam, 'base64').toString('utf8');
console.log('First Decode (base64):');
console.log(firstDecode);
console.log('\n');

// Second decode: base64 -> binary/encrypted data
const secondDecode = Buffer.from(firstDecode, 'base64');
console.log('Second Decode (base64 to buffer):');
console.log(secondDecode);
console.log('\n');

// Try as UTF-8
try {
    const utf8 = secondDecode.toString('utf8');
    console.log('As UTF-8:');
    console.log(utf8);
    console.log('\n');
} catch (e) {
    console.log('Cannot decode as UTF-8:', e.message);
}

// Try as hex
console.log('As Hex:');
console.log(secondDecode.toString('hex'));
console.log('\n');

// Analyze the embedded streamingnow.mov URL from line 73
const embeddedUrl = 'https://streamingnow.mov/?play=S0dhU1FEaUcxTUlhNTdMUFRGb0tTaXFUVStmQnNRdkFNcXFtOWtBaWljR09nQ1JNd210bmdFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09';

console.log('=== KEY FINDING ===');
console.log('The actual video source is NOT in the HTML!');
console.log('The flow is:');
console.log('1. vidsrc-embed.ru generates a hash');
console.log('2. cloudnestra.com/rcp/{hash} processes it');
console.log('3. Returns redirect to: streamingnow.mov/?play={double_base64}');
console.log('4. JavaScript must execute on that page to get the real source');
console.log('\n');

console.log('=== SOLUTION ===');
console.log('To extract sources, you must:');
console.log('1. Follow the redirects all the way to streamingnow.mov');
console.log('2. Use Puppeteer to execute JavaScript on that page');
console.log('3. Intercept network requests for M3U8/MP4 URLs');
console.log('4. Or extract from video element src after page loads');
console.log('\n');

console.log('The double-base64 encoding is just obfuscation for the play parameter.');
console.log('The real source listing happens via JavaScript execution on the final domain.');

module.exports = {
    decodePlayParam: (param) => {
        const first = Buffer.from(param, 'base64').toString('utf8');
        const second = Buffer.from(first, 'base64');
        return {
            firstDecode: first,
            secondDecode: second.toString('hex'),
            raw: second
        };
    }
};
