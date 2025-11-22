const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

// Decoded configuration (from previous steps)
const config = {
    "adserverDomain": "wpnxiswpuyrfn.icu",
    "selPath": "/d3.php",
    "adbVersion": "3-cdn-js",
    "suv5": {
        "cdnPath": "/script/kl1Mnopq.js",
        "selPath": "/d3.php",
        "selAdTypeParam": "m=suv5"
    },
    "cdnDomain": "rpyztjadsbonh.store"
};

// Mocked parameters
const zoneId = "12345"; // Placeholder, need to find actual zoneId
const collectiveZoneId = "67890"; // Placeholder
const uniqueFingerprint = "mock_fingerprint"; // Placeholder
const sessionRandomString = "mock_srs"; // Placeholder
const tagVersion = "71.2";

// Helper functions
function getRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function getCdnDomain() {
    return config.cdnDomain;
}

function getSessionRandomString() {
    return sessionRandomString;
}

// Replicate request construction
async function fetchSuv5() {
    const protocol = "https:";
    const adserverDomain = config.adserverDomain;
    let url = `${protocol}//${adserverDomain}/script/suurl5.php`;

    // Query parameters
    const params = new URLSearchParams();
    params.append('r', zoneId);
    // params.append('rbd', '1'); // Only if #v is true (initial request?)

    // Client hints (mocked)
    const clientHints = "&ch_ua=mock_ua&ch_platform=Windows";

    // Construct the full URL manually as in the script to match order/logic
    let fullUrl = url + `?r=${zoneId}`;
    fullUrl += clientHints;
    fullUrl += `&atag=1`;
    fullUrl += `&cbur=${Math.random()}`;
    fullUrl += `&cbiframe=0`; // Assuming top level for now
    fullUrl += `&cbWidth=1920`;
    fullUrl += `&cbHeight=1080`;
    fullUrl += `&cbtitle=${encodeURIComponent("Streaming...")}`;
    fullUrl += `&cbpage=${encodeURIComponent("https://streamingnow.mov/?play=S0dhU1FEaUcxTUlhNTdMUFRGb0tTaXFUVStmQnNRdkFNcXFtOWtBaWljR09nQ1JNd210bmdFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09")}`;
    fullUrl += `&cbref=${encodeURIComponent("")}`;
    fullUrl += `&cbdescription=${encodeURIComponent("")}`;
    fullUrl += `&cbkeywords=${encodeURIComponent("")}`;
    fullUrl += `&cbcdn=${encodeURIComponent(getCdnDomain())}`;
    fullUrl += `&ts=${Date.now()}`;
    fullUrl += `&atv=${tagVersion}`;
    fullUrl += `&ufp=${encodeURIComponent(uniqueFingerprint)}`;
    fullUrl += `&srs=${getSessionRandomString()}`;

    // Add other potential params
    // fullUrl += `&abtg=1`; // If adblock settings present
    // fullUrl += `&aggr=...`;
    // fullUrl += `&czid=${collectiveZoneId}`;
    // fullUrl += `&ppv=1`;
    // fullUrl += `&cap=0`;

    console.log("Fetching URL:", fullUrl);

    try {
        const response = await fetch(fullUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://streamingnow.mov/"
            }
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response length:", text.length);
        console.log("Response preview:", text.substring(0, 500));

        // Try to decode if it looks like base64 or JSON
        try {
            const json = JSON.parse(text);
            console.log("Parsed JSON:", JSON.stringify(json, null, 2));
        } catch (e) {
            // Not JSON
        }

    } catch (error) {
        console.error("Error fetching:", error);
    }
}

fetchSuv5();
