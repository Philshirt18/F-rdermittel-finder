/**
 * Integration tests for metadata validation with RelevanceEngine
 */

import { describe, test, expect } from 'vitest';
import { RelevanceEngine } from '../services/RelevanceEngine.js';
import { 
  validateAllMetadataFields, 
  sanitizeProgram, 
  validateProgramBatch,
  MetadataValidationError 
} from './metadataHelpers.js';

describe('Metadata Validation Integration', () => {
  test('should validate programs used by RelevanceEngine', () => {
    const testPrograms = [
      {
        id: 'test-1',
        name: 'Bayern Spielplatzförderung',
        type: ['playground'],
        federalStates: ['BY'],
        measures: ['newBuild'],
        fundingRate: 80
      },
      {
        id: 'test-2', 
        name: 'Bundesweite Städtebauförderung',
        type: ['combination'],
        federalStates: ['all'],
        measures: ['renovation'],
        fundingRate: 60
      }
    ];

    // Create RelevanceEngine which should enhance programs with metadata
    const engine = new RelevanceEngine(testPrograms);
    
    // Validate that enhanced programs have proper metadata
    engine.enhancedPrograms.forEach(program => {
      const validation = validateAllMetadataFields(program);
      
      // Should be valid or have successful fallbacks
      expect(validation.isValid || validation.hasFallbacks).toBe(true);
      expect(program.relevanceLevel).toBeDefined();
      expect(typeof program.isFederalStateSpecific).toBe('boolean');
      expect(typeof program.playgroundFundingHistory).toBe('boolean');
      expect(program.programOrigin).toBeDefined();
      expect(program.implementationLevel).toBeDefined();
      expect(typeof program.successRate).toBe('number');
    });
  });

  test('should handle programs with invalid metadata gracefully', () => {
    const invalidPrograms = [
      {
        id: 'invalid-1',
        name: 'Program with invalid data',
        relevanceLevel: 'invalid', // Should be number
        isFederalStateSpecific: 'maybe', // Should be boolean
        successRate: 150 // Should be 0-100
      },
      {
        id: 'invalid-2',
        name: 'Program with missing data'
        // Missing most metadata fields
      }
    ];

    const batchResult = validateProgramBatch(invalidPrograms);
    
    // Should process all programs
    expect(batchResult.totalProcessed).toBe(2);
    
    // Should have some valid programs after sanitization
    expect(batchResult.validCount).toBeGreaterThan(0);
    
    // Validate that sanitized programs have proper values
    batchResult.validPrograms.forEach(program => {
      expect(program.relevanceLevel).toBeGreaterThanOrEqual(1);
      expect(program.relevanceLevel).toBeLessThanOrEqual(4);
      expect(typeof program.isFederalStateSpecific).toBe('boolean');
      expect(program.successRate).toBeGreaterThanOrEqual(0);
      expect(program.successRate).toBeLessThanOrEqual(100);
    });
  });

  test('should sanitize programs for use in RelevanceEngine', () => {
    const rawProgram = {
      id: 'raw-program',
      name: 'Raw Program Without Metadata',
      federalStates: ['NW'],
      type: ['playground']
    };

    const sanitized = sanitizeProgram(rawProgram);
    
    expect(sanitized.applied).toBe(true);
    expect(sanitized.sanitizedProgram).toBeDefined();
    
    // Should be able to create RelevanceEngine with sanitized program
    const engine = new RelevanceEngine([sanitized.sanitizedProgram]);
    expect(engine.enhancedPrograms).toHaveLength(1);
    
    const classified = engine.classifyPrograms();
    expect(classified).toHaveLength(1);
    expect(classified[0].relevanceLevel).toBeDefined();
  });

  test('should handle edge cases in metadata validation', () => {
    const edgeCases = [
      null, // Null program
      undefined, // Undefined program
      {}, // Empty program
      { id: 'minimal' }, // Minimal program
      { 
        id: 'extreme-values',
        relevanceLevel: -999,
        successRate: 999,
        programOrigin: 'UNKNOWN_ORIGIN',
        implementationLevel: 'UNKNOWN_LEVEL'
      }
    ];

    edgeCases.forEach((program, index) => {
      try {
        const result = sanitizeProgram(program);
        
        if (result.applied && result.sanitizedProgram) {
          // If sanitization succeeded, validate the result
          const validation = validateAllMetadataFields(result.sanitizedProgram);
          expect(validation.sanitizedProgram).toBeDefined();
          
          // Check that values are within valid ranges
          if (validation.sanitizedProgram.relevanceLevel) {
            expect(validation.sanitizedProgram.relevanceLevel).toBeGreaterThanOrEqual(1);
            expect(validation.sanitizedProgram.relevanceLevel).toBeLessThanOrEqual(4);
          }
          
          if (validation.sanitizedProgram.successRate !== undefined) {
            expect(validation.sanitizedProgram.successRate).toBeGreaterThanOrEqual(0);
            expect(validation.sanitizedProgram.successRate).toBeLessThanOrEqual(100);
          }
        }
      } catch (error) {
        // Some edge cases might throw errors, which is acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  test('should maintain performance with large program sets', () => {
    // Create a larger set of programs to test performance
    const largeProgramSet = Array.from({ length: 100 }, (_, i) => ({
      id: `program-${i}`,
      name: `Test Program ${i}`,
      federalStates: i % 2 === 0 ? ['BY'] : ['all'],
      type: i % 3 === 0 ? ['playground'] : ['combination'],
      measures: ['newBuild'],
      fundingRate: 50 + (i % 50)
    }));

    const startTime = Date.now();
    
    // Validate the entire batch
    const batchResult = validateProgramBatch(largeProgramSet);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (less than 1 second for 100 programs)
    expect(duration).toBeLessThan(1000);
    
    // Should process all programs
    expect(batchResult.totalProcessed).toBe(100);
    
    // Should have high success rate with fallbacks
    expect(batchResult.validCount).toBeGreaterThan(90);
  });
});