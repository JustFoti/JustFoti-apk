# Quick Start Guide - RCP Decoder Testing System

Get started with testing and reverse engineering RCP decoders in 5 minutes.

## Installation

No additional installation needed - everything is included in the project.

## Commands

```bash
# Run all tests
npm run decoder:test

# Analyze scripts
npm run decoder:analyze

# Discover new methods
npm run decoder:discover

# Generate report
npm run decoder:report

# View statistics
npm run decoder:stats

# Show help
npm run decoder:help
```

## Basic Usage

### 1. Decode a Hash

```typescript
import { decode } from './app/lib/services/rcp/decoders';

const result = await decode({
  encoded: 'your-encoded-string',
  divId: 'optional-div-id',
});

if (result.success) {
  console.log('Decoded URL:', result.url);
  console.log('Method used:', result.method);
}
```

### 2. Add a Test Case

```typescript
import { testFramework } from './app/lib/services/rcp/decoders/__tests__/test-framework';

testFramework.addTest({
  id: 'test-1',
  title: 'Fight Club',
  type: 'movie',
  tmdbId: 550,
  encoded: '=8Df6QXN7pHczZDSIhESVtke3hWY...',
  divId: 'TsA2KGDGux',
});
```

### 3. Run Tests

```typescript
import { testFramework } from './app/lib/services/rcp/decoders/__tests__/test-framework';
import { decode } from './app/lib/services/rcp/decoders';

const results = await testFramework.runAll(decode);
console.log(testFramework.generateReport(results));
```

### 4. Analyze a Script

```typescript
import { scriptAnalyzer } from './app/lib/services/rcp/decoders/__tests__/script-analyzer';

const analysis = scriptAnalyzer.analyze(scriptContent, 'script-url');
console.log('Decoder functions found:', analysis.decoderFunctions.length);
```

## Extracting from Live Pages

### In Browser Console

```javascript
// 1. Get encoded data
const hiddenDiv = document.querySelector('[style*="display: none"]');
const encoded = hiddenDiv?.textContent;
const divId = hiddenDiv?.id;

console.log('Encoded:', encoded);
console.log('Div ID:', divId);

// 2. Save page HTML
const html = document.documentElement.outerHTML;
copy(html); // Copies to clipboard

// 3. Get all scripts
const scripts = Array.from(document.querySelectorAll('script'));
scripts.forEach((s, i) => {
  console.log(`Script ${i}:`, s.src || 'inline');
});
```

### Save Extraction

```typescript
import { autoTest } from './app/lib/services/rcp/decoders/__tests__/auto-test';

const extraction = {
  id: 'movie-550',
  title: 'Fight Club',
  type: 'movie',
  tmdbId: 550,
  encoded: '...',
  divId: '...',
  html: '...',
  scripts: [...],
  timestamp: Date.now(),
};

autoTest.saveExtraction(extraction);
```

## Adding New Decoder Methods

```typescript
import { DecoderMethod } from './app/lib/services/rcp/decoders/types';
import { validateUrl } from './app/lib/services/rcp/decoders/utils';

export const myDecoder: DecoderMethod = {
  id: 'my-decoder',
  name: 'My Decoder',
  category: 'caesar',
  priority: 5,
  successRate: 0.10,
  avgTime: 3,
  description: 'What this decoder does',
  
  fn: (input: string, divId?: string): string | null => {
    try {
      // Your decoding logic
      const decoded = yourFunction(input);
      
      // Always validate
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};
```

Then add to `methods/index.ts`:

```typescript
import { myDecoder } from './my-decoder';

export const allDecoders = [
  ...caesarDecoders,
  ...hexDecoders,
  ...base64Decoders,
  ...xorDecoders,
  myDecoder, // Add here
];
```

## Workflow for New Content

```typescript
// 1. Extract from page (manual or Puppeteer)
const extraction = { ... };
autoTest.saveExtraction(extraction);

// 2. Create test case
const testCase = autoTest.createTestCase(extraction);
testFramework.addTest(testCase);

// 3. Run test
const result = await testFramework.runTest(testCase, decode);

// 4. If failed, analyze
if (!result.passed) {
  const analyses = autoTest.analyzeExtraction(extraction);
  // Review decoder functions
  // Implement new method
  // Re-run test
}
```

## Viewing Statistics

```typescript
import { registry } from './app/lib/services/rcp/decoders/registry';

// Top performers
const topPerformers = registry.getTopPerformers(10);
console.log(topPerformers);

// Specific method
const stats = registry.getStats('rot23');
console.log('ROT-23 success rate:', stats.successRate);
```

## Debugging

```typescript
import { setDebugMode } from './app/lib/services/rcp/decoders';

setDebugMode(true);
// Now all operations are logged
```

## Next Steps

1. Read [TESTING_GUIDE.md](./__tests__/TESTING_GUIDE.md) for complete guide
2. Check [methods/README.md](./methods/README.md) for method details
3. Review [README.md](./README.md) for full documentation

## Common Issues

### Tests Failing
- Verify encoded string is complete
- Check divId is correct
- Ensure scripts are extracted

### Scripts Not Deobfuscating
- Use online tools (beautifier.io, deobfuscate.io)
- Check for eval() statements
- Look for dynamic loading

### Low Success Rates
- Add more test cases
- Review method priorities
- Analyze failed attempts

## Help

```bash
npm run decoder:help
```

Or check the documentation:
- [README.md](./README.md)
- [TESTING_GUIDE.md](./__tests__/TESTING_GUIDE.md)
- [methods/README.md](./methods/README.md)
