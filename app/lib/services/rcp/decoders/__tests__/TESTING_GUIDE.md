## Decoder Testing & Reverse Engineering Guide

Complete guide for testing decoders and discovering new methods.

## 🎯 Overview

This testing framework provides:
- **Automated testing** of decoder methods against real content
- **Script analysis** to extract decoder logic from live pages
- **Method discovery** to find new decoding patterns
- **Performance tracking** to optimize decoder selection
- **Comprehensive reporting** for analysis

## 📦 Components

### 1. Test Framework (`test-framework.ts`)
Manages test cases and runs automated tests.

### 2. Script Analyzer (`script-analyzer.ts`)
Analyzes and deobfuscates JavaScript from RCP pages.

### 3. Auto Test (`auto-test.ts`)
Orchestrates extraction, analysis, and discovery.

### 4. CLI (`cli.ts`)
Command-line interface for all operations.

## 🚀 Quick Start

### Run All Tests
```bash
npm run decoder:test
```

### Analyze Scripts
```bash
npm run decoder:analyze
```

### Generate Report
```bash
npm run decoder:report
```

### View Statistics
```bash
npm run decoder:stats
```

## 📝 Adding Test Cases

### Manual Test Case
```typescript
import { testFramework } from './test-framework';

testFramework.addTest({
  id: 'fight-club',
  title: 'Fight Club',
  type: 'movie',
  tmdbId: 550,
  encoded: '=8Df6QXN7pHczZDSIhESVtke3hWY...',
  divId: 'TsA2KGDGux',
  expectedMethod: 'rot23',
});
```

### From Live Extraction
```typescript
import { autoTest, createTestCaseFromExtraction } from './auto-test';

const testCase = createTestCaseFromExtraction(
  'breaking-bad-s01e01',
  'Breaking Bad S01E01',
  'tv',
  1396,
  '=8Df6QXN7pHczZDSIhESVtke3hWY...',
  'TsA2KGDGux',
  1,
  1
);

testFramework.addTest(testCase);
```

## 🔍 Extracting from Live Pages

### Step 1: Save Page HTML
Use Puppeteer or browser DevTools to save the complete HTML:

```javascript
// In browser console
const html = document.documentElement.outerHTML;
const blob = new Blob([html], { type: 'text/html' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'prorcp-page.html';
a.click();
```

### Step 2: Extract Encoded Data
Look for:
- Hidden div with encoded content
- Inline scripts with decoder functions
- External scripts loaded from CDN

```javascript
// Find hidden div
const hiddenDiv = document.querySelector('[style*="display: none"]');
const encoded = hiddenDiv?.textContent;
const divId = hiddenDiv?.id;

console.log('Encoded:', encoded);
console.log('Div ID:', divId);
```

### Step 3: Save Scripts
```javascript
// Get all scripts
const scripts = Array.from(document.querySelectorAll('script'));

scripts.forEach((script, i) => {
  if (script.src) {
    console.log(`External ${i}:`, script.src);
  } else {
    console.log(`Inline ${i}:`, script.textContent.substring(0, 100));
  }
});
```

### Step 4: Create Extraction
```typescript
const extraction = {
  id: 'movie-550',
  title: 'Fight Club',
  type: 'movie',
  tmdbId: 550,
  encoded: '...',
  divId: '...',
  html: '...', // Full page HTML
  scripts: [
    { url: 'https://...', content: '...', inline: false },
    { url: 'inline-1', content: '...', inline: true },
  ],
  timestamp: Date.now(),
};

autoTest.saveExtraction(extraction);
```

## 🔬 Analyzing Scripts

### Automatic Analysis
```typescript
import { scriptAnalyzer } from './script-analyzer';

const analysis = scriptAnalyzer.analyze(scriptContent, 'script-url');

console.log('Patterns:', analysis.patterns);
console.log('Decoder Functions:', analysis.decoderFunctions);
console.log('Constants:', analysis.constants);

// Save analysis
scriptAnalyzer.saveAnalysis(analysis, './output');

// Generate report
const report = scriptAnalyzer.generateReport(analysis);
console.log(report);
```

### Manual Deobfuscation
For heavily obfuscated scripts:

1. **Identify obfuscation type**:
   - Packer (eval + function(p,a,c,k,e,d))
   - Hex variable names (_0x...)
   - String array obfuscation

2. **Use online tools**:
   - https://beautifier.io/
   - https://deobfuscate.io/
   - https://lelinhtinh.github.io/de4js/

3. **Extract decoder logic**:
   Look for functions that:
   - Take encoded string as input
   - Use `atob`, `fromCharCode`, XOR operations
   - Return decoded URL

## 🎯 Discovering New Methods

### Automated Discovery
```typescript
import { autoTest } from './auto-test';
import { testFramework } from './test-framework';
import { decode } from '../index';

// Run tests to find failures
const results = await testFramework.runAll(decode);
const failedTests = results.results
  .filter(r => !r.passed)
  .map(r => testFramework.getTest(r.testId))
  .filter(t => t !== undefined);

// Discover new methods
const discoveries = await autoTest.discoverNewMethods(failedTests, decode);

console.log(`Found ${discoveries.length} potential new methods`);
```

### Manual Discovery Process

1. **Identify Failed Test**:
   ```typescript
   const failed = results.results.find(r => !r.passed);
   console.log('Failed test:', failed.testId);
   ```

2. **Load Extraction**:
   ```typescript
   const extraction = autoTest.loadExtraction(`${failed.testId}.json`);
   ```

