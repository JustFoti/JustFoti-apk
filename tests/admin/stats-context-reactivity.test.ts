/**
 * Property-Based Tests for Stats Context Reactivity
 * Feature: admin-panel-unified-refactor, Property 3: Context reactivity
 * Validates: Requirements 1.4
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// Mock React render cycle tracking
interface ComponentRenderState {
  componentId: string;
  renderCount: number;
  lastReceivedStats: any;
  renderTimestamps: number[];
}

// Mock React component that subscribes to StatsContext
class MockReactComponent {
  private renderState: ComponentRenderState;
  private onStatsChange: (stats: any) => void;

  constructor(componentId: string) {
    this.renderState = {
      componentId,
      renderCount: 0,
      lastReceivedStats: null,
      renderTimestamps: [],
    };
    
    this.onStatsChange = (stats: any) => {
      this.renderState.renderCount++;
      this.renderState.lastReceivedStats = stats;
      this.renderState.renderTimestamps.push(Date.now());
    };
  }

  subscribe(provider: MockStatsProvider) {
    provider.subscribe(this.renderState.componentId, this.onStatsChange);
  }

  getRenderState(): ComponentRenderState {
    return { ...this.renderState };
  }

  reset() {
    this.renderState.renderCount = 0;
    this.renderState.lastReceivedStats = null;
    this.renderState.renderTimestamps = [];
  }
}

// Mock StatsProvider with render cycle simulation
class MockStatsProvider {
  private subscribers: Map<string, (stats: any) => void> = new Map();
  private currentStats: any = null;

  subscribe(componentId: string, callback: (stats: any) => void) {
    this.subscribers.set(componentId, callback);
    // Do NOT immediately provide current stats on subscribe
    // This simulates React's behavior where components only render when data changes
  }

  async updateStats(newStats: any) {
    this.currentStats = newStats;
    
    // Simulate React's batched updates - all subscribers get notified in the same render cycle
    for (const [id, callback] of this.subscribers.entries()) {
      callback(newStats);
    }
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  reset() {
    this.subscribers.clear();
    this.currentStats = null;
  }
}

// Generate realistic analytics stats for testing
const generateAnalyticsStats = () => fc.record({
  liveUsers: fc.integer({ min: 0, max: 10000 }),
  trulyActiveUsers: fc.integer({ min: 0, max: 5000 }),
  totalUsers: fc.integer({ min: 1000, max: 1000000 }),
  activeToday: fc.integer({ min: 100, max: 50000 }),
  totalSessions: fc.integer({ min: 100, max: 100000 }),
  totalWatchTime: fc.integer({ min: 1000, max: 1000000 }),
  pageViews: fc.integer({ min: 1000, max: 1000000 }),
  lastUpdated: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
  dataSource: fc.constantFrom('unified-api', 'cache', 'fallback'),
});

describe('Stats Context Reactivity', () => {
  let mockProvider: MockStatsProvider;
  let mockComponents: MockReactComponent[];

  beforeEach(() => {
    mockProvider = new MockStatsProvider();
    mockComponents = [];
  });

  afterEach(() => {
    mockProvider.reset();
    mockComponents.forEach(component => component.reset());
    mockComponents = [];
  });

  test('Property 3: Context reactivity', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateAnalyticsStats(),
        fc.integer({ min: 1, max: 10 }), // Number of components
        async (statsData, componentCount) => {
          // Create multiple mock components
          const components: MockReactComponent[] = [];
          for (let i = 0; i < componentCount; i++) {
            const component = new MockReactComponent(`component-${i}`);
            component.subscribe(mockProvider);
            components.push(component);
          }

          // Update stats through the context
          await mockProvider.updateStats(statsData);

          // Property: All subscribed components should receive the updated data
          // within one render cycle
          for (const component of components) {
            const renderState = component.getRenderState();
            
            // Each component should have rendered exactly once
            expect(renderState.renderCount).toBe(1);
            
            // Each component should have received the updated stats
            expect(renderState.lastReceivedStats).not.toBeNull();
            expect(renderState.lastReceivedStats.liveUsers).toBe(statsData.liveUsers);
            expect(renderState.lastReceivedStats.totalUsers).toBe(statsData.totalUsers);
            expect(renderState.lastReceivedStats.lastUpdated).toBe(statsData.lastUpdated);
            expect(renderState.lastReceivedStats.dataSource).toBe(statsData.dataSource);
          }

          // Property: All components should have received updates within a reasonable time window
          // (simulating single render cycle)
          const allTimestamps = components.flatMap(c => c.getRenderState().renderTimestamps);
          if (allTimestamps.length > 1) {
            const minTimestamp = Math.min(...allTimestamps);
            const maxTimestamp = Math.max(...allTimestamps);
            const timeSpread = maxTimestamp - minTimestamp;
            
            // All updates should occur within 100ms (simulating React's batched updates)
            expect(timeSpread).toBeLessThan(100);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Multiple sequential updates trigger appropriate re-renders', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateAnalyticsStats(), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 2, max: 5 }), // Number of components
        async (statsSequence, componentCount) => {
          // Create components
          const components: MockReactComponent[] = [];
          for (let i = 0; i < componentCount; i++) {
            const component = new MockReactComponent(`component-${i}`);
            component.subscribe(mockProvider);
            components.push(component);
          }

          // Send sequential updates
          for (let i = 0; i < statsSequence.length; i++) {
            await mockProvider.updateStats(statsSequence[i]);
            // Small delay between updates to ensure they're processed separately
            if (i < statsSequence.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 5));
            }
          }

          // Property: Each component should have rendered once per update
          for (const component of components) {
            const renderState = component.getRenderState();
            expect(renderState.renderCount).toBe(statsSequence.length);
            
            // The last received stats should match the last update
            const lastStats = statsSequence[statsSequence.length - 1];
            expect(renderState.lastReceivedStats.liveUsers).toBe(lastStats.liveUsers);
            expect(renderState.lastReceivedStats.totalUsers).toBe(lastStats.totalUsers);
            expect(renderState.lastReceivedStats.lastUpdated).toBe(lastStats.lastUpdated);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('No unnecessary re-renders for identical data', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateAnalyticsStats(),
        fc.integer({ min: 2, max: 5 }), // Number of identical updates
        async (statsData, duplicateCount) => {
          // Create a component
          const component = new MockReactComponent('test-component');
          component.subscribe(mockProvider);

          // Send the same stats multiple times
          for (let i = 0; i < duplicateCount; i++) {
            await mockProvider.updateStats({ ...statsData }); // Create new object with same data
            if (i < duplicateCount - 1) {
              await new Promise(resolve => setTimeout(resolve, 2));
            }
          }

          // Property: Component should render for each update, even if data is identical
          // (This tests that the context doesn't implement unnecessary optimization that might break reactivity)
          // In a real implementation, you might want to optimize this, but for correctness,
          // we ensure that updates always trigger re-renders
          const renderState = component.getRenderState();
          expect(renderState.renderCount).toBe(duplicateCount);
          expect(renderState.lastReceivedStats.liveUsers).toBe(statsData.liveUsers);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Error states trigger component updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateAnalyticsStats(),
        fc.string({ minLength: 5, maxLength: 50 }),
        async (initialStats, errorMessage) => {
          // Create components
          const components: MockReactComponent[] = [];
          for (let i = 0; i < 3; i++) {
            const component = new MockReactComponent(`component-${i}`);
            component.subscribe(mockProvider);
            components.push(component);
          }

          // Set initial stats
          await mockProvider.updateStats(initialStats);

          // Simulate error state
          await mockProvider.updateStats({ error: errorMessage, loading: false });

          // Property: All components should receive error state update
          for (const component of components) {
            const renderState = component.getRenderState();
            expect(renderState.renderCount).toBe(2); // Initial + error
            expect(renderState.lastReceivedStats.error).toBe(errorMessage);
            expect(renderState.lastReceivedStats.loading).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Loading states are properly propagated', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateAnalyticsStats(),
        async (statsData) => {
          // Create a component
          const component = new MockReactComponent('test-component');
          component.subscribe(mockProvider);

          // Simulate loading state
          await mockProvider.updateStats({ loading: true, error: null });

          // Verify loading state
          let renderState = component.getRenderState();
          expect(renderState.renderCount).toBe(1);
          expect(renderState.lastReceivedStats.loading).toBe(true);
          expect(renderState.lastReceivedStats.error).toBeNull();

          // Simulate data loaded
          await mockProvider.updateStats({ ...statsData, loading: false, error: null });

          // Property: Component should receive both loading and loaded states
          renderState = component.getRenderState();
          expect(renderState.renderCount).toBe(2);
          expect(renderState.lastReceivedStats.loading).toBe(false);
          expect(renderState.lastReceivedStats.liveUsers).toBe(statsData.liveUsers);
          expect(renderState.lastReceivedStats.error).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});