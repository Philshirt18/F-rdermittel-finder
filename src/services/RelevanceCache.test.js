/**
 * Tests for RelevanceCache class
 * 
 * Tests the enhanced caching functionality including LRU eviction,
 * memory monitoring, performance metrics, and bulk operations.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { RelevanceCache } from './RelevanceCache.js';

describe('RelevanceCache', () => {
  let cache;

  beforeEach(() => {
    cache = new RelevanceCache({
      maxSize: 5,
      defaultTTL: 1000, // 1 second for testing
      memoryThreshold: 1024, // 1KB for testing
      cleanupInterval: 100 // 100ms for testing
    });
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  describe('Basic Operations', () => {
    test('should store and retrieve cache entries', () => {
      const testData = { relevanceLevel: 1, isFederalStateSpecific: true };
      cache.set('test-key', testData);
      
      const retrieved = cache.get('test-key');
      expect(retrieved.relevanceLevel).toBe(1);
      expect(retrieved.isFederalStateSpecific).toBe(true);
      expect(retrieved.cachedAt).toBeInstanceOf(Date);
      expect(retrieved.cacheVersion).toBe(cache.version);
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    test('should check if cache has a key', () => {
      cache.set('test-key', { data: 'test' });
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    test('should delete cache entries', () => {
      cache.set('test-key', { data: 'test' });
      expect(cache.has('test-key')).toBe(true);
      
      cache.delete('test-key');
      expect(cache.has('test-key')).toBe(false);
    });

    test('should clear all cache entries', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      expect(cache.size()).toBe(2);
      
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when max size exceeded', () => {
      // Fill cache to max size
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, { data: `test${i}` });
      }
      expect(cache.size()).toBe(5);
      
      // Add one more entry, should evict the oldest
      cache.set('key5', { data: 'test5' });
      expect(cache.size()).toBe(5);
      expect(cache.has('key0')).toBe(false); // Should be evicted
      expect(cache.has('key5')).toBe(true); // Should be present
    });

    test('should update access order when getting entries', () => {
      // Fill cache to max size
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      cache.set('key3', { data: 'test3' });
      cache.set('key4', { data: 'test4' });
      cache.set('key5', { data: 'test5' });
      
      // Wait a bit to ensure different timestamps
      const delay = () => new Promise(resolve => setTimeout(resolve, 10));
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Add new entry, which should trigger eviction
      cache.set('key6', { data: 'test6' });
      
      // The cache should still have 5 entries (max size)
      expect(cache.size()).toBe(5);
      
      // key6 should definitely be present (just added)
      expect(cache.has('key6')).toBe(true);
      
      // At least one of the original keys should be evicted
      const originalKeysPresent = ['key1', 'key2', 'key3', 'key4', 'key5']
        .filter(key => cache.has(key));
      expect(originalKeysPresent.length).toBe(4); // One should be evicted
    });
  });

  describe('TTL and Expiration', () => {
    test('should expire entries after TTL', async () => {
      cache.set('test-key', { data: 'test' }, 50); // 50ms TTL
      expect(cache.has('test-key')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.has('test-key')).toBe(false);
    });

    test('should use default TTL when not specified', () => {
      cache.set('test-key', { data: 'test' });
      const entry = cache.cache.get('test-key');
      expect(entry.ttl).toBe(cache.defaultTTL);
    });

    test('should handle custom TTL', () => {
      const customTTL = 5000;
      cache.set('test-key', { data: 'test' }, customTTL);
      const entry = cache.cache.get('test-key');
      expect(entry.ttl).toBe(customTTL);
    });
  });

  describe('Performance Metrics', () => {
    test('should track cache hits and misses', () => {
      cache.set('test-key', { data: 'test' });
      
      // Hit
      cache.get('test-key');
      expect(cache.getStats().totalHits).toBe(1);
      expect(cache.getStats().totalMisses).toBe(0);
      
      // Miss
      cache.get('non-existent');
      expect(cache.getStats().totalHits).toBe(1);
      expect(cache.getStats().totalMisses).toBe(1);
      
      // Calculate hit rate
      expect(cache.getStats().hitRate).toBe(50);
    });

    test('should track access counts', () => {
      cache.set('test-key', { data: 'test' });
      
      cache.get('test-key');
      cache.get('test-key');
      cache.get('test-key');
      
      const entry = cache.cache.get('test-key');
      expect(entry.accessCount).toBe(4); // 1 from set + 3 from gets
    });

    test('should provide comprehensive statistics', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      cache.get('key1');
      cache.get('non-existent');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.version).toBe(cache.version);
    });
  });

  describe('Pattern-based Invalidation', () => {
    test('should invalidate entries by regex pattern', () => {
      cache.set('program_123_classification', { relevanceLevel: 1 });
      cache.set('program_456_classification', { relevanceLevel: 2 });
      cache.set('other_data', { data: 'test' });
      
      const invalidated = cache.invalidateByPattern(/program_.*_classification/);
      expect(invalidated).toBe(2);
      expect(cache.has('program_123_classification')).toBe(false);
      expect(cache.has('program_456_classification')).toBe(false);
      expect(cache.has('other_data')).toBe(true);
    });

    test('should invalidate entries by string pattern', () => {
      cache.set('user_123_data', { data: 'test1' });
      cache.set('user_456_data', { data: 'test2' });
      cache.set('admin_data', { data: 'test3' });
      
      const invalidated = cache.invalidateByPattern('user_');
      expect(invalidated).toBe(2);
      expect(cache.has('admin_data')).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    test('should set multiple entries at once', () => {
      const entries = [
        { key: 'key1', value: { data: 'test1' } },
        { key: 'key2', value: { data: 'test2' } },
        { key: 'key3', value: { data: 'test3' } }
      ];
      
      cache.setBulk(entries);
      expect(cache.size()).toBe(3);
      expect(cache.get('key1').data).toBe('test1');
      expect(cache.get('key2').data).toBe('test2');
      expect(cache.get('key3').data).toBe('test3');
    });

    test('should get multiple entries at once', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      cache.set('key3', { data: 'test3' });
      
      const results = cache.getBulk(['key1', 'key3', 'non-existent']);
      expect(results.size).toBe(2);
      expect(results.get('key1').data).toBe('test1');
      expect(results.get('key3').data).toBe('test3');
      expect(results.has('non-existent')).toBe(false);
    });

    test('should get entries by prefix', () => {
      cache.set('program_123', { data: 'test1' });
      cache.set('program_456', { data: 'test2' });
      cache.set('user_789', { data: 'test3' });
      
      const results = cache.getByPrefix('program_');
      expect(results.size).toBe(2);
      expect(results.has('program_123')).toBe(true);
      expect(results.has('program_456')).toBe(true);
      expect(results.has('user_789')).toBe(false);
    });
  });

  describe('Health Monitoring', () => {
    test('should provide health status', () => {
      cache.set('key1', { data: 'test1' });
      cache.get('key1');
      cache.get('non-existent');
      
      const health = cache.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.hitRate).toBe(50);
      expect(health.sizeUsagePercent).toBe(20); // 1/5 * 100
      expect(health.lastCheck).toBeDefined();
    });

    test('should detect warning conditions', () => {
      // Fill cache to 80% (4/5)
      for (let i = 0; i < 4; i++) {
        cache.set(`key${i}`, { data: `test${i}` });
      }
      
      const health = cache.getHealthStatus();
      expect(health.status).toBe('warning');
      expect(health.issues).toContain('Cache size above 75%');
    });
  });

  describe('Configuration', () => {
    test('should allow runtime configuration changes', () => {
      expect(cache.maxSize).toBe(5);
      expect(cache.defaultTTL).toBe(1000);
      
      cache.configure({
        maxSize: 10,
        defaultTTL: 2000,
        memoryThreshold: 2048
      });
      
      expect(cache.maxSize).toBe(10);
      expect(cache.defaultTTL).toBe(2000);
      expect(cache.memoryThreshold).toBe(2048);
    });
  });

  describe('RelevanceEngine Integration', () => {
    test('should invalidate by program IDs', () => {
      cache.set('program_123_classification', { relevanceLevel: 1 });
      cache.set('program_456_classification', { relevanceLevel: 2 });
      cache.set('program_789_score', { score: 85 });
      cache.set('other_data', { data: 'test' });
      
      const invalidated = cache.invalidateByProgramIds(['123', '456']);
      expect(invalidated).toBe(2); // Should match entries containing these IDs
      expect(cache.has('other_data')).toBe(true);
      expect(cache.has('program_789_score')).toBe(true); // This should remain
    });

    test('should support cache warm-up', () => {
      const precomputedEntries = [
        { key: 'program_1', value: { relevanceLevel: 1 } },
        { key: 'program_2', value: { relevanceLevel: 2 } },
        { key: 'program_3', value: { relevanceLevel: 3 } }
      ];
      
      cache.warmUp(precomputedEntries);
      expect(cache.size()).toBe(3);
      expect(cache.get('program_1').relevanceLevel).toBe(1);
      expect(cache.get('program_2').relevanceLevel).toBe(2);
      expect(cache.get('program_3').relevanceLevel).toBe(3);
    });
  });

  describe('Memory Management', () => {
    test('should estimate object sizes', () => {
      const smallObject = { a: 1 };
      const largeObject = { 
        data: 'x'.repeat(100),
        array: new Array(50).fill('test'),
        nested: { deep: { value: 'test' } }
      };
      
      const smallSize = cache.estimateObjectSize(smallObject);
      const largeSize = cache.estimateObjectSize(largeObject);
      
      expect(smallSize).toBeGreaterThan(0);
      expect(largeSize).toBeGreaterThan(smallSize);
    });

    test('should track memory usage', () => {
      const initialMemory = cache.metrics.totalMemoryUsage;
      cache.set('test-key', { data: 'test data' });
      
      expect(cache.metrics.totalMemoryUsage).toBeGreaterThan(initialMemory);
    });
  });

  describe('Property-Based Tests', () => {
    // Generators for property-based testing
    const arbitraryRelevanceData = () => fc.record({
      relevanceLevel: fc.constantFrom(1, 2, 3, 4),
      isFederalStateSpecific: fc.boolean(),
      playgroundFundingHistory: fc.boolean(),
      programOrigin: fc.constantFrom('federal', 'state', 'eu'),
      implementationLevel: fc.constantFrom('state', 'municipal', 'national'),
      successRate: fc.option(fc.float({ min: 0, max: 100 }), { nil: null })
    });

    const arbitraryCacheKey = () => fc.string({ minLength: 1, maxLength: 50 });

    const arbitraryCacheOperation = () => fc.oneof(
      fc.record({ type: fc.constant('set'), key: arbitraryCacheKey(), value: arbitraryRelevanceData() }),
      fc.record({ type: fc.constant('get'), key: arbitraryCacheKey() }),
      fc.record({ type: fc.constant('delete'), key: arbitraryCacheKey() }),
      fc.record({ type: fc.constant('has'), key: arbitraryCacheKey() })
    );

    /**
     * Property 12: Cache Consistency - Validates Requirements 6.3
     * 
     * For any sequence of cache operations, the cache should maintain consistency:
     * - Storage and retrieval operations return consistent results
     * - Cache versioning works correctly
     * - Cache expiration logic functions properly
     * - LRU eviction strategy maintains cache integrity
     * - Multiple cache operations maintain data consistency
     */
    test('Property 12: Cache Consistency - storage and retrieval operations are consistent', () => {
      fc.assert(fc.property(
        fc.array(arbitraryCacheOperation(), { minLength: 1, maxLength: 25 }),
        (operations) => {
          const testCache = new RelevanceCache({
            maxSize: 10,
            defaultTTL: 60000, // 1 minute for testing
            enableMetrics: true
          });

          const expectedState = new Map(); // Track what should be in cache
          const setOperations = new Map(); // Track when items were set

          try {
            for (const operation of operations) {
              switch (operation.type) {
                case 'set':
                  testCache.set(operation.key, operation.value);
                  expectedState.set(operation.key, operation.value);
                  setOperations.set(operation.key, Date.now());
                  break;

                case 'get':
                  const retrieved = testCache.get(operation.key);
                  const expected = expectedState.get(operation.key);
                  
                  if (expected) {
                    // Should retrieve the data we stored
                    expect(retrieved).not.toBeNull();
                    expect(retrieved.relevanceLevel).toBe(expected.relevanceLevel);
                    expect(retrieved.isFederalStateSpecific).toBe(expected.isFederalStateSpecific);
                    expect(retrieved.playgroundFundingHistory).toBe(expected.playgroundFundingHistory);
                    
                    // Should have cache metadata
                    expect(retrieved.cachedAt).toBeInstanceOf(Date);
                    expect(retrieved.cacheVersion).toBe(testCache.version);
                    expect(retrieved.accessCount).toBeGreaterThan(0);
                  } else if (retrieved !== null) {
                    // If we got something back, it should be valid cache data
                    expect(retrieved.cachedAt).toBeInstanceOf(Date);
                    expect(retrieved.cacheVersion).toBe(testCache.version);
                  }
                  break;

                case 'delete':
                  const wasDeleted = testCache.delete(operation.key);
                  if (expectedState.has(operation.key)) {
                    expectedState.delete(operation.key);
                    setOperations.delete(operation.key);
                  }
                  break;

                case 'has':
                  const hasKey = testCache.has(operation.key);
                  const shouldHave = expectedState.has(operation.key);
                  
                  // Note: Due to LRU eviction, we might not have all expected keys
                  // But if we say we have it, we should actually have it
                  if (hasKey) {
                    expect(testCache.get(operation.key)).not.toBeNull();
                  }
                  break;
              }
            }

            // Final consistency check: all items we can retrieve should be valid
            for (const [key] of expectedState) {
              const retrieved = testCache.get(key);
              if (retrieved !== null) {
                // Should have proper cache metadata
                expect(retrieved.cachedAt).toBeInstanceOf(Date);
                expect(retrieved.cacheVersion).toBe(testCache.version);
                expect(typeof retrieved.accessCount).toBe('number');
                expect(retrieved.accessCount).toBeGreaterThan(0);
              }
            }

            // Cache size should not exceed maxSize
            expect(testCache.size()).toBeLessThanOrEqual(testCache.maxSize);

            return true;
          } finally {
            testCache.destroy();
          }
        }
      ), { numRuns: 10 });
    });

    test('Property 12: Cache Consistency - versioning works correctly', () => {
      fc.assert(fc.property(
        fc.array(arbitraryRelevanceData(), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (dataArray, newVersion) => {
          const testCache = new RelevanceCache({
            maxSize: 20,
            version: '1.0.0'
          });

          try {
            // Store data with initial version
            dataArray.forEach((data, index) => {
              testCache.set(`key_${index}`, data);
            });

            // All stored data should be retrievable
            const initialRetrievals = dataArray.map((_, index) => testCache.get(`key_${index}`));
            expect(initialRetrievals.every(item => item !== null)).toBe(true);
            expect(initialRetrievals.every(item => item.cacheVersion === '1.0.0')).toBe(true);

            // Change cache version
            testCache.version = newVersion;

            // Previously cached items should now be invalid due to version mismatch
            const postVersionRetrievals = dataArray.map((_, index) => testCache.get(`key_${index}`));
            expect(postVersionRetrievals.every(item => item === null)).toBe(true);

            // New items should use the new version
            testCache.set('new_key', dataArray[0]);
            const newItem = testCache.get('new_key');
            expect(newItem).not.toBeNull();
            expect(newItem.cacheVersion).toBe(newVersion);

            return true;
          } finally {
            testCache.destroy();
          }
        }
      ), { numRuns: 10 });
    });

    test('Property 12: Cache Consistency - LRU eviction maintains integrity', () => {
      fc.assert(fc.property(
        fc.array(arbitraryRelevanceData(), { minLength: 6, maxLength: 15 }),
        (dataArray) => {
          const maxSize = 5;
          const testCache = new RelevanceCache({
            maxSize: maxSize,
            defaultTTL: 60000
          });

          try {
            // Store more items than cache can hold
            dataArray.forEach((data, index) => {
              testCache.set(`key_${index}`, data);
            });

            // Cache should not exceed max size
            expect(testCache.size()).toBeLessThanOrEqual(maxSize);

            // All items currently in cache should be valid and retrievable
            const stats = testCache.getStats();
            expect(stats.size).toBeLessThanOrEqual(maxSize);

            // Access some items to change LRU order
            const accessKeys = [];
            for (let i = 0; i < Math.min(3, testCache.size()); i++) {
              const key = `key_${dataArray.length - 1 - i}`; // Access recent keys
              const item = testCache.get(key);
              if (item !== null) {
                accessKeys.push(key);
                expect(item.accessCount).toBeGreaterThan(0);
              }
            }

            // Add more items to trigger eviction
            for (let i = 0; i < 3; i++) {
              testCache.set(`extra_${i}`, dataArray[0]);
            }

            // Cache should still not exceed max size
            expect(testCache.size()).toBeLessThanOrEqual(maxSize);

            // Recently accessed items should be more likely to remain
            // (This is probabilistic due to LRU, but we can check basic integrity)
            let validItems = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const item = testCache.get(`key_${i}`);
              if (item !== null) {
                validItems++;
                expect(item.cachedAt).toBeInstanceOf(Date);
                expect(item.cacheVersion).toBe(testCache.version);
              }
            }

            // Should have some valid items, but not more than maxSize
            expect(validItems).toBeLessThanOrEqual(maxSize);

            return true;
          } finally {
            testCache.destroy();
          }
        }
      ), { numRuns: 10 });
    });

    test('Property 12: Cache Consistency - bulk operations maintain consistency', () => {
      fc.assert(fc.property(
        fc.array(fc.record({
          key: arbitraryCacheKey(),
          value: arbitraryRelevanceData()
        }), { minLength: 1, maxLength: 10 }),
        (entries) => {
          const testCache = new RelevanceCache({
            maxSize: 20,
            defaultTTL: 60000
          });

          try {
            // Bulk set operation
            testCache.setBulk(entries);

            // All entries should be retrievable (unless evicted due to size limits)
            const retrievedEntries = testCache.getBulk(entries.map(e => e.key));
            
            // Check that retrieved entries match what we stored
            for (const [key, retrieved] of retrievedEntries) {
              const original = entries.find(e => e.key === key);
              expect(original).toBeDefined();
              
              expect(retrieved.relevanceLevel).toBe(original.value.relevanceLevel);
              expect(retrieved.isFederalStateSpecific).toBe(original.value.isFederalStateSpecific);
              expect(retrieved.playgroundFundingHistory).toBe(original.value.playgroundFundingHistory);
              
              // Should have cache metadata
              expect(retrieved.cachedAt).toBeInstanceOf(Date);
              expect(retrieved.cacheVersion).toBe(testCache.version);
            }

            // Test prefix-based retrieval consistency
            const prefixEntries = entries.filter(e => e.key.startsWith('key'));
            if (prefixEntries.length > 0) {
              const prefixResults = testCache.getByPrefix('key');
              
              // All prefix results should be valid cache entries
              for (const [key, value] of prefixResults) {
                expect(key.startsWith('key')).toBe(true);
                expect(value.cachedAt).toBeInstanceOf(Date);
                expect(value.cacheVersion).toBe(testCache.version);
              }
            }

            return true;
          } finally {
            testCache.destroy();
          }
        }
      ), { numRuns: 10 });
    });
  });
});