3. **Analyze Scripts**:
   ```typescript
   const analyses = autoTest.analyzeExtraction(extraction);
   const decoderFunctions = analyses.flatMap(a => a.decoderFunctions);
   ```

4. **Test Decoder Functions**:
   ```typescript
   for (const fn of decoderFunctions) {
     // Try to execute function with test data
     // If successful, create new decoder method
   }
   ```

5. **Create New Method**:
   ```typescript
   import { DecoderMethod } from '../types';
   
   export const newDecoder: DecoderMethod = {
     id: 'new-method',
     name: 'New Method',
     category: 'composite',
     priority: 5,
     fn: (input: string) => {
       // Extracted logic here
       return decoded;
     },
   };
   ```

## 📊 Batch Processing

Process multiple extractions at once:

```typescript
import { autoTest } from './auto-test';
import { decode } from '../index';

// This will:
// 1. Load all extractions
// 2. Create test cases
// 3. Analyze scripts
// 4. Run tests
// 5. Generate reports
await autoTest.batchProcess(decode);

// Check output directory for reports
// - test-report.txt
// - test-results.json
// - script-analysis-report.txt
// - registry-stats.json
```

## 📈 Performance Tracking

### View Method Statistics
```typescript
import { registry } from '../registry';

// Top performers
const topPerformers = registry.getTopPerformers(10);
console.log('Top 10 decoders:', topPerformers);

// Least used
const leastUsed = registry.getLeastUsed(10);
console.log('Least used:', leastUsed);

// Specific method
const stats = registry.getStats('rot23');
console.log('ROT-23 stats:', stats);
```

### Export Statistics
```typescript
import { registry } from '../registry';
import * as fs from 'fs';

const stats = registry.exportStats();
fs.writeFileSync('decoder-stats.json', stats);
```

## 🐛 Debugging

### Enable Debug Mode
```typescript
import { setDebugMode } from '../index';

setDebugMode(true);
// Now all decode attempts will be logged
```

### Test Single Method
```typescript
import { registry } from '../registry';

const decoder = registry.getById('rot23');
if (decoder) {
  const result = decoder.fn('encoded-string');
  console.log('Result:', result);
}
```

### Trace Decode Process
```typescript
import { decode } from '../index';

const result = await decode({
  encoded: '...',
  divId: '...',
  requestId: 'debug-1',
});

console.log('Success:', result.success);
console.log('Method:', result.success ? result.method : 'N/A');
console.log('Elapsed:', result.elapsed);
```

## 📁 Output Structure

```
decoder-analysis/
├── extractions/          # Saved page extractions
│   ├── movie-550-1234567890.json
│   ├── movie-550-1234567890.html
│   └── ...
├── scripts/              # Extracted and analyzed scripts
│   ├── script-1-1234567890-raw.js
│   ├── script-1-1234567890-deobfuscated.js
│   ├── script-1-1234567890-analysis.json
│   └── script-1-1234567890-functions.js
├── discoveries/          # Newly discovered methods
│   ├── discovered-1234567890-decode.json
│   ├── discovered-1234567890-decode.js
│   └── ...
├── test-report.txt       # Test results report
├── test-results.json     # Detailed test results
├── script-analysis-report.txt
└── registry-stats.json   # Decoder statistics
```

## 🔄 Workflow Example

Complete workflow for adding a new show/movie:

```typescript
// 1. Extract from live page (manual or with Puppeteer)
const extraction = {
  id: 'inception',
  title: 'Inception',
  type: 'movie',
  tmdbId: 27205,
  encoded: '...',
  divId: '...',
  html: '...',
  scripts: [...],
  timestamp: Date.now(),
};

// 2. Save extraction
autoTest.saveExtraction(extraction);

// 3. Create test case
const testCase = autoTest.createTestCase(extraction);
testFramework.addTest(testCase);

// 4. Run test
const result = await testFramework.runTest(testCase, decode);

if (result.passed) {
  console.log('✓ Decoded successfully with:', result.decodeResult.method);
} else {
  console.log('✗ Failed to decode');
  
  // 5. Analyze scripts
  const analyses = autoTest.analyzeExtraction(extraction);
  
  // 6. Look for decoder functions
  const decoderFunctions = analyses.flatMap(a => a.decoderFunctions);
  console.log('Found decoder functions:', decoderFunctions.length);
  
  // 7. Manually implement new method based on findings
  // 8. Re-run test
}
```

## 🎓 Best Practices

1. **Always validate results** with `validateUrl()`
2. **Save extractions** before testing
3. **Analyze scripts** for failed tests
4. **Track performance** to optimize method order
5. **Document discoveries** with confidence scores
6. **Test new methods** against multiple samples
7. **Update success rates** based on real data
8. **Keep decoders simple** and focused
9. **Use descriptive names** for methods
10. **Add tests** for every new method

## 🆘 Troubleshooting

### Tests Failing
- Check if encoded string is complete
- Verify divId is correct
- Ensure scripts are properly extracted
- Try manual decoding in browser console

### Scripts Not Deobfuscating
- Use online deobfuscation tools
- Check for dynamic script loading
- Look for eval() statements
- Inspect network requests

### Low Success Rates
- Review method priorities
- Add more test cases
- Analyze failed attempts
- Consider composite methods

### Performance Issues
- Profile slow methods
- Optimize hot paths
- Use early returns
- Cache results

## 📚 Resources

- [Decoder README](../README.md)
- [Method Implementation Guide](../methods/README.md)
- [Migration Guide](../MIGRATION_GUIDE.md)
- [Constants Reference](../constants.ts)
- [Types Reference](../types.ts)
