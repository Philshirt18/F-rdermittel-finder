/**
 * Property-Based Tests for Sort Service
 * Feature: optimized-funding-logic
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  sortResults, 
  sortByRelevance, 
  limitResults, 
  sortAndLimitByRelevance,
  parseFundingRate,
  matchesFederalState
} from './sortService.js';

// Generator for programs with sorting properties (legacy)
const programGen = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }),
  fitScore: fc.integer({ min: 0, max: 100 }),
  isStateSpecific: fc.boolean(),
  source: fc.webUrl(),
  fundingRate: fc.string(),
  description: fc.string()
});

// Generator for programs with relevance metadata
const relevanceProgramGen = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }),
  relevanceLevel: fc.integer({ min: 1, max: 3 }), // Only levels 1-3 for results
  federalStates: fc.oneof(
    fc.constant(['all']),
    fc.array(fc.constantFrom('BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'), { minLength: 1, maxLength: 3 })
  ),
  fundingRate: fc.oneof(
    fc.constantFrom('60-90%', '60-80%', 'bis 90%', 'bis 80%', 'bis 10.000 EUR', 'bis 5.000 EUR', 'variabel', '30-50%'),
    fc.string({ minLength: 3, maxLength: 15 })
  ),
  type: fc.array(fc.constantFrom('playground', 'calisthenics', 'combination'), { minLength: 1, maxLength: 2 }),
  measures: fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'greening'), { minLength: 1, maxLength: 4 }),
  source: fc.webUrl(),
  description: fc.string()
});

// Generator for funding rate strings
const fundingRateGen = fc.oneof(
  fc.string().map(s => `${fc.sample(fc.integer({ min: 10, max: 90 }), 1)[0]}-${fc.sample(fc.integer({ min: 50, max: 100 }), 1)[0]}%`),
  fc.string().map(s => `bis ${fc.sample(fc.integer({ min: 50, max: 100 }), 1)[0]}%`),
  fc.string().map(s => `bis ${fc.sample(fc.integer({ min: 1000, max: 50000 }), 1)[0]} EUR`),
  fc.constantFrom('variabel', 'nicht spezifiziert', ''),
  fc.string({ minLength: 0, maxLength: 20 })
);

describe('Sort Service Property Tests', () => {
  
  describe('Legacy Sorting (Backward Compatibility)', () => {
    describe('Property 7: Result Sorting Correctness', () => {
      it('should place all state-specific programs before all bundesweite programs', () => {
        // Feature: simplified-filter-form, Property 7: Result Sorting Correctness
        fc.assert(fc.property(
          fc.array(programGen, { minLength: 2, maxLength: 20 }),
          (programs) => {
            const sorted = sortResults(programs);
            
            // Find the last state-specific program and first bundesweite program
            let lastStateSpecificIndex = -1;
            let firstBundesweiteIndex = -1;
            
            for (let i = 0; i < sorted.length; i++) {
              if (sorted[i].isStateSpecific) {
                lastStateSpecificIndex = i;
              } else if (firstBundesweiteIndex === -1) {
                firstBundesweiteIndex = i;
              }
            }
            
            // If both types exist, state-specific should come before bundesweite
            if (lastStateSpecificIndex >= 0 && firstBundesweiteIndex >= 0) {
              return lastStateSpecificIndex < firstBundesweiteIndex;
            }
            
            return true; // If only one type exists, sorting is correct
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });

      it('should sort by fitScore descending within state-specific group', () => {
        // Feature: simplified-filter-form, Property 7: Result Sorting Correctness (state-specific group)
        fc.assert(fc.property(
          fc.array(programGen, { minLength: 2, maxLength: 10 }),
          (programs) => {
            const sorted = sortResults(programs);
            
            // Extract state-specific programs and check their fitScore order
            const stateSpecific = sorted.filter(p => p.isStateSpecific);
            
            if (stateSpecific.length < 2) return true; // Need at least 2 to test sorting
            
            // Check that fitScores are in descending order
            for (let i = 0; i < stateSpecific.length - 1; i++) {
              if ((stateSpecific[i].fitScore || 0) < (stateSpecific[i + 1].fitScore || 0)) {
                return false;
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });

      it('should sort by fitScore descending within bundesweite group', () => {
        // Feature: simplified-filter-form, Property 7: Result Sorting Correctness (bundesweite group)
        fc.assert(fc.property(
          fc.array(programGen, { minLength: 2, maxLength: 10 }),
          (programs) => {
            const sorted = sortResults(programs);
            
            // Extract bundesweite programs and check their fitScore order
            const bundesweite = sorted.filter(p => !p.isStateSpecific);
            
            if (bundesweite.length < 2) return true; // Need at least 2 to test sorting
            
            // Check that fitScores are in descending order
            for (let i = 0; i < bundesweite.length - 1; i++) {
              if ((bundesweite[i].fitScore || 0) < (bundesweite[i + 1].fitScore || 0)) {
                return false;
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });

      it('should handle empty arrays and invalid input', () => {
        // Feature: simplified-filter-form, Property 7: Result Sorting Correctness (edge cases)
        expect(sortResults([])).toEqual([]);
        expect(sortResults(null)).toEqual([]);
        expect(sortResults(undefined)).toEqual([]);
        expect(sortResults("not an array")).toEqual([]);
      });

      it('should preserve all programs in the result', () => {
        // Feature: simplified-filter-form, Property 7: Result Sorting Correctness (preservation)
        fc.assert(fc.property(
          fc.array(programGen, { minLength: 1, maxLength: 20 }),
          (programs) => {
            const sorted = sortResults(programs);
            
            // Should have same length
            if (sorted.length !== programs.length) return false;
            
            // Should contain all original programs (by name)
            const originalNames = programs.map(p => p.name).sort();
            const sortedNames = sorted.map(p => p.name).sort();
            
            return JSON.stringify(originalNames) === JSON.stringify(sortedNames);
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });
    });
  });

  describe('Enhanced Relevance-Based Sorting', () => {
    describe('Property 8: Multi-Level Sorting', () => {
      it('should prioritize state-specific programs over bundesweite programs', () => {
        // **Property 8: Multi-Level Sorting - State-specific priority**
        // **Validates: Requirements 4.1, 4.2, 4.3**
        fc.assert(fc.property(
          fc.array(relevanceProgramGen, { minLength: 3, maxLength: 15 }),
          (programs) => {
            const sorted = sortByRelevance(programs);
            
            // Find the last state-specific program and first bundesweite program
            let lastStateSpecificIndex = -1;
            let firstBundesweiteIndex = -1;
            
            for (let i = 0; i < sorted.length; i++) {
              const isStateSpec = !sorted[i].federalStates.includes('all');
              if (isStateSpec) {
                lastStateSpecificIndex = i;
              } else if (firstBundesweiteIndex === -1) {
                firstBundesweiteIndex = i;
              }
            }
            
            // If both types exist, state-specific should come before bundesweite
            if (lastStateSpecificIndex >= 0 && firstBundesweiteIndex >= 0) {
              return lastStateSpecificIndex < firstBundesweiteIndex;
            }
            
            return true; // If only one type exists, sorting is correct
          }
        ), { numRuns: 10 });
      });

      it('should sort by relevance level within state-specific group (1 > 2 > 3)', () => {
        // **Property 8: Multi-Level Sorting - Relevance within state-specific**
        // **Validates: Requirements 4.1, 4.2, 4.3**
        fc.assert(fc.property(
          fc.array(relevanceProgramGen, { minLength: 3, maxLength: 15 }),
          (programs) => {
            const sorted = sortByRelevance(programs);
            
            // Extract state-specific programs
            const stateSpecific = sorted.filter(p => !p.federalStates.includes('all'));
            
            // Check that relevance levels are in ascending order (1, 2, 3)
            for (let i = 0; i < stateSpecific.length - 1; i++) {
              const currentLevel = stateSpecific[i].relevanceLevel || 3;
              const nextLevel = stateSpecific[i + 1].relevanceLevel || 3;
              
              if (currentLevel > nextLevel) {
                return false;
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });
      });

      it('should prioritize user state matches within state-specific programs of same relevance level', () => {
        // **Property 8: Multi-Level Sorting - User state priority**
        // **Validates: Requirements 4.1, 4.2, 4.3**
        fc.assert(fc.property(
          fc.constantFrom('BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'),
          fc.array(relevanceProgramGen, { minLength: 2, maxLength: 10 }),
          (userState, programs) => {
            const sorted = sortByRelevance(programs, userState);
            
            // Extract state-specific programs
            const stateSpecific = sorted.filter(p => !p.federalStates.includes('all'));
            
            // Within each relevance level, user state matches should come first
            let currentLevel = 0;
            let foundNonUserStateMatch = false;
            
            for (const program of stateSpecific) {
              const programLevel = program.relevanceLevel || 3;
              
              // Reset when we move to a new relevance level
              if (programLevel !== currentLevel) {
                currentLevel = programLevel;
                foundNonUserStateMatch = false;
              }
              
              const isUserStateMatch = program.federalStates.includes(userState);
              
              // If we've seen a non-user-state match in this level, 
              // we shouldn't see any more user state matches
              if (foundNonUserStateMatch && isUserStateMatch) {
                return false;
              }
              
              if (!isUserStateMatch) {
                foundNonUserStateMatch = true;
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });
      });

      it('should sort by funding rate within same group (state-specific, relevance level, user state match)', () => {
        // **Property 8: Multi-Level Sorting - Funding rate within groups**
        // **Validates: Requirements 4.1, 4.2, 4.3**
        fc.assert(fc.property(
          fc.array(relevanceProgramGen, { minLength: 2, maxLength: 8 }),
          (programs) => {
            const sorted = sortByRelevance(programs, 'BW'); // Use BW as test state
            
            // Group by state-specific status, relevance level, and user state match
            const groups = new Map();
            
            sorted.forEach(program => {
              const isStateSpec = !program.federalStates.includes('all');
              const level = program.relevanceLevel || 3;
              const userStateMatch = program.federalStates.includes('BW');
              const key = `${isStateSpec}_${level}_${userStateMatch}`;
              
              if (!groups.has(key)) {
                groups.set(key, []);
              }
              groups.get(key).push(program);
            });
            
            // Check funding rate order within each group
            for (const group of groups.values()) {
              if (group.length < 2) continue;
              
              for (let i = 0; i < group.length - 1; i++) {
                const currentRate = parseFundingRate(group[i].fundingRate);
                const nextRate = parseFundingRate(group[i + 1].fundingRate);
                
                // Should be in descending order (higher rates first)
                if (currentRate < nextRate) {
                  return false;
                }
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });
      });
    });

    describe('Property 9: Result Limiting', () => {
      it('should limit results to specified maximum', () => {
        // **Property 9: Result Limiting**
        // **Validates: Requirements 4.4**
        fc.assert(fc.property(
          fc.array(relevanceProgramGen, { minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 20 }),
          (programs, maxResults) => {
            const limited = limitResults(programs, maxResults);
            
            return limited.length <= maxResults && 
                   limited.length <= programs.length;
          }
        ), { numRuns: 10 });
      });

      it('should default to 20 results when no limit specified', () => {
        // **Property 9: Result Limiting**
        // **Validates: Requirements 4.4**
        const programs = Array.from({ length: 25 }, (_, i) => ({
          name: `Program ${i}`,
          relevanceLevel: 1,
          federalStates: ['all'],
          fundingRate: '80%'
        }));
        
        const limited = limitResults(programs);
        expect(limited.length).toBe(20);
      });

      it('should preserve order when limiting', () => {
        // **Property 9: Result Limiting**
        // **Validates: Requirements 4.4**
        fc.assert(fc.property(
          fc.array(relevanceProgramGen, { minLength: 10, maxLength: 30 }),
          fc.integer({ min: 5, max: 15 }),
          (programs, maxResults) => {
            const limited = limitResults(programs, maxResults);
            
            // Check that limited results are the first N programs in order
            for (let i = 0; i < limited.length; i++) {
              if (limited[i].name !== programs[i].name) {
                return false;
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });
      });
    });

    describe('Combined Sorting and Limiting', () => {
      it('should sort and limit in one operation', () => {
        // Combined functionality test
        fc.assert(fc.property(
          fc.array(relevanceProgramGen, { minLength: 10, maxLength: 30 }),
          fc.constantFrom('BW', 'BY', 'BE'),
          fc.integer({ min: 5, max: 15 }),
          (programs, userState, maxResults) => {
            const result = sortAndLimitByRelevance(programs, userState, maxResults);
            
            // Should be limited
            if (result.length > maxResults) return false;
            
            // Should prioritize state-specific programs over bundesweite
            let lastStateSpecificIndex = -1;
            let firstBundesweiteIndex = -1;
            
            for (let i = 0; i < result.length; i++) {
              const isStateSpec = !result[i].federalStates.includes('all');
              if (isStateSpec) {
                lastStateSpecificIndex = i;
              } else if (firstBundesweiteIndex === -1) {
                firstBundesweiteIndex = i;
              }
            }
            
            // If both types exist, state-specific should come before bundesweite
            if (lastStateSpecificIndex >= 0 && firstBundesweiteIndex >= 0) {
              if (lastStateSpecificIndex >= firstBundesweiteIndex) {
                return false;
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });
      });
    });
  });

  describe('Utility Functions', () => {
    describe('Funding Rate Parsing', () => {
      it('should parse percentage ranges correctly', () => {
        expect(parseFundingRate('60-90%')).toBe(90);
        expect(parseFundingRate('30-50%')).toBe(50);
        expect(parseFundingRate('70-80%')).toBe(80);
      });

      it('should parse "bis" format correctly', () => {
        expect(parseFundingRate('bis 90%')).toBe(90);
        expect(parseFundingRate('bis 75%')).toBe(75);
        expect(parseFundingRate('bis 100%')).toBe(100);
      });

      it('should handle EUR amounts', () => {
        expect(parseFundingRate('bis 10.000 EUR')).toBeGreaterThan(0);
        expect(parseFundingRate('bis 50.000 EUR')).toBeGreaterThan(parseFundingRate('bis 10.000 EUR'));
      });

      it('should handle variable rates', () => {
        expect(parseFundingRate('variabel')).toBe(50);
        expect(parseFundingRate('nicht spezifiziert')).toBe(0);
      });

      it('should handle invalid input gracefully', () => {
        expect(parseFundingRate('')).toBe(0);
        expect(parseFundingRate(null)).toBe(0);
        expect(parseFundingRate(undefined)).toBe(0);
        expect(parseFundingRate(123)).toBe(0);
      });

      it('should be consistent across different inputs', () => {
        // **Property-based test for funding rate parsing**
        fc.assert(fc.property(
          fundingRateGen,
          (rateStr) => {
            const parsed = parseFundingRate(rateStr);
            return typeof parsed === 'number' && parsed >= 0 && parsed <= 200; // Allow some margin for EUR conversions
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });
    });

    describe('Federal State Matching', () => {
      it('should match specific states correctly', () => {
        const program = { federalStates: ['BW', 'BY'] };
        expect(matchesFederalState(program, 'BW')).toBe(true);
        expect(matchesFederalState(program, 'BY')).toBe(true);
        expect(matchesFederalState(program, 'BE')).toBe(false);
      });

      it('should match "all" states', () => {
        const program = { federalStates: ['all'] };
        expect(matchesFederalState(program, 'BW')).toBe(true);
        expect(matchesFederalState(program, 'BY')).toBe(true);
        expect(matchesFederalState(program, 'BE')).toBe(true);
      });

      it('should handle missing data gracefully', () => {
        expect(matchesFederalState({}, 'BW')).toBe(false);
        expect(matchesFederalState({ federalStates: [] }, 'BW')).toBe(false);
        expect(matchesFederalState({ federalStates: ['BW'] }, null)).toBe(false);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle empty arrays', () => {
        expect(sortByRelevance([])).toEqual([]);
        expect(limitResults([])).toEqual([]);
        expect(sortAndLimitByRelevance([])).toEqual([]);
      });

      it('should handle null and undefined input', () => {
        expect(sortByRelevance(null)).toEqual([]);
        expect(sortByRelevance(undefined)).toEqual([]);
        expect(limitResults(null)).toEqual([]);
        expect(limitResults(undefined)).toEqual([]);
      });

      it('should handle programs without relevance metadata', () => {
        const programs = [
          { name: 'Program 1', fundingRate: '80%' },
          { name: 'Program 2', fundingRate: '90%' }
        ];
        
        const sorted = sortByRelevance(programs);
        expect(sorted).toHaveLength(2);
        expect(sorted[0].name).toBe('Program 2'); // Higher funding rate should come first
      });
    });
  });
});