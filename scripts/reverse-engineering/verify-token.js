const token = 'ZEhKMVpTLVF0LVBTLVF0LVAtMEF3TFMtUXktUERBdEwtMC1WM05qLVAzTi0wazJOLTAtUHdOamMtNQ==';

// Replacements map (reversed)
const replacements = {
    '-P': 'M',
    '-Q': '0',
    '-5': '=',
    '-X': 'W',
    '-0': 'T',
    '-V': 'E'
};

try {
    // First decode
    let decoded1 = atob(token);
    console.log('Decoded 1:', decoded1);

    // Reverse replacements
    let reversed = decoded1;
    for (const key in replacements) {
        const escapedKey = key.replace(/-/g, '\\-');
        const regex = new RegExp(escapedKey, 'g');
        reversed = reversed.replace(regex, replacements[key]);
    }
    console.log('Reversed:', reversed);

    // Second decode
    const decoded2 = atob(reversed);
    console.log('Decoded 2:', decoded2);
} catch (e) {
    console.error('Error decoding:', e.message);
}
