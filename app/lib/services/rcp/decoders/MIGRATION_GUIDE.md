# Migration Guide: Ultimate Decoder → Decoders Module

This guide helps migrate from the old `ultimate-decoder.ts` to the new organized decoders module.

## 🎯 Why Migrate?

The new decoders module provides:

- **Better Organization**: Methods grouped by technique
- **Easier Maintenance**: Each method in its own file
- **Better Testing**: Isolated unit tests per method
- **Performance Tracking**: Built-in metrics and analytics
- **AI-Friendly**: Clear structure for context swaps
- **Extensibility**: Easy to add new methods

## 📋 Migration Checklist

- [ ] Review new module structure
- [ ] Update imports in consuming code
- [ ] Migrate custom decoder methods
- [ ] Update tests
- [ ] Verify performance
- [ ] Remove old decoder files

## 🔄 Code Changes

### Before (Old Structure)

```typescript
// app/lib/services/rcp/ultimate-decoder.ts
import { decode, decodeWithCache } from './ultimate-decoder';

const result = decodeWithCache(encoded, divId, dataI);
if (result.success) {
  console.log(result.url);
}
```

### After (New Structure)

```typescript
// app/lib/services/rcp/decoders/index.ts
import { decode } from './decoders';

const result = await decode({
  encoded,
  divId,
  dataI,
  requestId: 'req-123'
});

if (result.success) {
  console.log(result.url);
}
```

## 📦 Import Changes

### Old Imports

```typescript
import { decode } from '@/app/lib/services/rcp/ultimate-decoder';
import { decodeWithCache } from '@/app/lib/services/rcp/ultimate-decoder';
import { clearCache } from '@/app/lib/services/rcp/ultimate-decoder';
```

### New Imports

```typescript
import { decode, clearCache, getCacheStats } from '@/app/lib/services/rcp/decoders';
// Or use default export
import decoders from '@/app/lib/services/rcp/decoders';
```

## 🔧 API Changes

### decode() Function

**Old:**
```typescript
function decode(
  encoded: string,
  divId: string = '',
  dataI: string = ''
): DecodeResult
```

**New:**
```typescript
async function decode(
  input: DecodeInput
): Promise<DecodeResult>

interface DecodeInput {
  encoded: string;
  divId?: string;
  dataI?: string;
  requestId?: string;
}
```

### Return Type

**Old:**
```typescript
interface DecodeResult {
  success: boolean;
  method?: string;
  url?: string;
  error?: string;
}
```

**New:**
```typescript
type DecodeResult = DecodeSuccess | DecodeFailure;

interface DecodeSuccess {
  success: true;
  url: string;
  method: string;
  elapsed?: number;
  metadata?: {
    attemptCount?: number;
    strategy?: 'fast-path' | 'brute-force' | 'puppeteer';
    cached?: boolean;
  };
}

interface DecodeFailure {
  success: false;
  error: string;
  elapsed?: number;
  details?: {
    methodsAttempted?: number;
    methodsTried?: string[];
    puppeteerAttempted?: boolean;
  };
}
```

## 🏗️ File Structure Migration

### Old Structure
```
app/lib/services/rcp/
├── ultimate-decoder.ts (1000+ lines)
├── srcrcp-decoder.ts
└── puppeteer-decoder.ts
```

### New Structure
```
app/lib/services/rcp/
├── decoders/
│   ├── README.md
│   ├── index.ts (main entry)
│   ├── types.ts
│   ├── constants.ts
│   ├── utils.ts
│   ├── methods/
│   │   ├── README.md
│   │   ├── caesar.ts
│   │   ├── base64.ts
│   │   ├── hex.ts
│   │   ├── xor.ts
│   │   ├── substitution.ts
│   │   └── composite.ts
│   ├── strategies/
│   │   ├── README.md
│   │   ├── fast-path.ts
│   │   ├── brute-force.ts
│   │   └── puppeteer-fallback.ts
│   └── __tests__/
│       ├── methods/
│       ├── strategies/
│       └── integration.test.ts
├── srcrcp-decoder.ts (legacy, can be removed)
└── puppeteer-decoder.ts (moved to strategies/)
```

## 🔀 Step-by-Step Migration

### Step 1: Install New Module (Already Done)

The new module structure is created in `app/lib/services/rcp/decoders/`

### Step 2: Update vidsrc-rcp-extractor.ts

**Before:**
```typescript
const { decodeWithCache } = await import('./rcp/ultimate-decoder');
const ultimateResult = decodeWithCache(
  hiddenDiv.encoded,
  hiddenDiv.divId,
  ''
);
```

