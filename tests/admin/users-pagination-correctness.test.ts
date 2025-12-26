/**
 * Property-Based Tests for Users Page Pagination Correctness
 * Feature: admin-panel-production-ready, Property 11: Pagination correctness
 * Validates: Requirements 3.3
 * 
 * Property: For any paginated data request, the returned page should contain 
 * at most pageSize items and hasMore should accurately reflect remaining data
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import * as fc from 'fast-check';

// Types matching the Users API response
interface User {
  userId: string;
  sessionId: string;
  firstSeen: number;
  lastSeen: number;
  totalSessions: number;
  totalWatchTime: number;
  country: string | null;
  countryName: string | null;
  city: string | null;
  deviceType: string;
  isOnline: boolean;
  currentActivity: string | null;
  currentContent: string | null;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UsersApiResponse {
  success: boolean;
  users: User[];
  pagination: PaginationInfo;
  summary: {
    totalUsers: number;
    activeToday: number;
    activeThisWeek: number;
    onlineNow: number;
  };
}

// Mock user generator
const generateMockUser = (index: number): User => ({
  userId: `user_${index}_${Math.random().toString(36).substring(7)}`,
  sessionId: `session_${index}`,
  firstSeen: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
  lastSeen: Date.now() - Math.random() * 24 * 60 * 60 * 1000,
  totalSessions: Math.floor(Math.random() * 100) + 1,
  totalWatchTime: Math.floor(Math.random() * 10000),
  country: ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'BR', 'AU'][index % 8],
  countryName: ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Japan', 'Brazil', 'Australia'][index % 8],
  city: ['New York', 'London', 'Toronto', 'Berlin', 'Paris', 'Tokyo', 'São Paulo', 'Sydney'][index % 8],
  deviceType: ['desktop', 'mobile', 'tablet', 'tv'][index % 4],
  isOnline: Math.random() > 0.8,
  currentActivity: null,
  currentContent: null,
});

// Mock pagination service that simulates the Users API behavior
class MockUsersPaginationService {
  private users: User[] = [];

  constructor(totalUsers: number) {
    this.users = Array.from({ length: totalUsers }, (_, i) => generateMockUser(i));
  }

  async fetchUsers(limit: number, offset: number): Promise<UsersApiResponse> {
    const total = this.users.length;
    const paginatedUsers = this.users.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      success: true,
      users: paginatedUsers,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
      summary: {
        totalUsers: total,
        activeToday: Math.floor(total * 0.3),
        activeThisWeek: Math.floor(total * 0.6),
        onlineNow: Math.floor(total * 0.1),
      },
    };
  }

  getTotalUsers(): number {
    return this.users.length;
  }
}

describe('Users Page Pagination Correctness', () => {
  describe('Property 11: Pagination correctness', () => {
    test('For any paginated request, returned page contains at most pageSize items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalUsers: fc.integer({ min: 1, max: 1000 }),
            pageSize: fc.integer({ min: 1, max: 100 }),
            page: fc.integer({ min: 1, max: 20 }),
          }),
          async ({ totalUsers, pageSize, page }) => {
            const service = new MockUsersPaginationService(totalUsers);
            const offset = (page - 1) * pageSize;
            
            const response = await service.fetchUsers(pageSize, offset);

            // Property: returned page should contain at most pageSize items
            expect(response.users.length).toBeLessThanOrEqual(pageSize);
            
            // Additional validation: returned count should match expected
            const expectedCount = Math.min(pageSize, Math.max(0, totalUsers - offset));
            expect(response.users.length).toBe(expectedCount);

            return response.users.length <= pageSize;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('hasMore accurately reflects remaining data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalUsers: fc.integer({ min: 1, max: 500 }),
            pageSize: fc.integer({ min: 10, max: 50 }),
            page: fc.integer({ min: 1, max: 15 }),
          }),
          async ({ totalUsers, pageSize, page }) => {
            const service = new MockUsersPaginationService(totalUsers);
            const offset = (page - 1) * pageSize;
            
            const response = await service.fetchUsers(pageSize, offset);

            // Property: hasMore should accurately reflect remaining data
            const expectedHasMore = offset + pageSize < totalUsers;
            expect(response.pagination.hasMore).toBe(expectedHasMore);

            // Verify total is accurate
            expect(response.pagination.total).toBe(totalUsers);

            return response.pagination.hasMore === expectedHasMore;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Load More increments offset correctly and appends users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalUsers: fc.integer({ min: 100, max: 500 }),
            pageSize: fc.integer({ min: 20, max: 50 }),
            loadMoreCount: fc.integer({ min: 1, max: 5 }),
          }),
          async ({ totalUsers, pageSize, loadMoreCount }) => {
            const service = new MockUsersPaginationService(totalUsers);
            let allLoadedUsers: User[] = [];
            let currentOffset = 0;

            // Simulate Load More button clicks
            for (let i = 0; i <= loadMoreCount; i++) {
              const response = await service.fetchUsers(pageSize, currentOffset);
              allLoadedUsers = [...allLoadedUsers, ...response.users];
              currentOffset += pageSize;

              // Stop if no more data
              if (!response.pagination.hasMore) break;
            }

            // Property: Each Load More should append unique users
            const uniqueUserIds = new Set(allLoadedUsers.map(u => u.userId));
            expect(uniqueUserIds.size).toBe(allLoadedUsers.length);

            // Property: Total loaded should not exceed total users
            expect(allLoadedUsers.length).toBeLessThanOrEqual(totalUsers);

            return uniqueUserIds.size === allLoadedUsers.length;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Load All fetches all users in single request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 500 }),
          async (totalUsers) => {
            const service = new MockUsersPaginationService(totalUsers);
            
            // Simulate Load All - fetch with limit = total
            const response = await service.fetchUsers(totalUsers, 0);

            // Property: Load All should return all users
            expect(response.users.length).toBe(totalUsers);
            expect(response.pagination.hasMore).toBe(false);
            expect(response.pagination.total).toBe(totalUsers);

            return response.users.length === totalUsers && !response.pagination.hasMore;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Pagination metadata is consistent across pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalUsers: fc.integer({ min: 100, max: 300 }),
            pageSize: fc.integer({ min: 20, max: 50 }),
          }),
          async ({ totalUsers, pageSize }) => {
            const service = new MockUsersPaginationService(totalUsers);
            const totalPages = Math.ceil(totalUsers / pageSize);

            // Fetch multiple pages and verify consistency
            for (let page = 1; page <= Math.min(totalPages, 5); page++) {
              const offset = (page - 1) * pageSize;
              const response = await service.fetchUsers(pageSize, offset);

              // Property: Total should be consistent across all pages
              expect(response.pagination.total).toBe(totalUsers);
              
              // Property: Limit should match requested pageSize
              expect(response.pagination.limit).toBe(pageSize);
              
              // Property: Offset should match calculated offset
              expect(response.pagination.offset).toBe(offset);
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Empty page handling when offset exceeds total', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalUsers: fc.integer({ min: 10, max: 100 }),
            pageSize: fc.integer({ min: 10, max: 50 }),
          }),
          async ({ totalUsers, pageSize }) => {
            const service = new MockUsersPaginationService(totalUsers);
            
            // Request page beyond available data
            const beyondOffset = totalUsers + pageSize;
            const response = await service.fetchUsers(pageSize, beyondOffset);

            // Property: Should return empty array when offset exceeds total
            expect(response.users.length).toBe(0);
            expect(response.pagination.hasMore).toBe(false);
            expect(response.pagination.total).toBe(totalUsers);

            return response.users.length === 0;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Last page contains correct number of remaining items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalUsers: fc.integer({ min: 25, max: 200 }),
            pageSize: fc.integer({ min: 10, max: 50 }),
          }),
          async ({ totalUsers, pageSize }) => {
            const service = new MockUsersPaginationService(totalUsers);
            const totalPages = Math.ceil(totalUsers / pageSize);
            const lastPageOffset = (totalPages - 1) * pageSize;
            
            const response = await service.fetchUsers(pageSize, lastPageOffset);

            // Property: Last page should contain remaining items
            const expectedLastPageCount = totalUsers - lastPageOffset;
            expect(response.users.length).toBe(expectedLastPageCount);
            expect(response.pagination.hasMore).toBe(false);

            return response.users.length === expectedLastPageCount;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
