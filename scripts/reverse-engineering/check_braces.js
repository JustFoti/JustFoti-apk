const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const startClass = content.indexOf('class _0x2e81a4');
const endClass = content.indexOf('const _0x46be8b');

if (startClass !== -1 && endClass !== -1) {
    console.log(`Class starts at ${startClass}, next const starts at ${endClass}`);
    const classBody = content.substring(startClass, endClass);

    let open = 0;
    let close = 0;
    for (let i = 0; i < classBody.length; i++) {
        if (classBody[i] === '{') open++;
        if (classBody[i] === '}') close++;
    }
    console.log(`Open braces: ${open}, Close braces: ${close}`);

    // Check the end of the class body
    console.log('End of class body:');
    console.log(classBody.substring(classBody.length - 200));
} else {
    console.log('Could not find class or next const');
}