**After:**
```typescript
const { decode } = await import('./rcp/decoders');
const ultimateResult = await decode({
  encoded: hiddenDiv.encoded,
  divId: hiddenDiv.divId,
  dataI: '',
  requestId
});
```

### Step 3: Migrate Decoder Methods

Move methods from `ultimate-decoder.ts` to appropriate files:

- `rot23()` → `methods/caesar.ts`
- `hexDecode()` → `methods/hex.ts`
- `xorWithDivId()` → `methods/xor.ts`
- `reverseBase64()` → `methods/base64.ts`
- etc.

### Step 4: Update Tests

**Before:**
```typescript
import { decode } from '../ultimate-decoder';

test('decode ROT-23', () => {
  const result = decode('encoded', 'divId', '');
  expect(result.success).toBe(true);
});
```

**After:**
```typescript
import { decode } from '../decoders';

test('decode ROT-23', async () => {
  const result = await decode({
    encoded: 'encoded',
    divId: 'divId'
  });
  expect(result.success).toBe(true);
});
```

### Step 5: Update Index Exports

**Before:**
```typescript
// app/lib/services/rcp/index.ts
export { decode as ultimateDecode } from './ultimate-decoder';
```

**After:**
```typescript
// app/lib/services/rcp/index.ts
export { decode as ultimateDecode } from './decoders';
```

### Step 6: Remove Old Files (After Testing)

Once migration is complete and tested:

```bash
# Backup first!
mv app/lib/services/rcp/ultimate-decoder.ts app/lib/services/rcp/ultimate-decoder.ts.backup

# After confirming everything works:
rm app/lib/services/rcp/ultimate-decoder.ts.backup
```

## 🧪 Testing Migration

### 1. Unit Tests

```bash
npm test decoders
```

### 2. Integration Tests

```bash
npm test vidsrc-rcp-extractor
```

### 3. Manual Testing

Test with known encoded samples:

```typescript
import { decode } from './decoders';

const testCases = [
  { encoded: '...', divId: '...', expected: 'https://...' },
  // Add more test cases
];

for (const test of testCases) {
  const result = await decode(test);
  console.log(result.success ? '✅' : '❌', test.encoded.substring(0, 20));
}
```

## 📊 Performance Comparison

Track performance before and after migration:

```typescript
// Before
console.time('old-decoder');
const oldResult = decodeWithCache(encoded, divId, '');
console.timeEnd('old-decoder');

// After
console.time('new-decoder');
const newResult = await decode({ encoded, divId });
console.timeEnd('new-decoder');
```

## 🐛 Common Issues

### Issue 1: Async/Await

**Problem:** New decode() is async, old was sync

**Solution:** Add `await` to all decode() calls

```typescript
// Before
const result = decode(encoded, divId, '');

// After
const result = await decode({ encoded, divId });
```

### Issue 2: Parameter Object

**Problem:** New API uses object parameter

**Solution:** Wrap parameters in object

```typescript
// Before
decode(encoded, divId, dataI)

// After
decode({ encoded, divId, dataI })
```

### Issue 3: Import Paths

**Problem:** Import paths changed

**Solution:** Update all imports

```typescript
// Before
import { decode } from './ultimate-decoder';

// After
import { decode } from './decoders';
```

## 🎓 Best Practices

1. **Use TypeScript**: Leverage type safety
2. **Handle Errors**: Check `result.success` before using `result.url`
3. **Pass Request ID**: For better logging and tracing
4. **Monitor Metrics**: Use `getMetrics()` to track performance
5. **Clear Cache**: Call `clearCache()` when needed

## 📚 Additional Resources

- [Decoders README](./README.md)
- [Methods Documentation](./methods/README.md)
- [Strategies Documentation](./strategies/README.md)
- [Type Definitions](./types.ts)

## 🆘 Need Help?

If you encounter issues during migration:

1. Check this guide
2. Review test cases
3. Enable debug mode: `setDebugMode(true)`
4. Check decoder logs
5. Consult the team

## ✅ Migration Complete Checklist

- [ ] All imports updated
- [ ] All function calls updated to async
- [ ] All parameters wrapped in objects
- [ ] Tests updated and passing
- [ ] Performance verified
- [ ] Old files removed
- [ ] Documentation updated
- [ ] Team notified

## 🎉 Benefits After Migration

- ✅ Cleaner, more maintainable code
- ✅ Better performance tracking
- ✅ Easier to add new methods
- ✅ Better test coverage
- ✅ AI-friendly structure
- ✅ Comprehensive documentation
