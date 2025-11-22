const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'debug-srcrcp-550.html');
const content = fs.readFileSync(filePath, 'utf8');

console.log('File size:', content.length);

const formIndex = content.indexOf('<form');
if (formIndex !== -1) {
    console.log('Found <form> at index:', formIndex);
    // Look backwards and forwards for the full tag
    const formTag = content.substring(formIndex, content.indexOf('>', formIndex) + 1);
    console.log('Form Tag:', formTag);

    // Find all inputs inside form
    let currentPos = formIndex;
    const endForm = content.indexOf('</form>', formIndex);

    while (true) {
        const inputIndex = content.indexOf('<input', currentPos);
        if (inputIndex === -1 || inputIndex > endForm) break;

        const inputTag = content.substring(inputIndex, content.indexOf('>', inputIndex) + 1);
        console.log('Input Tag:', inputTag);
        currentPos = inputIndex + 1;
    }
} else {
    console.log('<form> not found');
}
