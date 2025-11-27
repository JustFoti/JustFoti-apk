const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const classStartStr = 'class _0x488316{';
const startIndex = content.indexOf(classStartStr);

if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex + classStartStr.length - 1; i < content.length; i++) {
        const char = content[i];

        if (inString) {
            if (char === stringChar && content[i - 1] !== '\\') {
                inString = false;
            }
        } else {
            if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
            } else if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
    }

    if (endIndex !== -1) {
        const classBody = content.substring(startIndex, endIndex + 1);

        const methodRegex = /((?:async\s+)?(?:#?[\w$]+|\[['"`].*?['"`]\]))\s*\(/g;
        let methodMatch;
        console.log('Methods:');
        while ((methodMatch = methodRegex.exec(classBody)) !== null) {
            console.log(methodMatch[1]);
        }

        const assignmentRegex = /this\['(.*?)'\]\s*=/g;
        let assignMatch;
        console.log('Assignments:');
        while ((assignMatch = assignmentRegex.exec(classBody)) !== null) {
            console.log(assignMatch[1]);
        }

    } else {
        console.log('Could not find end of class');
    }
} else {
    console.log('Class _0x488316 not found');
}
