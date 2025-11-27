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
        // Mock ZpQw9XkLmN8c3vR3 with a dummy string to see if it tries to decode it
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

// Wait for script execution (it's synchronous in JSDOM usually, but good to be safe)
setTimeout(() => {
    console.log('Script executed.');

    if (window.aclib) {
        console.log('aclib found!');
        console.log('aclib keys:', Object.keys(window.aclib));

        if (window.aclib.runPop) {
            console.log('aclib.runPop exists!');
        } else {
            console.log('aclib.runPop NOT found.');
            // Check prototype
            const proto = Object.getPrototypeOf(window.aclib);
            console.log('aclib prototype keys:', Object.getOwnPropertyNames(proto));
        }

        // Check if we can find the deobfuscated variable names
        // We suspect _0x17f7eb corresponds to ZpQw9XkLmN8c3vR3
        // But we can't access local variables of the script.

        // However, we can check if window.aclib has any properties that look like config.
        // We can also try to call runPop and see if it fails or logs something.

        try {
            console.log('Calling runPop...');
            window.aclib.runPop({ zoneId: 'test' });
        } catch (e) {
            console.log('Error calling runPop:', e.message);
        }

    } else {
        console.log('aclib NOT found on window.');
        // Check for other globals
        console.log('Window keys:', Object.keys(window).filter(k => !k.startsWith('_') && k.length < 20));
    }
}, 1000);
