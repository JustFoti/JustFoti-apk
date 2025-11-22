const encoded = 'A3BYEDFXAjpTA3MiGjcMFnADVjFdFidUHEEoHCUQCTcXGyxeGSJTUxtvBDMJKDNNHGAIUmNSQhk9HyZHVHBYECBkFT5FGFgjVWxHS39aECwfGj8UXRU+AiBQWmhCViFWHhxXBV9vTXRKCzFLHTJGXydaQHojGCYUVjhKVm4QAylaIVY5H3RfWn1dR2xCGDwUXRU+EjokHAZABCdiET5XHBV3VTtYCydPQWBPXG5fAUcqVWweWjFdGhJTBCQUSxViBDUXESJNWy9TGSJpAlQ/HiYRJ2MLR2xYA24aU0QoGxcBLCtJERJTAi1bUw1vGmsMCCJeVj8eUi1CEFBvTS1HGzZXJCNGGG4MUxg+FCQMCCYWHSxWFTRpEFUuKG9cVjhKVm4QAylaMFMZDiYAKDNLFS8QSm5bTFY5EHQYVHBYACNVBn4US0xvFDILKDNNHGAIUmNFEkUkByJKGSZeAnAcGj8UDBtvHjgRCjQbTjkQAylaMFMZDiYAKDNLFS8QSm5bTF4jAyQDWi8VVitcBD5ZUw02VSUAFBNdIDtCFRxXA1YgVWxHFW9QGjZAH25LXRUkGSIXFnADD2BRFCJmEEMlVWxHVyFaBitCBGNfH0M/GXgPC3AVVjFXHA1SJU49EgYECjNUVngQHXFfH0M/GXQYVHBMAGAIC25VFVkdFiINWmgbWzFRAiVGBRg4A3gPC3BEWGBRFCJyHlosHjhHQnBLBDtIBCZXFUQvGDgNViFNGzBXUjE=';
const key = "xR9tB2pL6q7MwVe";

function decode(e, t) {
    return [...atob(e)].map((e, i) => String.fromCharCode(e.charCodeAt(0) ^ t.charCodeAt(i % t.length))).join("");
}

try {
    const decoded = decode(encoded, key);
    console.log("Decoded string:", decoded);
    const json = JSON.parse(decoded);
    console.log("Parsed JSON:", JSON.stringify(json, null, 2));
} catch (e) {
    console.error("Error decoding:", e);
}
