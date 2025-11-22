const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-1.js');
const source = fs.readFileSync(inputFile, 'utf8');

// Key found in analysis
const key = "xR9tB2pL6q7MwVe";
const keyName = 'ZpQw9XkLmN8c3vR3';

// Extract the encrypted string
const defRegex = new RegExp(`window\\['${keyName}'\\]\\s*=\\s*'([^']+)'`);
const defMatch = source.match(defRegex);

if (defMatch) {
    const encryptedString = defMatch[1];
    console.log("Encrypted string length:", encryptedString.length);

    try {
        // Decode logic:
        // ((e,t="xR9tB2pL6q7MwVe")=>[...atob(e)].map((e,i)=>String.fromCharCode(e.charCodeAt(0)^t.charCodeAt(i%t.length))).join(""))(window[Et])

        const decoded = Buffer.from(encryptedString, 'base64').toString('binary').split('').map((char, i) => {
            return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
        }).join('');

        console.log("Decoded content:");
        console.log(decoded);

        // Save to file
        const outputFile = path.join(__dirname, 'decoded-script-1.json');
        fs.writeFileSync(outputFile, decoded);
        console.log(`Saved decoded content to ${outputFile}`);

    } catch (e) {
        console.error("Error decoding:", e);
    }

} else {
    console.error("Could not find encrypted string.");
}
