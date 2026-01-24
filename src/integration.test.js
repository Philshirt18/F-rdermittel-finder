/**
 * Integration Test - Data Layer and Caching System
 * 
 * This test verifies that the RelevanceEngine, RelevanceCache, and metadata helpers
 * work together correctly as an integrated system.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { RelevanceEngine } from './services/RelevanceEngine.js';
import { RelevanceCache } from './services/RelevanceCache.js';
import { DatabaseUpdateService } from './services/DatabaseUpdateService.js';
import { addEnhancedMetadata, validateProgramMetadata } from './data/metadataHelpers.js';

// Sample funding programs for integration testing
const samplePrograms = [
  {
    name: 'Bayern Spielplatzförderung',
    federalStates: ['BY'],
    type: 'playground',
    measures: ['Spielgeräte', 'Sicherheit'],
    fundingRate: 80
  },
  {
    name: 'LEADER Programm',
    federalStates: ['all'],
    type: 'rural_development',
    measures: ['Infrastruktur', 'Tourismus'],
    fundingRate: 60
  },
  {
    name: 'Bundesweite Sportförderung',
    federalStates: ['all'],
    type: 'sports',
    measures: ['Sportanlagen', 'Vereinsförderung'],
    fundingRate: 50
  }
];

describe('Integration Test - Data Layer and Caching System', () => {
  let cache;
  let relevanceEngine;
  let databaseService;

  beforeEach(() => {
    // Initialize cache
    cache = new RelevanceCache({
      maxSize: 100,
      defaultTTL: 60000,
      enableMetrics: true
    });

    // Initialize relevance engine with sample programs
    relevanceEngine = new RelevanceEngine(samplePrograms, cache);

    // Initialize database service
    databaseService = new DatabaseUpdateService(relevanceEngine);
  });

  test('should integrate metadata enhancement with relevance classification', () => {
    // Test that programs are automatically enhanced with metadata
    const classifiedPrograms = relevanceEngine.classifyPrograms();

    expect(classifiedPrograms).toHaveLength(3);
    
    // Verify each program has enhanced metadata
    classifiedPrograms.forEach(program => {
      expect(program.relevanceLevel).toBeDefined();
      expect(typeof program.relevanceLevel).toBe('number');
      expect(program.relevanceLevel).toBeGreaterThanOrEqual(1);
      expect(program.relevanceLevel).toBeLessThanOrEqual(4);
      
      expect(program.isFederalStateSpecific).toBeDefined();
      expect(typeof program.isFederalStateSpecific).toBe('boolean');
      
      expect(program.playgroundFundingHistory).toBeDefined();
      expect(typeof program.playgroundFundingHistory).toBe('boolean');
      
      expect(program.programOrigin).toBeDefined();
      expect(program.implementationLevel).toBeDefined();
      expect(program.lastRelevanceUpdate).toBeDefined();
    });
  });

  test('should cache relevance classifications correctly', () => {
    // Initial classification should populate cache
    const classifiedPrograms = relevanceEngine.classifyPrograms();
    
    expect(cache.size()).toBeGreaterThan(0);
    
    // Second classification should use cache (check that cache is being used)
    const initialHits = cache.getStats().totalHits;
    relevanceEngine.classifyPrograms();
    const finalHits = cache.getStats().totalHits;
    
    // Cache should have been used (hits increased)
    expect(finalHits).toBeGreaterThan(initialHits);
    
    // Cache metrics should show hits
    const stats = cache.getStats();
    expect(stats.totalHits).toBeGreaterThan(0);
  });

  test('should handle cache invalidation on program updates', async () => {
    // Pre-populate cache
    relevanceEngine.classifyPrograms();
    const initialCacheSize = cache.size();
    expect(initialCacheSize).toBeGreaterThan(0);

    // Update a program through database service
    const updatedProgram = {
      ...samplePrograms[0],
      measures: [...samplePrograms[0].measures, 'Inklusion']
    };

    const result = await databaseService.updateProgram(updatedProgram);

    expect(result.success).toBe(true);
    expect(result.cacheInvalidation).toBeDefined();
    expect(result.cacheInvalidation.success).toBe(true);
  });

  test('should validate metadata consistency', () => {
    // Test individual metadata validation
    const testProgram = {
      name: 'Test Program',
      federalStates: ['NW'],
      type: 'playground',
      measures: ['Test']
    };

    // Add enhanced metadata
    const enhancedProgram = addEnhancedMetadata(testProgram);
    
    // Validate the enhanced program
    const validation = validateProgramMetadata(enhancedProgram);
    
    expect(validation.isValid).toBe(true);
    expect(validation.missingFields).toBeDefined();
    expect(validation.hasAllRequired).toBe(true);
    if (validation.validationErrors) {
      expect(validation.validationErrors).toHaveLength(0);
    }
  });

  test('should maintain performance with caching', () => {
    const startTime = Date.now();
    
    // First classification (no cache)
    relevanceEngine.classifyPrograms();
    const firstRunTime = Date.now() - startTime;
    
    const cacheStartTime = Date.now();
    
    // Second classification (with cache)
    relevanceEngine.classifyPrograms();
    const cachedRunTime = Date.now() - cacheStartTime;
    
    // Cached run should be faster (though this is a simple test)
    expect(cachedRunTime).toBeLessThanOrEqual(firstRunTime + 10); // Allow some margin
  });

  test('should handle federal state prioritization correctly', () => {
    const classifiedPrograms = relevanceEngine.classifyPrograms();
    
    // Get Bayern-specific programs
    const bayernPrograms = relevanceEngine.getProgramsByRelevance(1, 'BY');
    expect(bayernPrograms.length).toBeGreaterThan(0);
    
    // Verify Bayern program is classified correctly
    const bayernProgram = bayernPrograms.find(p => p.name === 'Bayern Spielplatzförderung');
    expect(bayernProgram).toBeDefined();
    expect(bayernProgram.relevanceLevel).toBe(1); // Should be Core level
    expect(bayernProgram.isFederalStateSpecific).toBe(true);
  });

  test('should provide comprehensive cache health status', () => {
    // Pre-populate cache
    relevanceEngine.classifyPrograms();
    
    const healthStatus = relevanceEngine.getCacheHealthStatus();
    
    expect(healthStatus.status).toBeDefined();
    expect(healthStatus.cacheStats).toBeDefined();
    expect(healthStatus.engineStats).toBeDefined();
    expect(healthStatus.recommendations).toBeDefined();
    
    // Cache should be healthy with recent activity
    expect(['healthy', 'warning']).toContain(healthStatus.status);
  });

  test('should handle error scenarios gracefully', () => {
    // Test with invalid program data
    const invalidProgram = {
      name: 'Invalid Program'
      // Missing required fields
    };

    const validation = validateProgramMetadata(invalidProgram);
    expect(validation.isValid).toBe(false);
    expect(validation.missingFields).toBeDefined();
    expect(validation.missingFields.length).toBeGreaterThan(0);
  });

  test('should support cache maintenance operations', () => {
    // Pre-populate cache
    relevanceEngine.classifyPrograms();
    
    const maintenanceResult = relevanceEngine.performCacheMaintenance({
      cleanExpired: true,
      optimizeMemory: true,
      validateConsistency: true
    });

    expect(maintenanceResult.success).toBe(true);
    expect(maintenanceResult.actions).toBeDefined();
    expect(Array.isArray(maintenanceResult.actions)).toBe(true);
  });
});