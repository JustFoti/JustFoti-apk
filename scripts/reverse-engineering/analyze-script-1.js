const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-1.js');
const source = fs.readFileSync(inputFile, 'utf8');

// Find the definition of the big string
// window['ZpQw9XkLmN8c3vR3']='...'
const keyName = 'ZpQw9XkLmN8c3vR3';
const defRegex = new RegExp(`window\\['${keyName}'\\]\\s*=\\s*'([^']+)'`);
const defMatch = source.match(defRegex);

if (defMatch) {
    console.log("Found string definition.");
    const encryptedString = defMatch[1];
    console.log("String length:", encryptedString.length);

    // Find usage of the key
    // It might be accessed as window['ZpQw9XkLmN8c3vR3'] or window.ZpQw9XkLmN8c3vR3 (unlikely given the name)
    // Or via a variable alias.

    // Search for the key string in the source to find usages
    let pos = source.indexOf(keyName, defMatch.index + defMatch[0].length);
    if (pos !== -1) {
        console.log(`Found usage of key at ${pos}`);
        console.log("Context:", source.substring(pos - 50, pos + 50));
    } else {
        console.log("No direct usage of key found after definition.");
        // Maybe it iterates over window keys?
        // Or maybe it uses the alias 'Et' mentioned by user?
        // Let's look for 'Et'
        const etRegex = /Et\s*=\s*['"]([^'"]+)['"]/;
        const etMatch = source.match(etRegex);
        if (etMatch) {
            console.log("Found Et definition:", etMatch[0]);
            if (etMatch[1] === keyName) {
                console.log("Et aliases the key!");
            }
        }
    }

    // Search for usage of Et as a key
    // It holds the key name "ZpQw9XkLmN8c3vR3"
    // So look for [Et]
    const usageRegex = /\[Et\]/;
    const usageMatch = source.match(usageRegex);
    if (usageMatch) {
        console.log("Found usage of [Et] at", usageMatch.index);
        console.log("Context:", source.substring(usageMatch.index - 100, usageMatch.index + 100));
    } else {
        console.log("No usage of [Et] found.");
    }

} else {
    console.log("Could not find string definition.");
}
