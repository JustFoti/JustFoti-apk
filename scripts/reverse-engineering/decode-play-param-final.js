const param = "S0dhU1FEaUcxTUlhNTdMUFRGb0tTaXFUVStmQnNRdkFNcXFtOWtBaWljR09nQ1JNd210bmdFeTN5RGk1RFdRN2Q3SVcvT09YSVo1V0pHbzZjNlhLN2F4MDNZaWhzN2hDUDhRV1dtMFRoUnl4d0YyNFJWQVRlOTAvLzBEay9ZODZwOFdFQnJYUTYvUWRGVjJNQ0ZqbndURzY5QT09";

function decode(p) {
    try {
        const first = Buffer.from(p, 'base64').toString('utf8');
        console.log("First decode:", first);
        const second = Buffer.from(first, 'base64');
        console.log("Second decode (hex):", second.toString('hex'));
        console.log("Second decode (utf8):", second.toString('utf8'));
    } catch (e) {
        console.error("Error:", e);
    }
}

decode(param);
