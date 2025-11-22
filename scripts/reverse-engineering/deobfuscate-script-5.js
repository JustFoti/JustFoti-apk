const fs = require('fs');
const path = require('path');
const vm = require('vm');

const inputFile = path.join(__dirname, 'extracted-script-5.js');
const source = fs.readFileSync(inputFile, 'utf8');

// 1. Extract Header (Array + Decoder + Shuffle)
// The shuffle ends with something like: }(_0x5bd0, ...),function(){
// We look for the sequence "),function(){" which marks the start of the main body.
const splitString = '),function(){';
const splitIndex = source.indexOf(splitString);

if (splitIndex === -1) {
    console.error("Could not find split point: " + splitString);
    process.exit(1);
}

// We want to include the closing parenthesis of the shuffle, but NOT the comma.
// source[splitIndex] is ')'.
// So header length is splitIndex + 1.
let header = source.substring(0, splitIndex + 1);
const body = source.substring(splitIndex + 2); // Skip comma

// Remove anti-tamper from header if present
header = header.replace(/new _0x556ec0\(_0x32e7\)\['ahGfRn'\]\(\)/g, 'void 0');

const headerFile = path.join(__dirname, 'temp-header-5.js');
fs.writeFileSync(headerFile, header);
console.log("Header written to temp-header-5.js");

try {
    // Execute header in a new context to get the decoder
    const context = { console };
    vm.runInNewContext(header, context);
    const decoder = context._0x32e7;

    if (!decoder) {
        throw new Error("Decoder function _0x32e7 not found after executing header");
    }
    console.log("Decoder obtained.");

    // 2. Find Proxy Functions in Body
    // var _0x5725c2=function(_0x93fd07,_0x542cd3,_0x177182,_0x41237b){return _0x32e7(_0x41237b-0x19,_0x542cd3);}
    const proxyRegex = /var\s+(_0x[a-f0-9]+)=function\(([^)]+)\)\{return\s+_0x32e7\(([^)]+)\);\}/g;

    let proxies = {};
    let proxyMatch;
    while ((proxyMatch = proxyRegex.exec(body)) !== null) {
        const name = proxyMatch[1];
        const args = proxyMatch[2].split(',').map(a => a.trim());
        const bodyExpr = proxyMatch[3]; // e.g. _0x41237b-0x19,_0x542cd3

        console.log(`Found proxy: ${name} with args ${args}`);

        // Parse body expression to find how args are used
        // We assume format: argX - offset, argY
        const parts = bodyExpr.split(',');
        const expr1 = parts[0]; // argX - offset
        const expr2 = parts[1]; // argY

        proxies[name] = {
            args: args,
            expr1: expr1,
            expr2: expr2
        };
    }

    // 3. Replace Calls
    // We iterate over the body and replace calls to known proxies
    let deobfuscated = body;
    let totalReplaced = 0;

    for (const [name, info] of Object.entries(proxies)) {
        console.log(`Processing proxy ${name}...`);
        // Regex to match calls: name(arg1, arg2, arg3, arg4)
        // Args can be hex or numbers
        const callRegex = new RegExp(`${name}\\(([^)]+)\\)`, 'g');

        deobfuscated = deobfuscated.replace(callRegex, (match, argsStr) => {
            try {
                const callArgs = argsStr.split(',').map(a => parseInt(a.trim()));
                if (callArgs.some(isNaN)) return match; // Skip if args are not simple numbers

                // Map callArgs to named args
                let argMap = {};
                info.args.forEach((argName, idx) => {
                    argMap[argName] = callArgs[idx];
                });

                // Evaluate expressions
                // expr1 might be "_0x41237b-0x19"
                const evalExpr = (expr) => {
                    // Replace arg names with values
                    let evalStr = expr;
                    for (const [argName, val] of Object.entries(argMap)) {
                        evalStr = evalStr.replace(new RegExp(argName, 'g'), val);
                    }
                    // Evaluate simple math
                    return eval(evalStr);
                };

                const val1 = evalExpr(info.expr1);
                const val2 = evalExpr(info.expr2);

                const result = decoder(val1, val2);
                totalReplaced++;
                return JSON.stringify(result);
            } catch (e) {
                // console.error(`Error replacing ${match}:`, e.message);
                return match;
            }
        });
    }

    console.log(`Total replaced: ${totalReplaced}`);

    // Also look for direct decoder calls if any
    // _0x32e7(arg1, arg2)
    const directCallRegex = /_0x32e7\((-?0x[0-9a-f]+|-?[0-9]+),\s*(-?0x[0-9a-f]+|-?[0-9]+)\)/g;
    deobfuscated = deobfuscated.replace(directCallRegex, (match, p1, p2) => {
        try {
            const result = decoder(parseInt(p1), parseInt(p2));
            totalReplaced++;
            return JSON.stringify(result);
        } catch (e) {
            return match;
        }
    });

    const outputFile = path.join(__dirname, 'deobfuscated-script-5.js');
    fs.writeFileSync(outputFile, deobfuscated);
    console.log(`Deobfuscated script saved to ${outputFile}`);

} catch (e) {
    console.error("Error:", e.message);
    console.error("Stack:", e.stack);
}
