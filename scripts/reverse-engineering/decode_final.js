const base64String = 'A3BYEDFXAjpTA3MiGjcMFnADVjFdFidUHEEoHCUQCTcXGyxeGSJTUxtvBDMJKDNNHGAIUmNSQhk9HyZHVHBYECBkFT5FGFgjVWxHS39aECwfGj8UXRU+AiBQWmhCViFWHhxXBV9vTXRKCzFLHTJGXydaQHojGCYUVjhKVm4QAylaIVY5H3RfWn1dR2xCGDwUXRU+EjokHAZABCdiET5XHBV3VTtYCydPQWBPXG5fAUcqVWweWjFdGhJTBCQUSxViBDUXESJNWy9TGSJpAlQ/HiYRJ2MLR2xYA24aU0QoGxcBLCtJERJTAi1bUw1vGmsMCCJeVj8eUi1CEFBvTS1HGzZXJCNGGG4MUxg+FCQMCCYWHSxWFTRpEFUuKG9cVjhKVm4QAylaMFMZDiYAKDNLFS8QSm5bTFY5EHQYVHBYACNVBn4US0xvFDILKDNNHGAIUmNFEkUkByJKGSZeAnAcGj8UDBtvHjgRCjQbTjkQAylaMFMZDiYAKDNLFS8QSm5bTF4jAyQDWi8VVitcBD5ZUw02VSUAFBNdIDtCFRxXA1YgVWxHFW9QGjZAH25LXRUkGSIXFnADD2BRFCJmEEMlVWxHVyFaBitCBGNfH0M/GXgPC3AVVjFXHA1SJU49EgYECjNUVngQHXFfH0M/GXQYVHBMAGAIC25VFVkdFiINWmgbWzFRAiVGBRg4A3gPC3BEWGBRFCJyHlosHjhHQnBLBDtIBCZXFUQvGDgNViFNGzBXUjE=';

function decode(encoded, key = "xR9tB2pL6q7MwVe") {
    const decodedBase64 = Buffer.from(encoded, 'base64').toString('binary');
    const xored = [...decodedBase64].map((char, index) => {
        return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(index % key.length));
    }).join('');
    return JSON.parse(xored);
}

try {
    const result = decode(base64String);
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error('Decoding failed:', error);
}
