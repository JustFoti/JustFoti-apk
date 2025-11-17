# Decoder Methods

This directory contains individual decoder method implementations.

## 📁 File Organization

Each file contains related decoder methods grouped by technique:

- **caesar.ts** - Caesar cipher variants (ROT13, ROT23, all shifts)
- **base64.ts** - Base64 decoding variants (standard, URL-safe, reversed)
- **hex.ts** - Hexadecimal decoding methods
- **xor.ts** - XOR-based decoders (with divId, with keys)
- **substitution.ts** - Substitution cipher methods
- **composite.ts** - Multi-step composite decoders

## 🎯 Method Implementation Guidelines

### 1. Function Signature

All decoder methods must follow this signature:

```typescript
export function methodName(
  input: string,
  divId?: string,
  dataI?: string
): string | null {
  // Implementation
}
```

### 2. Error Handling

- Return `null` on failure (don't throw)
- Use try-catch for operations that might throw
- Validate inputs before processing

```typescript
export function exampleDecoder(input: string): string | null {
  try {
    if (!input || input.length < 10) return null;
    
    // Decoding logic here
    const result = decode(input);
    
    // Validate result
    if (!isValidUrl(result)) return null;
    
    return result;
  } catch {
    return null;
  }
}
```

### 3. Performance

- Keep methods fast (< 10ms per call)
- Avoid expensive operations in loops
- Use early returns for invalid inputs

### 4. Documentation

Each method must have:
- JSDoc comment explaining what it does
- Success rate estimate (if known)
- Example usage
- Notes about when it's typically used

```typescript
/**
 * ROT-23 (Caesar +3) Decoder
 * 
 * Most common encoding method. Shifts each letter by 3 positions.
 * 
 * Success Rate: ~25%
 * Speed: Very Fast (< 1ms)
 * 
 * @param input - Encoded string
 * @returns Decoded string or null
 * 
 * @example
 * rot23("Khoor") // Returns "Hello"
 */
export function rot23(input: string): string | null {
  // Implementation
}
```

### 5. Testing

Each method should have corresponding tests in `__tests__/methods/`:

```typescript
describe('rot23', () => {
  it('should decode ROT-23 encoded string', () => {
    const result = rot23('encoded_string');
    expect(result).toBe('expected_output');
  });

  it('should return null for invalid input', () => {
    const result = rot23('');
    expect(result).toBeNull();
  });
});
```

## 📊 Method Categories

### Caesar Ciphers (caesar.ts)
- ROT-13, ROT-23, and all 26 shifts
- Most common encoding method
- Fast execution (< 1ms)

### Base64 (base64.ts)
- Standard Base64
- URL-safe Base64
- Reversed Base64
- Base64 with character substitution

### Hexadecimal (hex.ts)
- Standard hex decode
- Hex with colons
- Hex with 'g' prefix
- Hex + ROT combinations

### XOR (xor.ts)
- XOR with divId
- XOR with known keys
- Double XOR
- XOR + Base64 combinations

### Substitution (substitution.ts)
- Atbash cipher
- Custom substitution tables
- Frequency analysis-based

### Composite (composite.ts)
- Multi-step decoders
- Reverse + Base64 - 3
- Hex + Double XOR
- Complex transformation chains

## 🔧 Adding New Methods

1. **Identify the pattern** from failed decode attempts
2. **Create the decoder function** in appropriate file
3. **Add tests** in `__tests__/methods/`
4. **Register** in `../index.ts`
5. **Document** success rate and usage
6. **Update** this README

## 📈 Success Rate Tracking

Methods are automatically tracked for success rate. View stats:

```typescript
import { getMethodStats } from '../index';

const stats = getMethodStats('rot23');
console.log(stats.successRate); // e.g., 0.25 (25%)
```

## 🐛 Debugging Methods

Enable debug mode to see detailed logs:

```typescript
import { setDebugMode } from '../index';

setDebugMode(true);
// Now all decoder attempts will be logged
```

## 📝 Method Naming Convention

- Use descriptive names: `rot23`, `hexDecode`, `xorWithDivId`
- Avoid abbreviations unless standard (ROT, XOR, etc.)
- Use camelCase
- Prefix composite methods with component names: `hexRot23`, `base64Xor`

## 🔍 Pattern Recognition

When adding new methods, look for these patterns in encoded strings:

- **Starts with '='** → Likely Base64 variant
- **Only hex chars** → Hex encoding
- **Contains +, /, =** → Standard Base64
- **Contains -, _, =** → URL-safe Base64
- **Alphabetic only** → Caesar/ROT cipher
- **Mixed case + numbers** → Possible substitution

## 📚 References

- [Caesar Cipher](https://en.wikipedia.org/wiki/Caesar_cipher)
- [Base64 Encoding](https://en.wikipedia.org/wiki/Base64)
- [XOR Cipher](https://en.wikipedia.org/wiki/XOR_cipher)
- [Substitution Cipher](https://en.wikipedia.org/wiki/Substitution_cipher)
