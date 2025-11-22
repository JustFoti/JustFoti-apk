
const playParam = 'TDJLUVN6K0cxTVVlNWJuSVRGb0tTaXFUVStmQnNRdkFNcXFuOWtRb2ljS01nQ1JMd1dWamdreTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09';

function decode(str) {
    try {
        const decoded = Buffer.from(str, 'base64').toString('utf-8');
        console.log('Decoded (UTF-8):', decoded);
        return decoded;
    } catch (e) {
        console.error('Error decoding:', e.message);
    }
}

decode(playParam);
