/**
 * Cache Invalidation Demo Tests
 * 
 * Simplified tests to demonstrate the core cache invalidation functionality
 */

import { describe, test, expect, beforeEach } from 'vitest';
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
  }
];

describe('Cache Invalidation Demo', () => {
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

  test('should invalidate cache for specific programs', () => {
    // Pre-populate cache by classifying programs
    const classified = relevanceEngine.classifyPrograms();
    expect(classified.length).toBe(2);
    
    const initialCacheSize = cache.size();
    expect(initialCacheSize).toBeGreaterThan(0);

    // Invalidate cache for specific program
    const result = relevanceEngine.invalidateCache(['Bayern Spielplatzförderung']);

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('selective');
    expect(result.invalidatedCount).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

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

  test('should handle cache unavailability gracefully', () => {
    // Create engine without cache
    const engineWithoutCache = new RelevanceEngine(mockPrograms, null);
    
    const result = engineWithoutCache.invalidateCache(['Bayern Spielplatzförderung']);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Cache not available');
  });

  test('should invalidate cache through database service', async () => {
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

  test('should provide cache health status', () => {
    const health = relevanceEngine.getCacheHealthStatus();

    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.cacheStats).toBeDefined();
    expect(health.engineStats).toBeDefined();
    expect(health.recommendations).toBeDefined();
  });

  test('should invalidate by criteria', () => {
    // Pre-populate cache
    relevanceEngine.classifyPrograms();
    
    const criteria = { federalState: 'BY' };
    const result = relevanceEngine.invalidateByCriteria(criteria);

    expect(result.success).toBe(true);
    expect(result.strategy).toBe('criteria-based');
    expect(result.criteria).toEqual(criteria);
  });

  test('should perform cache maintenance', () => {
    // Pre-populate cache
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

  test('should handle database service operations', async () => {
    const newProgram = {
      name: 'Neue Förderung Test',
      federalStates: ['NW'],
      type: 'playground',
      measures: ['Test'],
      relevanceLevel: 1
    };

    const createResult = await databaseService.createProgram(newProgram);
    expect(createResult.success).toBe(true);

    const deleteResult = await databaseService.deleteProgram('Bayern Spielplatzförderung');
    expect(deleteResult.success).toBe(true);

    const health = databaseService.getCacheHealth();
    expect(health).toBeDefined();
  });
});