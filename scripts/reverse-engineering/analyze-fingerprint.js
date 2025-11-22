const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-re.js');
const source = fs.readFileSync(inputFile, 'utf8');

// Find P() definition
const pRegex = /P=\(\)=>(.*?)(,U=|$)/;
const pMatch = source.match(pRegex);
if (pMatch) {
    console.log("Found P():", pMatch[0].substring(0, 200));
} else {
    console.log("P() not found via regex.");
}

// Find getSesionRandomString definition
// It's likely on the 's' object (window[adcashGlobalName])
// We need to find where 's' is defined or what class it is.
// Searching for 'getSesionRandomString' in the file might show its usage or definition if it's a class method.
const srsIndex = source.indexOf('getSesionRandomString');
if (srsIndex !== -1) {
    console.log("Found getSesionRandomString usage at:", srsIndex);
    console.log(source.substring(srsIndex - 100, srsIndex + 100));
}

// Find where 's' is initialized.
// Look for "this.#s=window[e.adcashGlobalName]"
const sInitIndex = source.indexOf('this.#s=window[e.adcashGlobalName]');
if (sInitIndex !== -1) {
    console.log("Found 's' initialization at:", sInitIndex);
    console.log(source.substring(sInitIndex - 100, sInitIndex + 100));
}
