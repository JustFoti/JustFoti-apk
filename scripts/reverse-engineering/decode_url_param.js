const zlib = require('zlib');

const encoded = "H4sIAAAAAAAAAw3O0ZKCIBQA0F8CUst9tBaNwhnJexPeEmw3ZcmanSb5.t3zBWew19StXZIyyq5u4zbk4oY8vSZDvraZox9I.dP4IuCo.JHx2KNKDK0ndUbtyjeVXR0aQhsFkCDkZ1vdV7ptSBMkaYl9Kq6YDGLrSv8GxvWJCQpEcLPzsSZyaaviYaspdRNSLMXcdvWiumnpQ5GdtrmX4Su10Ugb5ctF7w.0xsbPWnczk5_3lyRY_B8yxczKjD7DUTzgJ4czKOhHf7OVXgHeFxeKQxM1hRZF7_235DVAJxSUeDztzKvxJra3333fqeOwQ6oBLxbmyx8SME6nIQEAAA--";

function tryDecode(str, map) {
    let b64 = str;
    for (const [k, v] of Object.entries(map)) {
        b64 = b64.split(k).join(v);
    }
    try {
        const buffer = Buffer.from(b64, 'base64');
        // Check for Gzip magic number 1f 8b
        if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
            const result = zlib.gunzipSync(buffer);
            console.log("SUCCESS with map:", JSON.stringify(map));
            console.log("Decoded:", result.toString());
            return true;
        }
    } catch (e) {
        // console.log("Failed with map:", JSON.stringify(map), e.message);
    }
    return false;
}

// Try combinations
const maps = [
    { '.': '+', '-': '=', '_': '/' },
    { '.': '+', '-': '/', '_': '=' },
    { '.': '/', '-': '+', '_': '=' },
    { '.': '+', '_': '/', '-': '=' }, // Standard-ish
    { '.': '+', '-': '/', '_': '=' },
];

// Also try standard URL safe replacement
maps.push({ '-': '+', '_': '/', '.': '=' });
maps.push({ '-': '+', '_': '/', '.': '+' });

// Just try replacing . with + and - with = (padding)
tryDecode(encoded, { '.': '+', '-': '=', '_': '/' });

const decodedFirst = "ecf5d7d45212fd8d80ade95f4e97c6d1:V1FrZlBnVjRFL2FzbVR4Z1NkRWVYdGx1MXNnQ01QRUU4VU9WcHo3YTQ0QnM0T0crRFR2MnJCdGlxU2FYS2J1U0JFZDlzN0MyTHBqcHk5dkV1VGJpTXNyRXkybnB6SC9lMng5czZMczMvdzllK1NVQlpYYXp2MEovM0VBMXN6R2Z3Zjl6VjJqUm9UWURUbjlicHY3UVoydnBKQzY1UTVJbllhMFNUUXJRUGVLSDZvQlZzTitIbXRLeDV1YUVacUpa";
const parts = decodedFirst.split(':');
if (parts.length > 1) {
    const secondPart = parts[1];
    console.log("Second part:", secondPart);
    try {
        const buf = Buffer.from(secondPart, 'base64');
        console.log("Decoded second part (utf8):", buf.toString('utf8'));
        console.log("Decoded second part (hex):", buf.toString('hex'));
    } catch (e) {
        console.log("Failed to decode second part");
    }
}
