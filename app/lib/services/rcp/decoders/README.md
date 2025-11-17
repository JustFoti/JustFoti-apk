# RCP Decoders - Complete Testing & Reverse Engineering System

Comprehensive decoder system with automated testing, script analysis, and method discovery for RCP (Remote Content Provider) hash decoding.

## 🎯 Overview

This module provides a complete solution for:
- **Decoding RCP hashes** into M3U8 URLs using 20+ methods
- **Automated testing** against real shows/movies
- **Script analysis** to extract decoder logic from live pages
- **Method discovery** to find new decoding patterns
- **Performance tracking** with success rates and timing
- **Reverse engineering** tools for analyzing obfuscated code

## 🚀 Quick Start

### Basic Decoding

```typescript
import { decode } from './decoders';

const result = await decode({
  encoded: '=8Df6QXN7pHczZDSIhESVtke3hWY...',
  divId: 'TsA2KGDGux',
  requestId: 'req-123'
});

if (result.success) {
  console.log('URL:', result.url);
  console.log('Method:', result.method);
  console.log('Time:', result.elapsed, 'ms');
}
```

### Run Tests

```bash
# Run all decoder tests
npm run decoder:test

# Analyze scripts from extractions
npm run decoder:analyze

# Discover new methods
npm run decoder:discover

# Generate comprehensive report
npm run decoder:report

# View decoder statistics
npm run decoder:stats
```

## 📦 What's Included

### ✅ Decoding System
- **20+ Decoder Methods** - Caesar, Hex, Base64, XOR, and composite methods
- **Smart Method Selection** - Priority-based with historical success rates
- **Result Caching** - Configurable TTL-based caching
- **Performance Tracking** - Automatic metrics collection

### ✅ Testing Framework
- **Automated Testing** - Test against real shows/movies
- **Test Case Management** - Easy test case creation
- **Batch Processing** - Process multiple extractions
- **Detailed Reporting** - Success rates, method distribution

### ✅ Script Analysis
- **Pattern Detection** - Identify obfuscation patterns
- **Deobfuscation** - Automatic unpacking
- **Function Extraction** - Extract decoder functions
- **Constant Extraction** - Find keys and shifts

### ✅ Method Discovery
- **Automated Discovery** - Find new methods from failed tests
- **Confidence Scoring** - Rate potential decoders
- **Working Test Tracking** - Track which methods work

## 📊 Available Decoder Methods

### Caesar Ciphers (25% success rate)
- `rot23` - ROT-23 (shift -3) - Most common
- `rot3` - ROT-3 (shift +3)
- `rot13` - ROT-13 (shift 13)
- `caesar-brute-force` - Try all shifts

### Hexadecimal (20% success rate)
- `hex` - Simple hex to ASCII
- `hex-xor` - Hex + XOR with divId
- `hex-double-xor` - Hex + double XOR
- `double-hex` - Hex decoded twice

### Base64 (10-15% success rate)
- `base64` - Standard Base64
- `url-safe-base64` - URL-safe variant
- `reverse-base64` - Reverse then decode
- `base64-caesar` - Base64 + ROT-3
- `reverse-base64-sub3` - Reverse + Base64 + substitution
- `double-base64` - Base64 twice

### XOR (20% success rate)
- `xor-divid` - XOR with divId as key
- `xor-fixed-key` - XOR with known keys
- `xor-caesar` - XOR + ROT-3
- `double-xor` - XOR twice
- `xor-base64` - XOR + Base64

## 🧪 Testing & Reverse Engineering

### Add Test Cases

```typescript
import { testFramework } from './decoders/__tests__/test-framework';

testFramework.addTest({
  id: 'fight-club',
  title: 'Fight Club',
  type: 'movie',
  tmdbId: 550,
  encoded: '=8Df6QXN7pHczZDSIhESVtke3hWY...',
  divId: 'TsA2KGDGux',
});
```

### Analyze Scripts

```typescript
import { scriptAnalyzer } from './decoders/__tests__/script-analyzer';

const analysis = scriptAnalyzer.analyze(scriptContent, 'script-url');
console.log('Decoder Functions:', analysis.decoderFunctions.length);
```

### Discover New Methods

```bash
npm run decoder:discover
```

## 📝 Adding New Decoders

```typescript
import { DecoderMethod } from './types';
import { validateUrl } from './utils';

export const myDecoder: DecoderMethod = {
  id: 'my-decoder',
  name: 'My Decoder',
  category: 'caesar',
  priority: 5,
  
  fn: (input: string): string | null => {
    try {
      const decoded = yourDecodingFunction(input);
      const validation = validateUrl(decoded);
      return validation.valid ? decoded : null;
    } catch {
      return null;
    }
  },
};
```

See [methods/README.md](./methods/README.md) for detailed instructions.

## 📚 Documentation

- **[TESTING_GUIDE.md](./__tests__/TESTING_GUIDE.md)** - Complete testing guide
- **[methods/README.md](./methods/README.md)** - Method implementation guide
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Migration from old system

## 🎯 Complete Workflow

```typescript
// 1. Extract from live page
const extraction = { id: 'inception', title: 'Inception', ... };
autoTest.saveExtraction(extraction);

// 2. Create and run test
const testCase = autoTest.createTestCase(extraction);
const result = await testFramework.runTest(testCase, decode);

// 3. If failed, analyze scripts
if (!result.passed) {
  const analyses = autoTest.analyzeExtraction(extraction);
  // Implement new method based on findings
}
```

## 📈 Performance

| Strategy | Timeout | Success Rate |
|----------|---------|--------------|
| Fast Path | 100ms | 80% |
| Brute Force | 500ms | 15% |
| Puppeteer | 10s | 5% |

## 🐛 Debugging

```typescript
import { setDebugMode } from './decoders';
setDebugMode(true);
```

## 📄 License

MIT
