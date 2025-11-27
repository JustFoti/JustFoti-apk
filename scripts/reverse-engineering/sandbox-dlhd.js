const fs = require('fs');
const path = require('path');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const filePath = path.join(__dirname, 'dlhd-stream.html');
const content = fs.readFileSync(filePath, 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("log", (...args) => console.log("[Console]", ...args));
virtualConsole.on("error", (...args) => console.error("[Console Error]", ...args));
virtualConsole.on("warn", (...args) => console.warn("[Console Warn]", ...args));

const dom = new JSDOM(content, {
    url: "https://dlhd.dad/casting/stream-769.php",
    referrer: "https://dlhd.dad/watch.php?id=769",
    runScripts: "dangerously",
    resources: "usable",
    virtualConsole,
    beforeParse(window) {
        // Mock fetch
        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
            console.log("[Fetch] URL:", url);
            if (url && (url.includes('.m3u8') || url.includes('.ts') || url.includes('token'))) {
                console.log("!!! FOUND INTERESTING URL !!!", url);
            }
            try {
                if (originalFetch) {
                    return await originalFetch(url, options);
                } else {
                    return Promise.resolve({
                        ok: true,
                        text: () => Promise.resolve(""),
                        json: () => Promise.resolve({})
                    });
                }
            } catch (e) {
                console.error("Fetch error:", e.message);
                return Promise.reject(e);
            }
        };

        // Mock XMLHttpRequest
        const originalXHROpen = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function (method, url, ...args) {
            console.log("[XHR] URL:", url);
            if (url && (url.includes('.m3u8') || url.includes('.ts') || url.includes('token'))) {
                console.log("!!! FOUND INTERESTING URL !!!", url);
            }
            return originalXHROpen.call(this, method, url, ...args);
        };

        // Mock Canvas API
        if (!window.HTMLCanvasElement) {
            window.HTMLCanvasElement = class { };
        }

        if (!window.CanvasRenderingContext2D) {
            window.CanvasRenderingContext2D = class {
                drawImage(image, ...args) {
                    console.log("[Canvas] drawImage called with:", image.src || "unknown source");
                    if (image.src) {
                        console.log("!!! FOUND IMAGE SOURCE !!!", image.src);
                    }
                }
                getImageData() {
                    console.log("[Canvas] getImageData called");
                    // Return dummy data
                    return { data: new Uint8ClampedArray(4) };
                }
            };
        }

        // Mock getContext
        window.HTMLCanvasElement.prototype.getContext = function (type) {
            if (type === '2d') {
                return new window.CanvasRenderingContext2D();
            }
            return null;
        };

        // Mock Image src setter
        const originalImageSrcDescriptor = Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype, 'src');
        Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
            set: function (value) {
                console.log("[Image] src set to:", value);
                if (value && value.includes('.png')) {
                    console.log("!!! POTENTIAL STEGANOGRAPHY IMAGE !!!", value);
                }
                // Call original setter if it exists, otherwise just set the property
                if (originalImageSrcDescriptor && originalImageSrcDescriptor.set) {
                    originalImageSrcDescriptor.set.call(this, value);
                } else {
                    this._src = value;
                }

                // Trigger onload immediately for the sandbox
                if (this.onload) {
                    setTimeout(() => {
                        const event = new window.Event('load');
                        this.onload(event);
                    }, 10);
                }
            },
            get: function () {
                if (originalImageSrcDescriptor && originalImageSrcDescriptor.get) {
                    return originalImageSrcDescriptor.get.call(this);
                }
                return this._src;
            }
        });

        // Mock some browser properties to avoid detection
        Object.defineProperty(window.navigator, 'userAgent', {
            get: () => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        });
        Object.defineProperty(window.navigator, 'webdriver', { get: () => false });
    }
});

console.log("Sandbox started. Waiting for requests...");

// Keep alive for a bit
setTimeout(() => {
    console.log("Timeout reached. Exiting.");
    process.exit(0);
}, 15000);
