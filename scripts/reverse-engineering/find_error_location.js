const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'deobfuscated-player.js');
const content = fs.readFileSync(filePath, 'utf8');

const query = "['oline'+'us']='ent,";
const pos = content.indexOf(query);

if (pos !== -1) {
    console.log(`Found '${query}' at index ${pos}`);
    const start = Math.max(0, pos - 50);
    const end = Math.min(content.length, pos + 100);
    console.log('Context:');
    console.log(content.substring(start, end));
    
    // Check for newline
    const sub = content.substring(pos, pos + query.length + 10);
    console.log('Substring dump:');
    for (let i = 0; i < sub.length; i++) {
        process.stdout.write(sub.charCodeAt(i) + ' ');
    }
    console.log();
} else {
    console.log(`'${query}' not found.`);
    // Try partial
    const query2 = "oline'+'us";
    const pos2 = content.indexOf(query2);
    if (pos2 !== -1) {
        console.log(`Found '${query2}' at index ${pos2}`);
        const start = Math.max(0, pos2 - 50);
        const end = Math.min(content.length, pos2 + 100);
        console.log('Context:');
        console.log(content.substring(start, end));
    }
}
