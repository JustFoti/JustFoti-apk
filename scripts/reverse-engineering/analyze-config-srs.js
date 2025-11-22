const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'extracted-script-re.js');
try {
    const source = fs.readFileSync(inputFile, 'utf8');
    console.log(`Read file size: ${source.length}`);

    // 1. Find getSesionRandomString definition
    // It might be a method on a class.
    const srsRegex = /getSesionRandomString\s*=\s*function|getSesionRandomString\s*\(/;
    const srsMatch = source.match(srsRegex);
    if (srsMatch) {
        console.log(`Found getSesionRandomString definition/call at index ${srsMatch.index}`);
        console.log(source.substring(srsMatch.index - 100, srsMatch.index + 300));
    } else {
        console.log("getSesionRandomString definition not found via regex.");
        // Fallback: simple index search
        const idx = source.indexOf('getSesionRandomString');
        if (idx !== -1) {
            console.log(`Found 'getSesionRandomString' string at ${idx}`);
            console.log(source.substring(idx - 100, idx + 300));
        }
    }

    // 2. Find collectiveZoneConfig
    const czcIdx = source.indexOf('collectiveZoneConfig');
    if (czcIdx !== -1) {
        console.log(`Found 'collectiveZoneConfig' at ${czcIdx}`);
        console.log(source.substring(czcIdx - 100, czcIdx + 300));
    } else {
        console.log("'collectiveZoneConfig' not found.");
    }

    // 3. Find 'new ue' instantiation
    const ueIdx = source.indexOf('new ue');
    if (ueIdx !== -1) {
        console.log(`Found 'new ue' at ${ueIdx}`);
        console.log(source.substring(ueIdx - 100, ueIdx + 300));
    } else {
        console.log("'new ue' not found.");
    }

} catch (e) {
    console.error("Error reading file:", e);
}
