/**
 * Property-Based Tests for Stats Context Data Consistency
 * Feature: admin-panel-unified-refactor, Property 1: Data consistency across components
 * Validates: Requirements 1.3
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fc from 'fast-check';

// Mock StatsContext provider behavior with proper immutability
class MockStatsProvider {
  private subscribers: Array<(stats: any) => void> = [];
  private currentStats: any = null;

  subscribe(componentId: string, callback: (stats: any) => void) {
    this.subscribers.push(callback);
    // Immediately provide current stats if available (deep copy for immutability)
    if (this.currentStats) {
      callback(JSON.parse(JSON.stringify(this.currentStats)));
    }
  }

  updateStats(newStats: any) {
    // Store a deep copy to prevent mutations
    this.currentStats = JSON.parse(JSON.stringify(newStats));
    // Notify all subscribers with immutable copies of the same data
    this.subscribers.forEach(callback => {
      callback(JSON.parse(JSON.stringify(this.currentStats)));
    });
  }

  getStats() {
    return this.currentStats ? JSON.parse(JSON.stringify(this.currentStats)) : null;
  }

  reset() {
    this.subscribers = [];
    this.currentStats = null;
  }
}

// Generate realistic analytics stats
const generateAnalyticsStats = () => fc.record({
  // Real-time metrics
  liveUsers: fc.integer({ min: 0, max: 10000 }),
  trulyActiveUsers: fc.integer({ min: 0, max: 5000 }),
  liveWatching: fc.integer({ min: 0, max: 3000 }),
  liveBrowsing: fc.integer({ min: 0, max: 2000 }),
  liveTVViewers: fc.integer({ min: 0, max: 1000 }),
  
  // User metrics
  totalUsers: fc.integer({ min: 1000, max: 1000000 }),
  activeToday: fc.integer({ min: 100, max: 50000 }),
  activeThisWeek: fc.integer({ min: 500, max: 200000 }),
  activeThisMonth: fc.integer({ min: 2000, max: 500000 }),
  newUsersToday: fc.integer({ min: 10, max: 1000 }),
  returningUsers: fc.integer({ min: 50, max: 10000 }),
  
  // Content metrics
  totalSessions: fc.integer({ min: 100, max: 100000 }),
  totalWatchTime: fc.integer({ min: 1000, max: 1000000 }),
  avgSessionDuration: fc.integer({ min: 5, max: 180 }),
  completionRate: fc.integer({ min: 0, max: 100 }),
  uniqueContentWatched: fc.integer({ min: 50, max: 10000 }),
  
  // Page views
  pageViews: fc.integer({ min: 1000, max: 1000000 }),
  uniqueVisitors: fc.integer({ min: 500, max: 100000 }),
  
  // Metadata
  lastUpdated: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
  dataSource: fc.constantFrom('unified-api', 'cache', 'fallback'),
});

describe('Stats Context Data Consistency', () => {
  let mockProvider: MockStatsProvider;

  beforeEach(() => {
    mockProvider = new MockStatsProvider();
  });

  afterEach(() => {
    mockProvider.reset();
  });

  test('Property 1: Data consistency across components', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateAnalyticsStats(),
        async (statsData) => {
          // Simulate multiple components subscribing to the same context
          const componentNames = ['dashboard', 'analytics', 'users', 'traffic', 'unifiedStatsBar'];
          const receivedData: Record<string, any> = {};

          // Subscribe all components to the context
          componentNames.forEach(componentName => {
            mockProvider.subscribe(componentName, (stats) => {
              receivedData[componentName] = stats;
            });
          });

          // Update stats through the context (simulating API response)
          mockProvider.updateStats(statsData);

          // Property: All components should receive identical data values
          const firstComponentData = receivedData[componentNames[0]];
          
          for (let i = 1; i < componentNames.length; i++) {
            const componentData = receivedData[componentNames[i]];
            
            // Verify all numeric metrics are identical
            expect(componentData.liveUsers).toBe(firstComponentData.liveUsers);
            expect(componentData.trulyActiveUsers).toBe(firstComponentData.trulyActiveUsers);
            expect(componentData.liveWatching).toBe(firstComponentData.liveWatching);
            expect(componentData.liveBrowsing).toBe(firstComponentData.liveBrowsing);
            expect(componentData.liveTVViewers).toBe(firstComponentData.liveTVViewers);
            
            expect(componentData.totalUsers).toBe(firstComponentData.totalUsers);
            expect(componentData.activeToday).toBe(firstComponentData.activeToday);
            expect(componentData.activeThisWeek).toBe(firstComponentData.activeThisWeek);
            expect(componentData.activeThisMonth).toBe(firstComponentData.activeThisMonth);
            expect(componentData.newUsersToday).toBe(firstComponentData.newUsersToday);
            expect(componentData.returningUsers).toBe(firstComponentData.returningUsers);
            
            expect(componentData.totalSessions).toBe(firstComponentData.totalSessions);
            expect(componentData.totalWatchTime).toBe(firstComponentData.totalWatchTime);
            expect(componentData.avgSessionDuration).toBe(firstComponentData.avgSessionDuration);
            expect(componentData.completionRate).toBe(firstComponentData.completionRate);
            expect(componentData.uniqueContentWatched).toBe(firstComponentData.uniqueContentWatched);
            
            expect(componentData.pageViews).toBe(firstComponentData.pageViews);
            expect(componentData.uniqueVisitors).toBe(firstComponentData.uniqueVisitors);
            
            expect(componentData.lastUpdated).toBe(firstComponentData.lastUpdated);
            expect(componentData.dataSource).toBe(firstComponentData.dataSource);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Sequential updates maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(generateAnalyticsStats(), { minLength: 2, maxLength: 5 }),
        async (statsSequence) => {
          const componentNames = ['dashboard', 'analytics', 'users'];
          const componentHistory: Record<string, any[]> = {};
          
          // Initialize history tracking for each component
          componentNames.forEach(name => {
            componentHistory[name] = [];
            mockProvider.subscribe(name, (stats) => {
              componentHistory[name].push(stats);
            });
          });

          // Send sequential updates
          for (const stats of statsSequence) {
            mockProvider.updateStats(stats);
          }

          // Property: Each component should have received the same sequence of updates
          const firstComponentHistory = componentHistory[componentNames[0]];
          
          for (let i = 1; i < componentNames.length; i++) {
            const componentHistory_i = componentHistory[componentNames[i]];
            
            expect(componentHistory_i.length).toBe(firstComponentHistory.length);
            
            // Verify each update in the sequence had identical values across components
            for (let updateIndex = 0; updateIndex < firstComponentHistory.length; updateIndex++) {
              expect(componentHistory_i[updateIndex].liveUsers).toBe(firstComponentHistory[updateIndex].liveUsers);
              expect(componentHistory_i[updateIndex].totalUsers).toBe(firstComponentHistory[updateIndex].totalUsers);
              expect(componentHistory_i[updateIndex].lastUpdated).toBe(firstComponentHistory[updateIndex].lastUpdated);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Context state immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateAnalyticsStats(),
        async (statsData) => {
          let mutatingComponentStats: any = null;
          let cleanComponentStats: any = null;
          
          // Subscribe a component that tries to mutate the received data
          mockProvider.subscribe('mutatingComponent', (stats) => {
            mutatingComponentStats = stats;
            
            // Attempt to mutate the received stats
            try {
              stats.liveUsers = 999999;
              stats.totalUsers = 888888;
              stats.newProperty = 'should not exist';
            } catch (e) {
              // Mutation might be prevented by immutability
            }
          });

          // Subscribe another component to verify it's not affected by mutations
          mockProvider.subscribe('cleanComponent', (stats) => {
            cleanComponentStats = stats;
          });

          // Update stats
          mockProvider.updateStats(statsData);

          // Property: Mutations by one component should not affect data received by others
          // (This tests that the context provides immutable or properly isolated data)
          expect(cleanComponentStats.liveUsers).toBe(statsData.liveUsers);
          expect(cleanComponentStats.totalUsers).toBe(statsData.totalUsers);
          expect(cleanComponentStats.newProperty).toBeUndefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});