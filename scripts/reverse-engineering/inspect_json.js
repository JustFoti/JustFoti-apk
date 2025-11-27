const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');

const scriptPath = path.join(__dirname, 'deobfuscated-player.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <script>
        window.supsup = { ntation: 'https:' };
        window.x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF = {
            adserverDomain: 'example.com',
            selPath: '/path'
        };
        window.ZpQw9XkLmN8c3vR3 = "DUMMY_ENCRYPTED_STRING";
    </script>
</head>
<body>
    <p>Hello world</p>
    <script>
        ${scriptContent}
    </script>
</body>
</html>
`, {
    url: "https://dlhd.dad/stream/stream-123.php",
    referrer: "https://dlhd.dad/",
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000,
    runScripts: "dangerously",
    resources: "usable"
});

const window = dom.window;

setTimeout(() => {
    console.log('Script executed.');

    // Inspect JSON
    console.log('JSON keys:', Object.keys(window.JSON));
    console.log('JSON property names:', Object.getOwnPropertyNames(window.JSON));

    // Check for specific properties seen in code
    // JSON['. current '] -> likely parse
    // JSON['ound"/>...'] -> likely decode

    // We can iterate over JSON properties and print their values (if functions)
    for (const key of Object.getOwnPropertyNames(window.JSON)) {
        try {
            const val = window.JSON[key];
            console.log(`JSON['${key}'] type: ${typeof val}`);
            if (typeof val === 'function') {
                console.log(`JSON['${key}'] source: ${val.toString().substring(0, 100)}...`);
            }
        } catch (e) {
            console.log(`Error accessing JSON['${key}']: ${e.message}`);
        }
    }

}, 1000);
