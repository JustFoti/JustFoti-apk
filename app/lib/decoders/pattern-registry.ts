/**
 * Pattern Registry System
 * 
 * Manages registration and retrieval of obfuscation pattern definitions.
 * Each pattern includes its decoder, detector, and metadata.
 */

import { PatternType, PatternDefinition } from './types';

/**
 * Registry for managing obfuscation pattern definitions
 */
export class PatternRegistry {
  private patterns: Map<PatternType, PatternDefinition>;

  constructor() {
    this.patterns = new Map();
  }

  /**
   * Registers a new pattern definition
   * 
   * @param pattern - The pattern definition to register
   * @throws Error if pattern type is already registered
   */
  register(pattern: PatternDefinition): void {
    if (this.patterns.has(pattern.type)) {
      throw new Error(`Pattern type ${pattern.type} is already registered`);
    }

    // Validate pattern definition
    this.validatePattern(pattern);

    this.patterns.set(pattern.type, pattern);
  }

  /**
   * Retrieves a pattern definition by type
   * 
   * @param type - The pattern type to retrieve
   * @returns The pattern definition, or undefined if not found
   */
  get(type: PatternType): PatternDefinition | undefined {
    return this.patterns.get(type);
  }

  /**
   * Gets all registered pattern types
   * 
   * @returns Array of registered pattern types
   */
  getAllTypes(): PatternType[] {
    return Array.from(this.patterns.keys());
  }

  /**
   * Gets all registered pattern definitions
   * 
   * @returns Array of registered pattern definitions
   */
  getAll(): PatternDefinition[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Checks if a pattern type is registered
   * 
   * @param type - The pattern type to check
   * @returns true if the pattern is registered
   */
  has(type: PatternType): boolean {
    return this.patterns.has(type);
  }

  /**
   * Unregisters a pattern definition
   * 
   * @param type - The pattern type to unregister
   * @returns true if the pattern was unregistered, false if it wasn't registered
   */
  unregister(type: PatternType): boolean {
    return this.patterns.delete(type);
  }

  /**
   * Clears all registered patterns
   */
  clear(): void {
    this.patterns.clear();
  }

  /**
   * Gets the number of registered patterns
   * 
   * @returns The number of registered patterns
   */
  size(): number {
    return this.patterns.size;
  }

  /**
   * Validates a pattern definition
   * 
   * @param pattern - The pattern definition to validate
   * @throws Error if the pattern definition is invalid
   */
  private validatePattern(pattern: PatternDefinition): void {
    if (!pattern.type) {
      throw new Error('Pattern definition must have a type');
    }

    if (!pattern.name || typeof pattern.name !== 'string') {
      throw new Error('Pattern definition must have a valid name');
    }

    if (!pattern.description || typeof pattern.description !== 'string') {
      throw new Error('Pattern definition must have a valid description');
    }

    if (!Array.isArray(pattern.characteristics)) {
      throw new Error('Pattern definition must have a characteristics array');
    }

    if (typeof pattern.decoder !== 'function') {
      throw new Error('Pattern definition must have a decoder function');
    }

    if (typeof pattern.detector !== 'function') {
      throw new Error('Pattern definition must have a detector function');
    }

    if (!Array.isArray(pattern.examples)) {
      throw new Error('Pattern definition must have an examples array');
    }
  }
}

/**
 * Global singleton instance of the pattern registry
 */
export const patternRegistry = new PatternRegistry();

/**
 * Initializes the pattern registry with all known patterns
 * This function should be called once during application startup
 */
export function initializePatternRegistry(): void {
  // Import pattern definitions dynamically to avoid circular dependencies
  import('./pattern-definitions').then(({ ALL_PATTERNS }) => {
    ALL_PATTERNS.forEach(pattern => {
      if (!patternRegistry.has(pattern.type)) {
        patternRegistry.register(pattern);
      }
    });
  }).catch(error => {
    console.error('Failed to initialize pattern registry:', error);
  });
}

/**
 * Synchronously initializes the pattern registry with all known patterns
 * Use this when dynamic imports are not available or needed
 * 
 * @param patterns - Array of pattern definitions to register
 */
export function initializePatternRegistrySync(patterns: PatternDefinition[]): void {
  patterns.forEach(pattern => {
    if (!patternRegistry.has(pattern.type)) {
      patternRegistry.register(pattern);
    }
  });
}
