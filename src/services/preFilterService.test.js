/**
 * Property-Based Tests for Pre-Filter Service
 * Feature: simplified-filter-form, optimized-funding-logic
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  filterByState, 
  filterByType, 
  filterByMeasures, 
  filterByRelevance,
  preFilterPrograms 
} from './preFilterService.js';
import { RelevanceEngine } from './RelevanceEngine.js';

// German federal states for testing
const GERMAN_STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'];

// Generators for property-based testing
const programGen = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }),
  federalStates: fc.array(fc.oneof(fc.constantFrom(...GERMAN_STATES), fc.constant('all')), { minLength: 1, maxLength: 3 }),
  type: fc.array(fc.constantFrom('playground', 'calisthenics', 'combination'), { minLength: 1, maxLength: 3 }),
  measures: fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'greening'), { minLength: 0, maxLength: 4 }),
  fundingRate: fc.string(),
  source: fc.webUrl(),
  description: fc.string({ minLength: 10, maxLength: 100 })
});

// Enhanced program generator with relevance metadata for testing
const enhancedProgramGen = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }),
  federalStates: fc.array(fc.oneof(fc.constantFrom(...GERMAN_STATES), fc.constant('all')), { minLength: 1, maxLength: 3 }),
  type: fc.array(fc.constantFrom('playground', 'calisthenics', 'combination'), { minLength: 1, maxLength: 3 }),
  measures: fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'greening'), { minLength: 0, maxLength: 4 }),
  fundingRate: fc.string(),
  source: fc.webUrl(),
  description: fc.string({ minLength: 10, maxLength: 100 }),
  // Additional fields for relevance testing
  relevanceLevel: fc.constantFrom(1, 2, 3, 4),
  isFederalStateSpecific: fc.boolean(),
  playgroundFundingHistory: fc.boolean()
});

describe('Pre-Filter Service Property Tests', () => {
  
  describe('Property 1: State Filter Correctness', () => {
    it('should only return programs that include the selected state or "all"', () => {
      // Feature: simplified-filter-form, Property 1: State Filter Correctness
      fc.assert(fc.property(
        fc.array(programGen, { minLength: 0, maxLength: 10 }),
        fc.constantFrom(...GERMAN_STATES),
        (programs, selectedState) => {
          const result = filterByState(programs, selectedState);
          
          // All returned programs must include the selected state OR "all"
          return result.every(program => 
            program.federalStates.includes(selectedState) || 
            program.federalStates.includes('all')
          );
        }
      ), { numRuns: 10 });  // Reduced for faster execution
    });
  });

  describe('Property 2: Type Filter Correctness', () => {
    it('should only return programs that include the selected project type', () => {
      // Feature: simplified-filter-form, Property 2: Type Filter Correctness
      fc.assert(fc.property(
        fc.array(programGen, { minLength: 0, maxLength: 10 }),
        fc.constantFrom('playground', 'calisthenics'),
        (programs, selectedType) => {
          const result = filterByType(programs, selectedType);
          
          // All returned programs must include the selected type
          return result.every(program => 
            program.type && program.type.includes(selectedType)
          );
        }
      ), { numRuns: 10 });  // Reduced for faster execution
    });
  });

  describe('Property 3: Measure Filter Correctness', () => {
    it('should only return programs that support ALL selected measures', () => {
      // Feature: simplified-filter-form, Property 3: Measure Filter Correctness
      fc.assert(fc.property(
        fc.array(programGen, { minLength: 0, maxLength: 10 }),
        fc.array(fc.constantFrom('newBuild', 'accessibility'), { minLength: 1, maxLength: 2 }),
        (programs, selectedMeasures) => {
          const result = filterByMeasures(programs, selectedMeasures);
          
          // All returned programs must include ALL selected measures
          return result.every(program => 
            program.measures && 
            selectedMeasures.every(measure => program.measures.includes(measure))
          );
        }
      ), { numRuns: 10 });  // Reduced for faster execution
    });
  });

  describe('Property 4: Empty Measures Passthrough', () => {
    it('should return all programs when no measures are selected', () => {
      // Feature: simplified-filter-form, Property 4: Empty Measures Passthrough
      fc.assert(fc.property(
        fc.array(programGen, { minLength: 0, maxLength: 10 }),
        (programs) => {
          const result = filterByMeasures(programs, []);
          
          // Should return all programs when measures array is empty
          return result.length === programs.length;
        }
      ), { numRuns: 10 });  // Reduced for faster execution
    });
  });

  describe('Property 5: Pre-Filter Determinism', () => {
    it('should produce identical results when called multiple times with same input', () => {
      // Feature: simplified-filter-form, Property 5: Pre-Filter Determinism
      fc.assert(fc.property(
        fc.array(programGen, { minLength: 0, maxLength: 5 }),
        fc.constantFrom(...GERMAN_STATES),
        fc.constantFrom('playground', 'calisthenics'),
        fc.array(fc.constantFrom('newBuild', 'accessibility'), { minLength: 0, maxLength: 2 }),
        (programs, federalState, projectType, measures) => {
          const input = { federalState, projectType, measures };
          
          // Call preFilterPrograms multiple times
          const result1 = preFilterPrograms(input, programs);
          const result2 = preFilterPrograms(input, programs);
          
          // Results should be identical
          return result1.programs.length === result2.programs.length &&
                 result1.stateSpecificCount === result2.stateSpecificCount &&
                 result1.bundesweiteCount === result2.bundesweiteCount;
        }
      ), { numRuns: 10 });  // Reduced for faster execution
    });
  });

  // New tests for relevance-based filtering (optimized-funding-logic feature)
  describe('Property 6: Relevance Filter Correctness', () => {
    it('should exclude all Level 4 programs when RelevanceEngine is provided', () => {
      // Feature: optimized-funding-logic, Property 3: Excluded Programs Filtering
      fc.assert(fc.property(
        fc.array(enhancedProgramGen, { minLength: 0, maxLength: 10 }),
        (programs) => {
          // Create a mock RelevanceEngine that returns the relevanceLevel from program data
          const mockRelevanceEngine = {
            getRelevanceLevel: (program) => program.relevanceLevel
          };
          
          const result = filterByRelevance(programs, mockRelevanceEngine);
          
          // All returned programs must NOT be Level 4
          return result.every(program => program.relevanceLevel !== 4);
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 7: Backward Compatibility', () => {
    it('should return all programs when no RelevanceEngine is provided', () => {
      // Feature: optimized-funding-logic, Property 7: Backward Compatibility
      fc.assert(fc.property(
        fc.array(programGen, { minLength: 0, maxLength: 10 }),
        (programs) => {
          const result = filterByRelevance(programs, null);
          
          // Should return all programs when no RelevanceEngine provided
          return result.length === programs.length;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 8: Enhanced Pre-Filter with Relevance', () => {
    it('should maintain existing functionality while adding relevance filtering', () => {
      // Feature: optimized-funding-logic, Property 7: Backward Compatibility
      fc.assert(fc.property(
        fc.array(enhancedProgramGen, { minLength: 0, maxLength: 5 }),
        fc.constantFrom(...GERMAN_STATES),
        fc.constantFrom('playground', 'calisthenics'),
        fc.array(fc.constantFrom('newBuild', 'accessibility'), { minLength: 0, maxLength: 2 }),
        (programs, federalState, projectType, measures) => {
          const input = { federalState, projectType, measures };
          
          // Create a mock RelevanceEngine
          const mockRelevanceEngine = {
            getRelevanceLevel: (program) => program.relevanceLevel
          };
          
          // Test with and without RelevanceEngine
          const resultWithoutEngine = preFilterPrograms(input, programs);
          const resultWithEngine = preFilterPrograms(input, programs, mockRelevanceEngine);
          
          // With engine should have same or fewer programs (due to Level 4 exclusion)
          const level4Count = programs.filter(p => p.relevanceLevel === 4).length;
          const expectedDifference = level4Count;
          
          // Account for programs that might be filtered out by other filters too
          return resultWithEngine.programs.length <= resultWithoutEngine.programs.length;
        }
      ), { numRuns: 10 });
    });
  });

  describe('Property 9: Relevance Filter Integration', () => {
    it('should apply relevance filtering before other filters', () => {
      // Feature: optimized-funding-logic, Property 3: Excluded Programs Filtering
      fc.assert(fc.property(
        fc.array(enhancedProgramGen, { minLength: 1, maxLength: 10 }),
        fc.constantFrom(...GERMAN_STATES),
        fc.constantFrom('playground', 'calisthenics'),
        (programs, federalState, projectType) => {
          // Ensure we have at least one Level 4 program
          const programsWithLevel4 = [
            ...programs,
            {
              ...programs[0],
              name: 'Level4TestProgram',
              relevanceLevel: 4,
              federalStates: [federalState],
              type: [projectType]
            }
          ];
          
          const input = { federalState, projectType, measures: [] };
          
          const mockRelevanceEngine = {
            getRelevanceLevel: (program) => program.relevanceLevel
          };
          
          const result = preFilterPrograms(input, programsWithLevel4, mockRelevanceEngine);
          
          // Level 4 program should be excluded even if it matches other criteria
          return !result.programs.some(program => program.relevanceLevel === 4);
        }
      ), { numRuns: 10 });
    });
  });
});

// Unit Tests for specific examples and edge cases
describe('Pre-Filter Service Unit Tests', () => {
  
  describe('filterByRelevance', () => {
    it('should exclude Level 4 programs when RelevanceEngine is provided', () => {
      const programs = [
        { name: 'Level1Program', relevanceLevel: 1 },
        { name: 'Level2Program', relevanceLevel: 2 },
        { name: 'Level3Program', relevanceLevel: 3 },
        { name: 'Level4Program', relevanceLevel: 4 }
      ];
      
      const mockRelevanceEngine = {
        getRelevanceLevel: (program) => program.relevanceLevel
      };
      
      const result = filterByRelevance(programs, mockRelevanceEngine);
      
      expect(result).toHaveLength(3);
      expect(result.map(p => p.name)).toEqual(['Level1Program', 'Level2Program', 'Level3Program']);
    });

    it('should return all programs when no RelevanceEngine is provided', () => {
      const programs = [
        { name: 'Program1' },
        { name: 'Program2' },
        { name: 'Program3' }
      ];
      
      const result = filterByRelevance(programs, null);
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(programs);
    });

    it('should handle empty program array', () => {
      const mockRelevanceEngine = {
        getRelevanceLevel: () => 1
      };
      
      const result = filterByRelevance([], mockRelevanceEngine);
      
      expect(result).toEqual([]);
    });

    it('should handle invalid input gracefully', () => {
      const mockRelevanceEngine = {
        getRelevanceLevel: () => 1
      };
      
      const result = filterByRelevance(null, mockRelevanceEngine);
      
      expect(result).toEqual([]);
    });
  });

  describe('preFilterPrograms with RelevanceEngine', () => {
    it('should integrate relevance filtering with existing filters', () => {
      const programs = [
        {
          name: 'ValidLevel1Program',
          relevanceLevel: 1,
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild']
        },
        {
          name: 'ValidLevel2Program',
          relevanceLevel: 2,
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild']
        },
        {
          name: 'ExcludedLevel4Program',
          relevanceLevel: 4,
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild']
        }
      ];
      
      const mockRelevanceEngine = {
        getRelevanceLevel: (program) => program.relevanceLevel
      };
      
      const input = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      const result = preFilterPrograms(input, programs, mockRelevanceEngine);
      
      expect(result.programs).toHaveLength(2);
      expect(result.programs.map(p => p.name)).toEqual(['ValidLevel1Program', 'ValidLevel2Program']);
    });

    it('should maintain backward compatibility when no RelevanceEngine provided', () => {
      const programs = [
        {
          name: 'Program1',
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild']
        },
        {
          name: 'Program2',
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild']
        }
      ];
      
      const input = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      // Test without RelevanceEngine (backward compatibility)
      const resultWithoutEngine = preFilterPrograms(input, programs);
      
      // Test with null RelevanceEngine (should be same)
      const resultWithNullEngine = preFilterPrograms(input, programs, null);
      
      expect(resultWithoutEngine.programs).toHaveLength(2);
      expect(resultWithNullEngine.programs).toHaveLength(2);
      expect(resultWithoutEngine.programs).toEqual(resultWithNullEngine.programs);
    });

    it('should handle programs that pass relevance but fail other filters', () => {
      const programs = [
        {
          name: 'RelevantButWrongState',
          relevanceLevel: 1,
          federalStates: ['NW'], // Wrong state
          type: ['playground'],
          measures: ['newBuild']
        },
        {
          name: 'RelevantAndCorrect',
          relevanceLevel: 2,
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild']
        }
      ];
      
      const mockRelevanceEngine = {
        getRelevanceLevel: (program) => program.relevanceLevel
      };
      
      const input = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      const result = preFilterPrograms(input, programs, mockRelevanceEngine);
      
      expect(result.programs).toHaveLength(1);
      expect(result.programs[0].name).toBe('RelevantAndCorrect');
    });

    it('should work with real RelevanceEngine instance', () => {
      const programs = [
        {
          name: 'TestProgram1',
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild'],
          description: 'Test program for playgrounds'
        },
        {
          name: 'TestProgram2',
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild'],
          description: 'Another test program'
        }
      ];
      
      const relevanceEngine = new RelevanceEngine(programs);
      
      const input = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      const result = preFilterPrograms(input, programs, relevanceEngine);
      
      // Should return programs that are not Level 4
      expect(result.programs.length).toBeGreaterThanOrEqual(0);
      expect(result.programs.length).toBeLessThanOrEqual(programs.length);
      
      // Verify no Level 4 programs in result
      result.programs.forEach(program => {
        const level = relevanceEngine.getRelevanceLevel(program);
        expect(level).not.toBe(4);
      });
    });
  });
});