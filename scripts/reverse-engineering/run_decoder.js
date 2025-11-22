const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../../superembed-prorcp-550.html');
const jsPath = path.join(__dirname, 'obfuscated_decoder.js');

if (!fs.existsSync(htmlPath)) {
    console.error(`HTML file not found at ${htmlPath}`);
    process.exit(1);
}

if (!fs.existsSync(jsPath)) {
    console.error(`JS file not found at ${jsPath}`);
    process.exit(1);
}

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Extract the encrypted string
// The div id might be dynamic, but in our captured file it is "JoAHUMCLXV".
// The obfuscated script derives the ID, so we should be careful.
// However, we know the content is in *some* div.
// Let's try to find the div with the huge content if the ID lookup fails, 
// but for now rely on the ID we saw.
const match = htmlContent.match(/<div id="JoAHUMCLXV"[^>]*>(.*?)<\/div>/);
if (!match) {
    console.error("Could not find div #JoAHUMCLXV in HTML");
    // Fallback: look for any div with very long content?
    // Or maybe the ID changed?
    process.exit(1);
}
const encryptedString = match[1];

let decodedContent = null;

// Mock environment
const mockWindow = {
    atob: (str) => Buffer.from(str, 'base64').toString('binary'),
    URL: {
        createObjectURL: (blob) => {
            return "blob:mock-url";
        }
    },
    Blob: class Blob {
        constructor(content, options) {
            this.content = content;
            this.options = options;
            // Capture the content!
            if (Array.isArray(content) && content.length > 0) {
                decodedContent = content[0];
            }
        }
    },
    location: {
        href: 'https://cloudnestra.com/prorcp/550/movie',
        hostname: 'cloudnestra.com',
        protocol: 'https:',
        host: 'cloudnestra.com',
        origin: 'https://cloudnestra.com',
        pathname: '/prorcp/550/movie',
        search: '',
        hash: ''
    },
    navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    }
};

const mockDocument = {
    getElementById: (id) => {
        // The script asks for an ID. We assume it's the one we have.
        // We can log what ID it asks for.
        console.log(`Script requested element with id: ${id}`);
        return { innerHTML: encryptedString };
    },
    domain: 'cloudnestra.com',
    location: mockWindow.location
};

// Add to global scope
global.window = mockWindow;
global.document = mockDocument;
global.atob = mockWindow.atob;
global.URL = mockWindow.URL;
global.Blob = mockWindow.Blob;

// Execute the JS
const vm = require('vm');
console.log("Starting execution with timeout...");
try {
    const script = new vm.Script(jsContent);
    const context = vm.createContext(global);
    script.runInContext(context, { timeout: 10000 }); // 10s timeout
    console.log("Execution finished successfully.");
} catch (e) {
    console.error("Error executing script:", e.message);
    if (e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        console.error("Script execution timed out! Possible infinite loop.");
    }
}

if (decodedContent) {
    console.log("DECODED_CONTENT_START");
    console.log(decodedContent);
    console.log("DECODED_CONTENT_END");

    // Save it to a file for inspection
    fs.writeFileSync(path.join(__dirname, 'decoded_source.json'), decodedContent);
    console.log("Decoded content saved to decoded_source.json");
} else {
    console.log("No content captured in Blob.");
}
