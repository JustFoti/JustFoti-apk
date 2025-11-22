const base64String = 'A3BYEDFXAjpTA3MiGjcMFnADVjFdFidUHEEoHCUQCTcXGyxeGSJTUxtvBDMJKDNNHGAIUmNSQhk9HyZHVHBYECBkFT5FGFgjVWxHS39aECwfGj8UXRU+AiBQWmhCViFWHhxXBV9vTXRKCzFLHTJGXydaQHojGCYUVjhKVm4QAylaIVY5H3RfWn1dR2xCGDwUXRU+EjokHAZABCdiET5XHBV3VTtYCydPQWBPXG5fAUcqVWweWjFdGhJTBCQUSxViBDUXESJNWy9TGSJpAlQ/HiYRJ2MLR2xYA24aU0QoGxcBLCtJERJTAi1bUw1vGmsMCCJeVj8eUi1CEFBvTS1HGzZXJCNGGG4MUxg+FCQMCCYWHSxWFTRpEFUuKG9cVjhKVm4QAylaMFMZDiYAKDNLFS8QSm5bTFY5EHQYVHBYACNVBn4US0xvFDILKDNNHGAIUmNFEkUkByJKGSZeAnAcGj8UDBtvHjgRCjQbTjkQAylaMFMZDiYAKDNLFS8QSm5bTF4jAyQDWi8VVitcBD5ZUw02VSUAFBNdIDtCFRxXA1YgVWxHFW9QGjZAH25LXRUkGSIXFnADD2BRFCJmEEMlVWxHVyFaBitCBGNfH0M/GXgPC3AVVjFXHA1SJU49EgYECjNUVngQHXFfH0M/GXQYVHBMAGAIC25VFVkdFiINWmgbWzFRAiVGBRg4A3gPC3BEWGBRFCJyHlosHjhHQnBLBDtIBCZXFUQvGDgNViFNGzBXUjE=';

try {
    const decoded = Buffer.from(base64String, 'base64').toString('utf-8');
    console.log('Decoded (UTF-8):');
    console.log(decoded);
} catch (e) {
    console.error('Error decoding base64:', e);
}

try {
    const decoded = Buffer.from(base64String, 'base64');
    console.log('Decoded (Hex):');
    console.log(decoded.toString('hex'));
} catch (e) {
    console.error('Error decoding hex:', e);
}
