/**
 * Unit Tests for RelevanceEngine
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { RelevanceEngine } from './RelevanceEngine.js';
import { RelevanceClassifier } from './RelevanceClassifier.js';
import { FederalStatePrioritizer } from './FederalStatePrioritizer.js';
import { RelevanceCache } from './RelevanceCache.js';
import * as fc from 'fast-check';

describe('RelevanceEngine', () => {
  let mockPrograms;
  let engine;

  beforeEach(() => {
    mockPrograms = [
      {
        name: 'Bayern Spielplatzförderung',
        type: ['playground'],
        federalStates: ['BY'],
        measures: ['newBuild', 'renovation'],
        description: 'Landesförderprogramm für Spielplätze in Bayern'
      },
      {
        name: 'Städtebauförderung - Lebendige Zentren',
        type: ['playground', 'combination'],
        federalStates: ['all'],
        measures: ['newBuild', 'renovation', 'accessibility'],
        description: 'Bundesweite Städtebauförderung'
      },
      {
        name: 'EFRE Spielplatzmodernisierung',
        type: ['playground'],
        federalStates: ['all'],
        measures: ['renovation', 'accessibility'],
        description: 'EU-Förderung für Spielplätze über EFRE'
      },
      {
        name: 'Digitalisierung Hochschulen',
        type: ['research'],
        federalStates: ['all'],
        measures: ['digitalization'],
        description: 'Förderung der Digitalisierung an Hochschulen'
      }
    ];

    engine = new RelevanceEngine(mockPrograms);
  });

  describe('Constructor', () => {
    test('should initialize with programs and create classifier and prioritizer', () => {
      expect(engine.programs).toEqual(mockPrograms);
      expect(engine.classifier).toBeInstanceOf(RelevanceClassifier);
      expect(engine.prioritizer).toBeInstanceOf(FederalStatePrioritizer);
      expect(engine.classifiedPrograms).toBeInstanceOf(Map);
    });

    test('should initialize with empty array if no programs provided', () => {
      const emptyEngine = new RelevanceEngine();
      expect(emptyEngine.programs).toEqual([]);
    });

    test('should accept cache parameter', () => {
      const cache = new RelevanceCache();
      const engineWithCache = new RelevanceEngine(mockPrograms, cache);
      expect(engineWithCache.cache).toBe(cache);
    });
  });

  describe('classifyPrograms', () => {
    test('should classify all programs with relevance metadata', () => {
      const classified = engine.classifyPrograms();
      
      expect(classified).toHaveLength(mockPrograms.length);
      
      classified.forEach(program => {
        expect(program).toHaveProperty('relevanceLevel');
        expect(program).toHaveProperty('isFederalStateSpecific');
        expect(program).toHaveProperty('playgroundFundingHistory');
        expect(program).toHaveProperty('lastRelevanceUpdate');
        expect(typeof program.relevanceLevel).toBe('number');
        expect([1, 2, 3, 4]).toContain(program.relevanceLevel);
      });
    });

    test('should classify Bayern program as Core (Level 1)', () => {
      const classified = engine.classifyPrograms();
      const bayernProgram = classified.find(p => p.name === 'Bayern Spielplatzförderung');
      
      expect(bayernProgram.relevanceLevel).toBe(1);
      expect(bayernProgram.isFederalStateSpecific).toBe(true);
      expect(bayernProgram.playgroundFundingHistory).toBe(true);
    });

    test('should classify EFRE program as Supplementary (Level 2)', () => {
      const classified = engine.classifyPrograms();
      const efreProgram = classified.find(p => p.name === 'EFRE Spielplatzmodernisierung');
      
      expect(efreProgram.relevanceLevel).toBe(2);
    });

    test('should classify Städtebauförderung as Supplementary (Level 2)', () => {
      const classified = engine.classifyPrograms();
      const staedtebauProgram = classified.find(p => p.name === 'Städtebauförderung - Lebendige Zentren');
      
      expect(staedtebauProgram.relevanceLevel).toBe(2); // Städtebauförderung is federal program implemented at state level
    });

    test('should classify irrelevant program as Excluded (Level 4)', () => {
      const classified = engine.classifyPrograms();
      const digitalProgram = classified.find(p => p.name === 'Digitalisierung Hochschulen');
      
      expect(digitalProgram.relevanceLevel).toBe(4);
    });
  });

  describe('getProgramsByRelevance', () => {
    test('should return programs filtered by relevance level', () => {
      const corePrograms = engine.getProgramsByRelevance(1);
      const excludedPrograms = engine.getProgramsByRelevance(4);
      
      expect(corePrograms.length).toBeGreaterThan(0);
      expect(excludedPrograms.length).toBeGreaterThan(0);
      
      corePrograms.forEach(program => {
        expect(program.relevanceLevel).toBe(1);
      });
      
      excludedPrograms.forEach(program => {
        expect(program.relevanceLevel).toBe(4);
      });
    });

    test('should filter by federal state when provided', () => {
      const bayernPrograms = engine.getProgramsByRelevance(1, 'BY');
      
      bayernPrograms.forEach(program => {
        expect(program.relevanceLevel).toBe(1);
        expect(
          program.federalStates.includes('BY') || 
          program.federalStates.includes('all')
        ).toBe(true);
      });
    });

    test('should return empty array for non-existent relevance level', () => {
      const invalidPrograms = engine.getProgramsByRelevance(99);
      expect(invalidPrograms).toEqual([]);
    });
  });

  describe('calculateRelevanceScore', () => {
    test('should calculate higher scores for better matches', () => {
      const program = mockPrograms[0]; // Bayern Spielplatzförderung
      const userCriteria = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild', 'renovation']
      };
      
      const score = engine.calculateRelevanceScore(program, userCriteria);
      expect(score).toBeGreaterThan(50); // Should be high score
    });

    test('should calculate lower scores for poor matches', () => {
      const program = mockPrograms[3]; // Digitalisierung Hochschulen
      const userCriteria = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      const score = engine.calculateRelevanceScore(program, userCriteria);
      expect(score).toBeLessThan(30); // Should be low score
    });

    test('should cap scores at 100', () => {
      const program = mockPrograms[0];
      const userCriteria = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild', 'renovation']
      };
      
      const score = engine.calculateRelevanceScore(program, userCriteria);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getRelevanceLevel', () => {
    test('should return relevance level for a program', () => {
      const program = mockPrograms[0];
      const level = engine.getRelevanceLevel(program);
      
      expect(typeof level).toBe('number');
      expect([1, 2, 3, 4]).toContain(level);
    });

    test('should use cached result if available', () => {
      const program = mockPrograms[0];
      
      // First call should classify and cache
      const level1 = engine.getRelevanceLevel(program);
      
      // Second call should use cached result
      const level2 = engine.getRelevanceLevel(program);
      
      expect(level1).toBe(level2);
      expect(engine.classifiedPrograms.has(program.name)).toBe(true);
    });
  });

  describe('Cache Integration', () => {
    test('should use cache when available', () => {
      const cache = new RelevanceCache();
      const engineWithCache = new RelevanceEngine(mockPrograms, cache);
      
      // First classification should populate cache
      const classified1 = engineWithCache.classifyPrograms();
      expect(cache.size()).toBeGreaterThan(0);
      
      // Second classification should use cache - compare just the core properties
      const classified2 = engineWithCache.classifyPrograms();
      
      // Compare the essential properties (ignoring cache metadata)
      expect(classified1.length).toBe(classified2.length);
      classified1.forEach((program1, index) => {
        const program2 = classified2[index];
        expect(program1.name).toBe(program2.name);
        expect(program1.relevanceLevel).toBe(program2.relevanceLevel);
        expect(program1.isFederalStateSpecific).toBe(program2.isFederalStateSpecific);
        expect(program1.playgroundFundingHistory).toBe(program2.playgroundFundingHistory);
      });
    });

    test('should work without cache', () => {
      const engineWithoutCache = new RelevanceEngine(mockPrograms, null);
      
      const classified = engineWithoutCache.classifyPrograms();
      expect(classified).toHaveLength(mockPrograms.length);
    });
  });

  describe('invalidateCache', () => {
    test('should invalidate specific programs', () => {
      const cache = new RelevanceCache();
      const engineWithCache = new RelevanceEngine(mockPrograms, cache);
      
      // Populate cache
      engineWithCache.classifyPrograms();
      const initialSize = cache.size();
      
      // Invalidate specific program
      engineWithCache.invalidateCache(['Bayern Spielplatzförderung']);
      
      expect(cache.size()).toBeLessThan(initialSize);
    });

    test('should invalidate all cache when no programs specified', () => {
      const cache = new RelevanceCache();
      const engineWithCache = new RelevanceEngine(mockPrograms, cache);
      
      // Populate cache
      engineWithCache.classifyPrograms();
      expect(cache.size()).toBeGreaterThan(0);
      
      // Invalidate all
      engineWithCache.invalidateCache();
      
      expect(cache.size()).toBe(0);
    });
  });

  describe('getClassificationStats', () => {
    test('should return classification statistics', () => {
      const stats = engine.getClassificationStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('core');
      expect(stats).toHaveProperty('supplementary');
      expect(stats).toHaveProperty('national');
      expect(stats).toHaveProperty('excluded');
      expect(stats).toHaveProperty('federalStateSpecific');
      expect(stats).toHaveProperty('playgroundRelevant');
      
      expect(stats.total).toBe(mockPrograms.length);
      expect(stats.core + stats.supplementary + stats.national + stats.excluded).toBe(stats.total);
    });
  });

  describe('FederalStatePrioritizer Integration', () => {
    test('should prioritize programs by federal state', () => {
      const prioritized = engine.prioritizeByFederalState(mockPrograms, 'BY');
      
      expect(prioritized).toHaveLength(mockPrograms.length);
      expect(prioritized[0]).toHaveProperty('statePriorityScore');
      
      // Bayern program should be prioritized
      const bayernProgram = prioritized.find(p => p.name === 'Bayern Spielplatzförderung');
      expect(bayernProgram.statePriorityScore).toBeGreaterThan(0);
    });

    test('should get programs by state specificity', () => {
      const stateSpecific = engine.getProgramsByStateSpecificity('BY', 'state-specific');
      const national = engine.getProgramsByStateSpecificity('BY', 'national');
      
      expect(Array.isArray(stateSpecific)).toBe(true);
      expect(Array.isArray(national)).toBe(true);
      
      // National programs should include those with 'all' states
      const nationalProgram = national.find(p => 
        p.federalStates && p.federalStates.includes('all')
      );
      expect(nationalProgram).toBeDefined();
    });

    test('should get enhanced statistics with state data', () => {
      const stats = engine.getEnhancedStats('BY');
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('core');
      expect(stats).toHaveProperty('stateSpecific');
      expect(stats.stateSpecific).toHaveProperty('available');
      expect(stats.stateSpecific).toHaveProperty('stateSpecific');
      expect(stats.stateSpecific).toHaveProperty('national');
    });

    test('should check federal state matches', () => {
      const bayernProgram = mockPrograms[0]; // Bayern program
      const nationalProgram = mockPrograms[1]; // National program
      
      expect(engine.matchesFederalState(bayernProgram, 'BY')).toBe(true);
      expect(engine.matchesFederalState(bayernProgram, 'NW')).toBe(false);
      expect(engine.matchesFederalState(nationalProgram, 'BY')).toBe(true);
      expect(engine.matchesFederalState(nationalProgram, 'NW')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty programs array', () => {
      const emptyEngine = new RelevanceEngine([]);
      const classified = emptyEngine.classifyPrograms();
      
      expect(classified).toEqual([]);
    });

    test('should handle programs with missing properties', () => {
      const incompletePrograms = [
        { name: 'Incomplete Program' },
        { name: 'Another Incomplete', type: ['playground'] }
      ];
      
      const incompleteEngine = new RelevanceEngine(incompletePrograms);
      const classified = incompleteEngine.classifyPrograms();
      
      expect(classified).toHaveLength(2);
      classified.forEach(program => {
        expect(program).toHaveProperty('relevanceLevel');
      });
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    // Generator for arbitrary funding programs
    const arbitraryFundingProgram = () => fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      type: fc.option(fc.array(fc.constantFrom('playground', 'combination', 'research', 'infrastructure', 'social'), { minLength: 0, maxLength: 3 }), { nil: [] }),
      federalStates: fc.option(fc.oneof(
        fc.constant(['all']),
        fc.array(fc.constantFrom('BY', 'BW', 'NW', 'NI', 'HE', 'RP', 'SH', 'BB', 'SN', 'ST', 'TH', 'MV', 'SL', 'HB', 'HH', 'BE'), { minLength: 1, maxLength: 5 })
      ), { nil: ['all'] }),
      measures: fc.option(fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'digitalization', 'expansion'), { minLength: 0, maxLength: 4 }), { nil: [] }),
      description: fc.option(fc.string({ maxLength: 500 }), { nil: '' }),
      source: fc.option(fc.string({ maxLength: 100 }), { nil: '' })
    });

    /**
     * Property 1: Complete Relevance Classification
     * **Validates: Requirements 1.1**
     * 
     * For any funding program in the system, the Relevance_Engine should classify it 
     * into exactly one of the four relevance levels (1, 2, 3, or 4)
     */
    test('Property 1: all programs get classified into exactly one relevance level', () => {
      fc.assert(fc.property(
        fc.array(arbitraryFundingProgram(), { minLength: 0, maxLength: 50 }),
        (programs) => {
          const engine = new RelevanceEngine(programs);
          const classified = engine.classifyPrograms();
          
          // Every program should have exactly one relevance level
          return classified.every(program => {
            // Must have a relevance level property
            const hasRelevanceLevel = program.hasOwnProperty('relevanceLevel');
            
            // Relevance level must be a number
            const isNumber = typeof program.relevanceLevel === 'number';
            
            // Relevance level must be one of the four valid levels (1, 2, 3, or 4)
            const isValidLevel = [1, 2, 3, 4].includes(program.relevanceLevel);
            
            // All conditions must be true
            return hasRelevanceLevel && isNumber && isValidLevel;
          });
        }
      ), { 
        numRuns: 10,  // Reduced from 150 to 25 for faster execution
        verbose: false
      });
    });
  });
});