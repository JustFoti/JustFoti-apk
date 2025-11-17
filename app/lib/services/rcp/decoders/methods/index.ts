/**
 * Decoder Methods - Index
 * 
 * Exports all decoder methods and registers them with the registry.
 */

import { registry } from '../registry';
import { caesarDecoders } from './caesar';
import { hexDecoders } from './hex';
import { base64Decoders } from './base64';
import { xorDecoders } from './xor';

/**
 * All decoder methods
 */
export const allDecoders = [
  ...caesarDecoders,
  ...hexDecoders,
  ...base64Decoders,
  ...xorDecoders,
];

/**
 * Register all decoders
 */
export function registerAllDecoders(): void {
  for (const decoder of allDecoders) {
    registry.register(decoder);
  }
}

/**
 * Auto-register on import
 */
registerAllDecoders();

/**
 * Export individual categories
 */
export { caesarDecoders } from './caesar';
export { hexDecoders } from './hex';
export { base64Decoders } from './base64';
export { xorDecoders } from './xor';

/**
 * Export registry for external use
 */
export { registry } from '../registry';
