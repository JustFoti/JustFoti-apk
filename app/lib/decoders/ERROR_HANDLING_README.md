# Error Handling and Diagnostics

This document describes the error handling and diagnostics system implemented for the decoder library.

## Overview

The error handling system provides:
1. **Structured error types** with context preservation
2. **Error factory functions** for creating consistent errors
3. **Logging utilities** with detailed diagnostics
4. **Pattern storage** for saving failed decode attempts
5. **Analysis tools** for identifying unknown patterns

## Components

### 1. Error Handler (`error-handler.ts`)

Provides structured error handling with context preservation.

#### Error Factory Functions

```typescript
// Create specific error types
createInvalidInputError(message, encodedString)
createDecodeFailedError(message, encodedString, pattern, attemptedDecoders)
createNoUrlsFoundError(message, encodedString, pattern)
createInvalidPatternError(message, encodedString, pattern)
createValidationFailedError(message, encodedString, attemptedDecoders)

// Generic error factory
createDecoderError(type, message, context)
```

#### Logging Functions

```typescript
// Log errors with context
logDecoderError(error, additionalContext)

// Log successful decodes
logDecodeSuccess(encodedString, pattern, decoderUsed, urlCount, decodeTime)

// Log decode attempts
logDecodeAttempt(encodedString, pattern, decoderName)
```

#### Utility Functions

```typescript
// Format error for display
formatErrorMessage(error)

// Check if object is a DecoderError
isDecoderError(error)

// Wrap decoder with error handling
withErrorHandling(decoderName, decoderFn)
```

### 2. Pattern Storage (`pattern-storage.ts`)

Saves failed decode attempts for analysis and pattern discovery.

#### Core Functionality

```typescript
// Save a failed decode attempt
saveFailedDecode(encodedString, detectedPattern, attemptedDecoders, error)

// Get all failed attempts
patternStorage.getFailedAttempts()

// Get unknown pattern attempts only
getUnknownPatterns()

// Get attempts grouped by pattern
patternStorage.getAttemptsByPattern()
```

#### Analysis Features

```typescript
// Get statistics
getStorageStatistics()
// Returns: { totalAttempts, unknownPatterns, byPattern, recentAttempts }

// Find similar failed attempts
patternStorage.findSimilarAttempts(encodedString, limit)

// Export to JSON for analysis
exportFailedAttempts()
```

#### Storage Management

```typescript
// Clear storage
patternStorage.clear()

// Set max storage size
patternStorage.setMaxStorageSize(size)
```

## Integration

The error handling system is automatically integrated into the unified decoder interface:

```typescript
import { decode } from './lib/decoders';

// Errors are automatically logged and stored
const result = await decode(encodedString);

if (!result.success) {
  // Failed attempts are automatically saved to pattern storage
  console.error(result.error);
}
```

## Failed Decode Attempt Structure

Each failed attempt includes:

```typescript
{
  timestamp: string;              // ISO timestamp
  encodedString: string;          // The string that failed
  detectedPattern: PatternType;   // Detected pattern type
  attemptedDecoders: string[];    // Decoders that were tried
  error: DecoderError;            // Error information
  diagnostics: {
    encodedLength: number;
    characterAnalysis: {
      hasColons: boolean;
      hasBase64Chars: boolean;
      hasHexChars: boolean;
      hasSpecialChars: boolean;
      uniqueCharCount: number;
    };
    sample: string;               // First 100 chars
  };
}
```

## Usage Examples

### Basic Error Handling

```typescript
import { decode, isDecoderError } from './lib/decoders';

try {
  const result = await decode(encodedString);
  
  if (!result.success) {
    console.error('Decode failed:', result.error);
  }
} catch (error) {
  if (isDecoderError(error)) {
    console.error('Decoder error:', formatErrorMessage(error));
  }
}
```

### Analyzing Failed Attempts

```typescript
import { getUnknownPatterns, getStorageStatistics } from './lib/decoders';

// Get statistics
const stats = getStorageStatistics();
console.log(`Total failed attempts: ${stats.totalAttempts}`);
console.log(`Unknown patterns: ${stats.unknownPatterns}`);

// Get unknown pattern attempts for analysis
const unknownAttempts = getUnknownPatterns();
for (const attempt of unknownAttempts) {
  console.log('Unknown pattern:', attempt.diagnostics.sample);
  console.log('Character analysis:', attempt.diagnostics.characterAnalysis);
}
```

### Exporting for Analysis

```typescript
import { exportFailedAttempts } from './lib/decoders';

// Export all failed attempts as JSON
const json = exportFailedAttempts();

// Save to file or send to analysis service
console.log(json);
```

### Finding Similar Patterns

```typescript
import { patternStorage } from './lib/decoders';

// Find similar failed attempts
const similar = patternStorage.findSimilarAttempts(newEncodedString, 5);

console.log('Similar failed attempts:');
for (const attempt of similar) {
  console.log(attempt.encodedString);
}
```

## Benefits

1. **Automatic Error Tracking**: All decode failures are automatically logged and stored
2. **Pattern Discovery**: Unknown patterns are preserved for analysis
3. **Detailed Diagnostics**: Character composition analysis helps identify new patterns
4. **Context Preservation**: Full context is maintained for debugging
5. **Similarity Analysis**: Find similar failed attempts to identify pattern variations
6. **Export Capability**: Export data for offline analysis

## Requirements Satisfied

- ✅ 8.1: Error logging with context preservation
- ✅ 8.2: Graceful error handling without crashes
- ✅ 8.3: Tracking attempted decoders and failure reasons
- ✅ 8.4: Detailed error messages for debugging
- ✅ 8.5: Unknown pattern preservation for analysis
- ✅ 4.4: Flagging samples that cannot be decoded
