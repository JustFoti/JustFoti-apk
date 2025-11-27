const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const startFunc = content.indexOf('const _0x46be8b');
const startClass2 = content.indexOf('class _0x33c8c5');
const endClass2 = content.indexOf('class _0xa7a7a9'); // Assuming next class

if (startFunc !== -1 && startClass2 !== -1) {
    console.log(`Func starts at ${startFunc}, Class2 starts at ${startClass2}`);
    const funcBody = content.substring(startFunc, startClass2);
    
    let open = 0;
    let close = 0;
    for (let i = 0; i < funcBody.length; i++) {
        if (funcBody[i] === '{') open++;
        if (funcBody[i] === '}') close++;
    }
    console.log(`Func: Open braces: ${open}, Close braces: ${close}`);
    console.log('End of func body:');
    console.log(funcBody.substring(funcBody.length - 100));

    if (endClass2 !== -1) {
        const class2Body = content.substring(startClass2, endClass2);
        open = 0;
        close = 0;
        for (let i = 0; i < class2Body.length; i++) {
            if (class2Body[i] === '{') open++;
            if (class2Body[i] === '}') close++;
        }
        console.log(`Class2: Open braces: ${open}, Close braces: ${close}`);
         console.log('End of class2 body:');
        console.log(class2Body.substring(class2Body.length - 100));
    }
} else {
    console.log('Could not find func or class2');
}
