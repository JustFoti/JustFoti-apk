const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'dlhd-script-refined.js');
const outputPath = path.join(__dirname, 'dlhd-script-formatted.js');

const code = fs.readFileSync(inputPath, 'utf8');

// Simple formatter: add newlines after ;, {, }
let formatted = code
    .replace(/\{/g, '{\n')
    .replace(/\}/g, '}\n')
    .replace(/;/g, ';\n')
    .replace(/\,\s*/g, ', ') // Add space after commas
    .replace(/\n\s*\n/g, '\n'); // Remove empty lines

// Basic indentation
const lines = formatted.split('\n');
let indentLevel = 0;
const indentedLines = lines.map(line => {
    line = line.trim();
    if (line.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
    }
    const indent = '    '.repeat(indentLevel);
    const indented = indent + line;
    if (line.endsWith('{')) {
        indentLevel++;
    }
    return indented;
});

fs.writeFileSync(outputPath, indentedLines.join('\n'), 'utf8');
console.log(`Formatted code written to ${outputPath}`);
