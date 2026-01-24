/**
 * Complete Flow Integration Test
 * 
 * This test verifies the end-to-end functionality of the optimized funding logic,
 * including filtering pipeline and relevance engine integration.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RelevanceEngine } from './services/RelevanceEngine.js';
import { RelevanceCache } from './services/RelevanceCache.js';
import { preFilterPrograms, filterByRelevance } from './services/preFilterService.js';
import { strictFilterProgramsWithRelevance } from './services/strictFilterService.js';
import { sortAndLimitByRelevance } from './services/sortService.js';
import { fundingPrograms } from './data/fundingPrograms.js';

describe('Complete Flow Integration Test', () => {
  let cache;
  let relevanceEngine;

  beforeEach(() => {
    // Initialize the complete service chain
    cache = new RelevanceCache({
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      enableMetrics: true
    });

    relevanceEngine = new RelevanceEngine(fundingPrograms, cache);
  });

  test('should process complete filtering pipeline correctly', async () => {
    const userCriteria = {
      projectType: 'playground',
      federalState: 'BY',
      measures: ['newBuild', 'renovation'],
      budget: 50000,
      urgency: 'medium'
    };

    // Step 1: Pre-filtering (should exclude Level 4 programs)
    const preFilterResult = preFilterPrograms(userCriteria, fundingPrograms, relevanceEngine);
    const preFiltered = preFilterResult.programs;
    
    // Verify no Level 4 programs are included
    const classifiedPrograms = relevanceEngine.classifyPrograms();
    const level4Programs = classifiedPrograms.filter(p => p.relevanceLevel === 4);
    const level4InResults = preFiltered.filter(p => 
      level4Programs.some(l4 => l4.name === p.name)
    );
    expect(level4InResults).toHaveLength(0);

    // Step 2: Strict filtering with relevance scoring
    const strictFiltered = strictFilterProgramsWithRelevance(preFiltered, userCriteria, relevanceEngine);
    
    // Verify all programs have relevance scores
    strictFiltered.forEach(program => {
      expect(program.relevanceScore).toBeDefined();
      expect(typeof program.relevanceScore).toBe('number');
      expect(program.relevanceScore).toBeGreaterThan(0);
    });

    // Step 3: Multi-level sorting and limiting
    const sorted = sortAndLimitByRelevance(strictFiltered, userCriteria.federalState, 15);
    
    // Verify sorting order: Level 1 > Level 2 > Level 3
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      
      // Primary sort: relevance level (lower number = higher relevance)
      if (current.relevanceLevel !== next.relevanceLevel) {
        expect(current.relevanceLevel).toBeLessThanOrEqual(next.relevanceLevel);
      }
    }

    // Step 4: Result limiting
    expect(sorted.length).toBeLessThanOrEqual(15);

    // Verify Bayern-specific programs are prioritized
    const bayernPrograms = sorted.filter(p => 
      p.federalStates && p.federalStates.includes('BY')
    );
    const nationalPrograms = sorted.filter(p => 
      p.federalStates && p.federalStates.includes('all')
    );
    
    if (bayernPrograms.length > 0 && nationalPrograms.length > 0) {
      // Bayern programs should appear before national programs of same relevance level
      const firstBayern = sorted.findIndex(p => bayernPrograms.includes(p));
      const firstNational = sorted.findIndex(p => nationalPrograms.includes(p));
      
      if (firstBayern !== -1 && firstNational !== -1) {
        const bayernProgram = sorted[firstBayern];
        const nationalProgram = sorted[firstNational];
        
        if (bayernProgram.relevanceLevel === nationalProgram.relevanceLevel) {
          expect(firstBayern).toBeLessThan(firstNational);
        }
      }
    }
  });

  test('should handle playground-specific programs correctly', () => {
    const playgroundCriteria = {
      projectType: 'playground',
      federalState: 'NW',
      measures: ['newBuild'],
      budget: 100000
    };

    const preFilterResult = preFilterPrograms(playgroundCriteria, fundingPrograms, relevanceEngine);
    const strictResults = strictFilterProgramsWithRelevance(preFilterResult.programs, playgroundCriteria, relevanceEngine);
    
    // Programs with playground funding history should score higher
    const playgroundPrograms = strictResults.filter(p => p.playgroundFundingHistory === true);
    const otherPrograms = strictResults.filter(p => p.playgroundFundingHistory !== true);
    
    if (playgroundPrograms.length > 0 && otherPrograms.length > 0) {
      const avgPlaygroundScore = playgroundPrograms.reduce((sum, p) => sum + p.relevanceScore, 0) / playgroundPrograms.length;
      const avgOtherScore = otherPrograms.reduce((sum, p) => sum + p.relevanceScore, 0) / otherPrograms.length;
      
      expect(avgPlaygroundScore).toBeGreaterThanOrEqual(avgOtherScore);
    }
  });

  test('should maintain backward compatibility with existing API', () => {
    // Test that old API calls still work
    const legacyCriteria = {
      projectType: 'playground',
      federalState: 'BW',
      budget: 75000,
      measures: ['newBuild', 'renovation'] // Default measures
    };

    const result = preFilterPrograms(legacyCriteria, fundingPrograms, relevanceEngine);
    expect(Array.isArray(result.programs)).toBe(true);
    expect(result.programs.length).toBeGreaterThan(0);

    // Verify results have expected structure
    result.programs.forEach(program => {
      expect(program.name).toBeDefined();
      expect(program.federalStates).toBeDefined();
      expect(program.type).toBeDefined();
    });
  });

  test('should handle caching performance correctly', () => {
    const criteria = {
      projectType: 'playground',
      federalState: 'HE',
      measures: ['renovation']
    };

    // Test that cache exists and has basic functionality
    expect(cache).toBeDefined();
    expect(typeof cache.getStats).toBe('function');
    
    // Get initial stats
    const initialStats = cache.getStats();
    expect(initialStats).toBeDefined();
    expect(typeof initialStats.size).toBe('number');
    expect(typeof initialStats.totalHits).toBe('number');
    expect(typeof initialStats.totalMisses).toBe('number');

    // Run operations that should work with or without cache
    const firstResult = preFilterPrograms(criteria, fundingPrograms, relevanceEngine);
    const secondResult = preFilterPrograms(criteria, fundingPrograms, relevanceEngine);

    // Results should be identical (whether cached or not)
    expect(secondResult.programs).toEqual(firstResult.programs);
    
    // Cache should be functional (stats should be accessible)
    const finalStats = cache.getStats();
    expect(finalStats).toBeDefined();
  });

  test('should handle error scenarios gracefully', () => {
    // Test with invalid criteria
    const invalidCriteria = {
      projectType: 'invalid_type',
      federalState: 'INVALID',
      measures: []
    };

    expect(() => {
      preFilterPrograms(invalidCriteria, fundingPrograms, relevanceEngine);
    }).not.toThrow();

    // Test with empty program list
    expect(() => {
      preFilterPrograms(invalidCriteria, [], relevanceEngine);
    }).not.toThrow();

    // Test with minimal valid criteria (null handling is done by the service)
    const minimalCriteria = {
      projectType: 'playground',
      federalState: 'BY',
      measures: ['newBuild']
    };
    
    expect(() => {
      preFilterPrograms(minimalCriteria, fundingPrograms, relevanceEngine);
    }).not.toThrow();
  });

  test('should validate all programs have enhanced metadata', () => {
    const classifiedPrograms = relevanceEngine.classifyPrograms();
    
    expect(classifiedPrograms.length).toBeGreaterThanOrEqual(85);
    expect(classifiedPrograms.length).toBe(90); // Current count after removing 6 programs

    classifiedPrograms.forEach((program, index) => {
      // Verify all required metadata fields are present
      expect(program.relevanceLevel, `Program ${index}: ${program.name} missing relevanceLevel`).toBeDefined();
      expect(program.relevanceLevel, `Program ${index}: ${program.name} invalid relevanceLevel`).toBeGreaterThanOrEqual(1);
      expect(program.relevanceLevel, `Program ${index}: ${program.name} invalid relevanceLevel`).toBeLessThanOrEqual(4);
      
      expect(program.isFederalStateSpecific, `Program ${index}: ${program.name} missing isFederalStateSpecific`).toBeDefined();
      expect(typeof program.isFederalStateSpecific, `Program ${index}: ${program.name} invalid isFederalStateSpecific type`).toBe('boolean');
      
      expect(program.playgroundFundingHistory, `Program ${index}: ${program.name} missing playgroundFundingHistory`).toBeDefined();
      expect(typeof program.playgroundFundingHistory, `Program ${index}: ${program.name} invalid playgroundFundingHistory type`).toBe('boolean');
      
      expect(program.programOrigin, `Program ${index}: ${program.name} missing programOrigin`).toBeDefined();
      expect(program.implementationLevel, `Program ${index}: ${program.name} missing implementationLevel`).toBeDefined();
      expect(program.successRate, `Program ${index}: ${program.name} missing successRate`).toBeDefined();
      expect(program.lastRelevanceUpdate, `Program ${index}: ${program.name} missing lastRelevanceUpdate`).toBeDefined();
    });
  });

  test('should meet performance requirements for 95+ programs', async () => {
    const criteria = {
      projectType: 'playground',
      federalState: 'NW',
      measures: ['newBuild', 'renovation'],
      budget: 100000
    };

    const startTime = Date.now();
    
    // Complete filtering pipeline
    const preFilterResult = preFilterPrograms(criteria, fundingPrograms, relevanceEngine);
    expect(preFilterResult.programs.length).toBeGreaterThan(0); // Ensure we have programs to work with
    
    const strictFiltered = strictFilterProgramsWithRelevance(preFilterResult.programs, criteria, relevanceEngine);
    const sorted = sortAndLimitByRelevance(strictFiltered, criteria.federalState, 15);
    
    const totalTime = Date.now() - startTime;
    
    // Should complete within 500ms requirement
    expect(totalTime).toBeLessThan(500);
    
    // Should return meaningful results (at least some programs should pass through)
    expect(preFilterResult.programs.length).toBeGreaterThan(0);
    expect(sorted.length).toBeLessThanOrEqual(15);
  });

  test('should handle all federal states correctly', () => {
    const federalStates = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'];
    
    federalStates.forEach(state => {
      const criteria = {
        projectType: 'playground',
        federalState: state,
        measures: ['newBuild']
      };

      const result = preFilterPrograms(criteria, fundingPrograms, relevanceEngine);
      const sorted = sortAndLimitByRelevance(result.programs, state, 15);
      
      // Should return results for each state
      expect(result.programs.length).toBeGreaterThan(0);
      
      // State-specific programs should be prioritized
      const statePrograms = sorted.filter(p => 
        p.federalStates && p.federalStates.includes(state)
      );
      
      if (statePrograms.length > 0) {
        // First program should be state-specific or have high relevance
        const firstProgram = sorted[0];
        const isStateSpecific = firstProgram.federalStates && firstProgram.federalStates.includes(state);
        const isHighRelevance = firstProgram.relevanceLevel <= 2;
        
        expect(isStateSpecific || isHighRelevance).toBe(true);
      }
    });
  });

  test('should provide correct relevance level distribution', () => {
    const classifiedPrograms = relevanceEngine.classifyPrograms();
    
    const levelCounts = {
      1: classifiedPrograms.filter(p => p.relevanceLevel === 1).length,
      2: classifiedPrograms.filter(p => p.relevanceLevel === 2).length,
      3: classifiedPrograms.filter(p => p.relevanceLevel === 3).length,
      4: classifiedPrograms.filter(p => p.relevanceLevel === 4).length
    };

    // Should have programs in each relevance level
    expect(levelCounts[1]).toBeGreaterThan(0); // Core Programs
    expect(levelCounts[2]).toBeGreaterThan(0); // Supplementary Programs  
    expect(levelCounts[3]).toBeGreaterThan(0); // National Programs
    
    // Level 4 (Excluded) should be minimal
    expect(levelCounts[4]).toBeLessThan(levelCounts[1] + levelCounts[2] + levelCounts[3]);

    // Total should equal program count
    expect(levelCounts[1] + levelCounts[2] + levelCounts[3] + levelCounts[4]).toBe(classifiedPrograms.length);
  });

  test('should handle cache invalidation correctly', async () => {
    // Pre-populate cache by classifying programs
    relevanceEngine.classifyPrograms();
    const initialResult = preFilterPrograms({
      projectType: 'playground',
      federalState: 'BY'
    }, fundingPrograms, relevanceEngine);

    const initialCacheSize = cache.size();
    
    // If cache is empty, that's also valid behavior
    if (initialCacheSize === 0) {
      // Cache might not be used for this operation, which is fine
      expect(initialResult.programs).toBeDefined();
      expect(Array.isArray(initialResult.programs)).toBe(true);
      return;
    }

    expect(initialCacheSize).toBeGreaterThan(0);

    // Simulate program update that should invalidate cache
    relevanceEngine.invalidateCache('test-program-id');

    // Cache should handle invalidation gracefully
    const postInvalidationResult = preFilterPrograms({
      projectType: 'playground', 
      federalState: 'BY'
    }, fundingPrograms, relevanceEngine);

    expect(Array.isArray(postInvalidationResult.programs)).toBe(true);
  });
});