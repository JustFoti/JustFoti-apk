const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dlhd-stream.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

function extractFunction(content, funcName) {
    const startMarker = `function ${funcName}(`;
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return null;

    let braceCount = 0;
    let endIndex = -1;
    let foundBrace = false;

    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            foundBrace = true;
        } else if (content[i] === '}') {
            braceCount--;
        }

        if (foundBrace && braceCount === 0) {
            endIndex = i + 1;
            break;
        }
    }

    if (endIndex !== -1) {
        return content.substring(startIndex, endIndex);
    }
    return null;
}

const configRegex = /window\['ZpQw9XkLmN8c3vR3'\]='(.*?)';/;
const configMatch = htmlContent.match(configRegex);
const configValue = configMatch ? configMatch[1] : null;

const arrayFunc = extractFunction(htmlContent, '_0x8b05');
const decoderFunc = extractFunction(htmlContent, '_0xb4a0');

if (configValue && arrayFunc && decoderFunc) {
    const outputContent = `
const configValue = '${configValue}';

${arrayFunc}

${decoderFunc}

// Helper to decode
const decoder = _0xb4a0;

// Test decoding
console.log('Decoded 0x216:', decoder(0x216));
console.log('Decoded 0x24b:', decoder(0x24b));
console.log('Decoded 0x13fb:', decoder(0x13fb));
console.log('Decoded 0xe35:', decoder(0xe35));
console.log('Decoded 0x44d:', decoder(0x44d));
console.log('Decoded 0x997:', decoder(0x997));
console.log('Decoded 0x15f8:', decoder(0x15f8));

module.exports = { decoder, configValue };
`;

    fs.writeFileSync(path.join(__dirname, 'decoder.js'), outputContent);
    console.log('decoder.js created successfully.');
} else {
    console.log('Extraction failed.');
    console.log('Config found:', !!configValue);
    console.log('Array func found:', !!arrayFunc);
    console.log('Decoder func found:', !!decoderFunc);
}
