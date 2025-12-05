const vm = require('vm');

// Test basic VM functionality
const ctx: Record<string, unknown> = {};
vm.createContext(ctx);

// Bootstrap with built-ins
vm.runInContext(`
  this.String = String;
  this.Array = Array;
  this.Object = Object;
  this.parseInt = parseInt;
`, ctx);

// Add window mock
const mockWindow: Record<string, unknown> = {};
ctx.window = mockWindow;
ctx.document = { getElementById: () => ({ innerHTML: 'test123' }) };
ctx.console = { log: (...args: unknown[]) => console.log('[VM]', ...args) };

// Test simple script that sets window property
vm.runInContext(`
  window.result = "hello world";
  console.log("Script executed!");
  console.log("String available:", typeof String);
  console.log("parseInt available:", typeof parseInt);
`, ctx);

console.log('Result from window:', mockWindow.result);
console.log('Test passed!');
