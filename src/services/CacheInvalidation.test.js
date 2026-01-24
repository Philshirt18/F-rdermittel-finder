/**
 * Cache Invalidation Tests
 * 
 * Tests for the comprehensive cache invalidation system implemented in RelevanceEngine
 * and DatabaseUpdateService. These tests verify that cache invalidation works correctly
 * for various scenarios including selective invalidation, error handling, and recovery.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RelevanceEngine } from './RelevanceEngine.js';
import { RelevanceCache } from './RelevanceCache.js';
import { DatabaseUpdateService } from './DatabaseUpdateService.js';

// Mock funding programs for testing
const mockPrograms = [
  {
    name: 'Bayern Spielplatzförderung',
    federalStates: ['BY'],
    type: 'playground',
    measures: ['Spielgeräte', 'Sicherheit'],
    relevanceLevel: 1,
    isFederalStateSpecific: true,
    playgroundFundingHistory: true
  },
  {
    name: 'LEADER Programm',
    federalStates: ['all'],
    type: 'rural_development',
    measures: ['Infrastruktur', 'Tourismus'],
    relevanceLevel: 2,
    isFederalStateSpecific: false,
    playgroundFundingHistory: false
  },
  {
    name: 'Bundesweite Sportförderung',
    federalStates: ['all'],
    type: 'sports',
    measures: ['Sportanlagen', 'Vereinsförderung'],
    relevanceLevel: 3,
    isFederalStateSpecific: false,
    playgroundFundingHistory: false
  }
];

describe('Cache Invalidation System', () => {
  let relevanceEngine;
  let cache;
  let databaseService;

  beforeEach(() => {
    // Initialize cache with test configuration
    cache = new RelevanceCache({
      maxSize: 100,
      defaultTTL: 60000, // 1 minute for testing
      enableMetrics: true
    });

    // Initialize relevance engine with mock programs
    relevanceEngine = new RelevanceEngine(mockPrograms, cache);

    // Initialize database service
    databaseService = new DatabaseUpdateService(relevanceEngine);
  });

  afterEach(() => {
    try {
      if (databaseService) {
        databaseService.destroy();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    try {
      if (relevanceEngine) {
        relevanceEngine.destroy();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Selective Cache Invalidation', () => {
    test('should invalidate cache for specific programs', () => {
      // Pre-populate cache by classifying programs
      relevanceEngine.classifyPrograms();
      
      const initialCacheSize = cache.size();
      expect(initialCacheSize).toBeGreaterThan(0);

      // Invalidate cache for specific program
      const result = relevanceEngine.invalidateCache(['Bayern Spielplatzförderung']);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('selective');
      expect(result.invalidatedCount).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should invalidate related entries when option is enabled', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const options = {
        invalidateRelated: true,
        invalidateByState: true,
        invalidateByType: true
      };

      const result = relevanceEngine.invalidateCache(['Bayern Spielplatzförderung'], options);

      expect(result.success).toBe(true);
      expect(result.invalidatedCount).toBeGreaterThan(0);
    });

    test('should handle invalidation of non-existent programs gracefully', () => {
      const result = relevanceEngine.invalidateCache(['NonExistentProgram']);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Should not fail even if program doesn't exist
    });
  });

  describe('Complete Cache Invalidation', () => {
    test('should invalidate entire cache', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const initialSize = cache.size();
      expect(initialSize).toBeGreaterThan(0);

      const result = relevanceEngine.invalidateCache();

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('complete');
      expect(result.invalidatedCount).toBe(initialSize);
      expect(cache.size()).toBe(0);
    });

    test('should clear internal classification map on complete invalidation', () => {
      // Pre-populate cache and internal map
      relevanceEngine.classifyPrograms();
      
      expect(relevanceEngine.classifiedPrograms.size).toBeGreaterThan(0);

      relevanceEngine.invalidateCache();

      expect(relevanceEngine.classifiedPrograms.size).toBe(0);
    });
  });

  describe('Auto-refresh Functionality', () => {
    test('should auto-refresh cache after invalidation when enabled', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const options = { autoRefresh: true };
      const result = relevanceEngine.invalidateCache(['Bayern Spielplatzförderung'], options);

      expect(result.success).toBe(true);
      
      // Check that the program is re-classified (cache repopulated)
      const level = relevanceEngine.getRelevanceLevel(mockPrograms[0]);
      expect(level).toBe(1);
    });

    test('should not auto-refresh when disabled', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const options = { autoRefresh: false };
      relevanceEngine.invalidateCache(['Bayern Spielplatzförderung'], options);

      // Cache should remain empty for the invalidated program
      const cacheKey = relevanceEngine.generateCacheKey(mockPrograms[0]);
      expect(cache.has(cacheKey)).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle cache unavailability gracefully', () => {
      // Create engine without cache
      const engineWithoutCache = new RelevanceEngine(mockPrograms, null);
      
      const result = engineWithoutCache.invalidateCache(['Bayern Spielplatzförderung']);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cache not available');
    });

    test('should attempt recovery on cache failures', () => {
      // Mock cache failure
      const originalDelete = cache.delete;
      cache.delete = vi.fn(() => {
        throw new Error('Cache operation failed');
      });

      const options = { attemptRecovery: true };
      const result = relevanceEngine.invalidateCache(['Bayern Spielplatzförderung'], options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.recovery).toBeDefined();
      expect(result.recovery.attempted).toBe(true);

      // Restore original method
      cache.delete = originalDelete;
    });

    test('should log invalidation events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      
      relevanceEngine.invalidateCache(['Bayern Spielplatzförderung']);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache invalidation completed successfully'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Database Update Hooks', () => {
    test('should invalidate cache when program is updated via database service', async () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const updatedProgram = {
        ...mockPrograms[0],
        measures: ['Spielgeräte', 'Sicherheit', 'Inklusion'] // Add new measure
      };

      const result = await databaseService.updateProgram(updatedProgram);

      expect(result.success).toBe(true);
      expect(result.cacheInvalidation).toBeDefined();
      expect(result.cacheInvalidation.success).toBe(true);
    });

    test('should handle bulk program updates', async () => {
      const updatedPrograms = mockPrograms.map(program => ({
        ...program,
        lastUpdated: new Date().toISOString()
      }));

      const result = await databaseService.updateProgramsBulk(updatedPrograms);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(mockPrograms.length);
      expect(result.cacheInvalidation).toBeDefined();
    });

    test('should invalidate cache when program is created', async () => {
      const newProgram = {
        name: 'Neue Förderung Test',
        federalStates: ['NW'],
        type: 'playground',
        measures: ['Test'],
        relevanceLevel: 1
      };

      const result = await databaseService.createProgram(newProgram);

      expect(result.success).toBe(true);
      expect(result.cacheInvalidation).toBeDefined();
      expect(result.cacheInvalidation.success).toBe(true);
    });

    test('should invalidate cache when program is deleted', async () => {
      const result = await databaseService.deleteProgram('Bayern Spielplatzförderung');

      expect(result.success).toBe(true);
      expect(result.cacheInvalidation).toBeDefined();
      expect(result.cacheInvalidation.success).toBe(true);
    });
  });

  describe('Criteria-based Invalidation', () => {
    test('should invalidate by federal state', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const criteria = { federalState: 'BY' };
      const result = relevanceEngine.invalidateByCriteria(criteria);

      expect(result.success).toBe(true);
      expect(result.strategy).toBe('criteria-based');
      expect(result.criteria).toEqual(criteria);
    });

    test('should invalidate by relevance level', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      const criteria = { relevanceLevel: 1 };
      const result = relevanceEngine.invalidateByCriteria(criteria);

      expect(result.success).toBe(true);
    });

    test('should invalidate expired entries only', () => {
      // Pre-populate cache
      relevanceEngine.classifyPrograms();
      
      // Mock expired entries by setting past expiration dates
      for (const [key, entry] of cache.cache.entries()) {
        entry.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      }

      const criteria = { expiredOnly: true };
      const result = relevanceEngine.invalidateByCriteria(criteria);

      expect(result.success).toBe(true);
      expect(result.invalidatedCount).toBeGreaterThan(0);
    });
  });

  describe('Cache Health and Monitoring', () => {
    test('should provide cache health status', () => {
      const health = relevanceEngine.getCacheHealthStatus();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.cacheStats).toBeDefined();
      expect(health.engineStats).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });

    test('should generate appropriate recommendations', () => {
      // Simulate low hit rate
      cache.metrics.hits = 10;
      cache.metrics.misses = 100;

      const health = relevanceEngine.getCacheHealthStatus();
      const recommendations = health.recommendations;

      expect(recommendations).toBeInstanceOf(Array);
      const performanceRec = recommendations.find(r => r.type === 'performance');
      expect(performanceRec).toBeDefined();
      expect(performanceRec.priority).toBe('high');
    });

    test('should perform cache maintenance', () => {
      // Pre-populate cache with some expired entries
      relevanceEngine.classifyPrograms();
      
      const options = {
        cleanExpired: true,
        optimizeMemory: true,
        validateConsistency: true
      };

      const result = relevanceEngine.performCacheMaintenance(options);

      expect(result.success).toBe(true);
      expect(result.actions).toBeInstanceOf(Array);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Event-driven Invalidation', () => {
    test('should emit invalidation events', async () => {
      let eventReceived = false;

      const mockEmitter = {
        on: vi.fn(),
        emit: vi.fn((eventType, data) => {
          if (eventType === 'relevance_cache_invalidated') {
            eventReceived = true;
            expect(data.eventType).toBe('programs_updated');
            expect(data.timestamp).toBeDefined();
          }
        }),
        removeAllListeners: vi.fn()
      };

      relevanceEngine.initializeEventListeners(mockEmitter);
      relevanceEngine.onProgramsUpdated([mockPrograms[0]]);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(eventReceived).toBe(true);
    });

    test('should handle event listener initialization', () => {
      const mockEmitter = {
        on: vi.fn(),
        emit: vi.fn(),
        removeAllListeners: vi.fn()
      };

      relevanceEngine.initializeEventListeners(mockEmitter);

      expect(mockEmitter.on).toHaveBeenCalled(); // Just check it was called
      expect(relevanceEngine.eventEmitter).toBe(mockEmitter);
    });
  });

  describe('Scheduled Invalidation', () => {
    test('should schedule automatic invalidation', () => {
      const schedule = {
        interval: 1000, // 1 second for testing
        criteria: { expiredOnly: true }
      };

      relevanceEngine.scheduleInvalidation(schedule);

      expect(relevanceEngine.invalidationTimer).toBeDefined();
      
      // Clean up
      relevanceEngine.stopScheduledInvalidation();
    });

    test('should stop scheduled invalidation', () => {
      const schedule = { interval: 1000 };
      relevanceEngine.scheduleInvalidation(schedule);
      
      expect(relevanceEngine.invalidationTimer).toBeDefined();
      
      relevanceEngine.stopScheduledInvalidation();
      
      expect(relevanceEngine.invalidationTimer).toBeNull();
    });
  });

  describe('Integration with DatabaseUpdateService', () => {
    test('should provide cache health through database service', () => {
      const health = databaseService.getCacheHealth();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
    });

    test('should perform maintenance through database service', () => {
      const result = databaseService.performCacheMaintenance({
        cleanExpired: true,
        optimizeMemory: true
      });

      expect(result.success).toBe(true);
    });

    test('should handle manual cache invalidation through database service', () => {
      const criteria = {
        programNames: ['Bayern Spielplatzförderung'],
        options: { autoRefresh: true }
      };

      const result = databaseService.invalidateCache(criteria);

      expect(result.success).toBe(true);
    });

    test('should schedule maintenance task through database service', () => {
      const schedule = {
        interval: 60000, // 1 minute
        validateConsistency: true
      };

      const result = databaseService.scheduleMaintenanceTask(schedule);

      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      
      // Clean up
      databaseService.stopMaintenanceTask();
    });

    test('should provide comprehensive service status', () => {
      const status = databaseService.getServiceStatus();

      expect(status.timestamp).toBeDefined();
      expect(status.relevanceEngineAvailable).toBe(true);
      expect(status.cacheHealth).toBeDefined();
      expect(status.invalidationMetrics).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    test('should handle database update failures gracefully', async () => {
      const errorProgram = {
        name: 'ERROR_TEST', // This will trigger a simulated error
        federalStates: ['BY'],
        type: 'test'
      };

      const result = await databaseService.updateProgram(errorProgram);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('Failed to update');
    });

    test('should handle bulk update with partial failures', async () => {
      const programs = [
        { name: 'Valid Program', federalStates: ['BY'] },
        { name: 'ERROR_TEST', federalStates: ['BY'] }, // This will fail
        { name: 'Another Valid Program', federalStates: ['NW'] }
      ];

      const result = await databaseService.updateProgramsBulk(programs);

      expect(result.updatedCount).toBe(2); // 2 successful updates
      expect(result.failedPrograms).toHaveLength(1);
      expect(result.failedPrograms[0].program).toBe('ERROR_TEST');
    });

    test('should handle service without relevance engine', () => {
      const serviceWithoutEngine = new DatabaseUpdateService(null);
      
      const health = serviceWithoutEngine.getCacheHealth();
      expect(health.status).toBe('unavailable');
      
      const invalidationResult = serviceWithoutEngine.invalidateCache({});
      expect(invalidationResult.success).toBe(false);
      
      serviceWithoutEngine.destroy();
    });
  });
});