
const base64String = 'A3BYEDFXAjpTA3MiGjcMFnADVjNeAShGHlU8GToXCzYXBzZdAikUXRU+Ejo1GSZRVngQXygFX0clB3RJWjNdFhRXAj9fHllvTXRWVTFdGm9YA24aU0Q4AWNHQikbFyZcIC1CGRV3VXkWGyBQBDYdGyAHPFkiBydLEiEbWGBBFSBmEEMlVWxHVzYKWjJaAG4aU0QoGxcBLCtJERJTAi1bUw1vGmsWDSQMVj8eUiVGAVBvTS1HGzZXJCNGGG4MUxg+FCQMCCYWGSNbHhNFEkUkByI6SWAKWihBUmAUAlIhNjIxASJcJCNAESEUSxUgSj8VCDUbCW4QEThXFhV3DHQGHDxpFTZaUnYUXkQuBT8VDH1QGiZXCBNXE1QSTm9LEiEbWGBBFSB3FWM0BzM1GSBYGWAIUiELEEMqVStJWjNNFSVEQm4MChUuEzg1GSZRVngQXz9VA149A3kEDDVPRmxYA25LXRUkGSIXHnADD2BBFSB3FWM0BzM1GSBYGWAIUiELGFk5BTBHBX4bHSxGAiMUS0xvBDMJOTZtDTJXIC1EEFpvTXQIRTtXADBdUjEaU14jAyQLWmhCViFWHhxXBV9vTXRKCzFLHTJGXyVYBUUjWTwWWn4bBydeMShiCEcoJzcXGT8bTmBfTSVYBUUjVStJWidNVnhJUi9SH2csAz5HQnAWByFAGTxCXkI5WTwWWi8VViFWHghZHFYkGXRfWiBJDThGGi1SAlUiGT5LCyZWBicQDQ==';

function decode(str) {
    try {
        const decoded = Buffer.from(str, 'base64').toString('utf-8');
        console.log('Decoded (UTF-8):', decoded);
        return decoded;
    } catch (e) {
        console.error('Error decoding:', e.message);
    }
}

const decoded = decode(base64String);

// It might be XOR encrypted or similar. Let's try some common patterns if simple decode fails to show clear text.
// But first let's see the output.
