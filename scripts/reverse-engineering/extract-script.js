
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'debug-srcrcp-550.html'), 'utf8');
const match = html.match(/window\['ZpQw9XkLmN8c3vR3'\]='([^']+)';(!function\(\)\{.+?\}\(\))/);

if (match) {
    const scriptContent = match[2];
    // Simple formatting: add newlines after { and ;
    const formatted = scriptContent
        .replace(/\{/g, '{\n')
        .replace(/\}/g, '\n}')
        .replace(/;/g, ';\n');

    fs.writeFileSync(path.join(__dirname, 'extracted-obfuscated.js'), formatted);
    console.log('Extracted and formatted script to extracted-obfuscated.js');
} else {
    console.log('Could not find the specific script pattern.');
    // Try finding just the function part after the variable assignment
    const parts = html.split("window['ZpQw9XkLmN8c3vR3']='");
    if (parts.length > 1) {
        const afterVar = parts[1];
        const scriptStart = afterVar.indexOf(';!function');
        if (scriptStart !== -1) {
            const script = afterVar.substring(scriptStart + 1);
            // Remove trailing </script> if present
            const cleanScript = script.split('</script>')[0];
            const formatted = cleanScript
                .replace(/\{/g, '{\n')
                .replace(/\}/g, '\n}')
                .replace(/;/g, ';\n');
            fs.writeFileSync(path.join(__dirname, 'extracted-obfuscated.js'), formatted);
            console.log('Extracted script using fallback method.');
        }
    }
}
