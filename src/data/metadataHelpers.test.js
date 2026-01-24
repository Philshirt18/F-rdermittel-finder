/**
 * Tests for metadata validation functions
 */

import { describe, test, expect } from 'vitest';
import {
  validateRelevanceLevel,
  validateBooleanField,
  validateProgramOrigin,
  validateImplementationLevel,
  validateSuccessRate,
  validateAllMetadataFields,
  sanitizeProgram,
  validateProgramBatch,
  createProgramWithDefaults,
  recoverFailedProgram,
  validateMetadataConsistency,
  MetadataValidationError
} from './metadataHelpers.js';

describe('Metadata Validation Functions', () => {
  describe('validateRelevanceLevel', () => {
    test('should validate correct relevance levels', () => {
      expect(validateRelevanceLevel(1)).toEqual({
        isValid: true,
        sanitizedValue: 1,
        error: null,
        fallbackApplied: false
      });

      expect(validateRelevanceLevel(4)).toEqual({
        isValid: true,
        sanitizedValue: 4,
        error: null,
        fallbackApplied: false
      });
    });

    test('should handle invalid relevance levels with fallbacks', () => {
      const result = validateRelevanceLevel(5);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedValue).toBe(4); // Clamped to max
      expect(result.fallbackApplied).toBe(true);

      const result2 = validateRelevanceLevel(0);
      expect(result2.sanitizedValue).toBe(1); // Clamped to min
    });

    test('should handle missing values with default fallback', () => {
      const result = validateRelevanceLevel(null);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedValue).toBe(3); // Default fallback
      expect(result.fallbackApplied).toBe(true);
    });
  });

  describe('validateBooleanField', () => {
    test('should validate boolean values', () => {
      expect(validateBooleanField(true, 'testField')).toEqual({
        isValid: true,
        sanitizedValue: true,
        error: null,
        fallbackApplied: false
      });
    });

    test('should convert string values to boolean', () => {
      expect(validateBooleanField('true', 'testField').sanitizedValue).toBe(true);
      expect(validateBooleanField('false', 'testField').sanitizedValue).toBe(false);
      expect(validateBooleanField('1', 'testField').sanitizedValue).toBe(true);
      expect(validateBooleanField('0', 'testField').sanitizedValue).toBe(false);
    });

    test('should handle invalid values with fallback', () => {
      const result = validateBooleanField('invalid', 'testField');
      expect(result.isValid).toBe(false);
      expect(result.sanitizedValue).toBe(false);
      expect(result.fallbackApplied).toBe(true);
    });
  });

  describe('validateProgramOrigin', () => {
    test('should validate correct program origins', () => {
      ['federal', 'state', 'eu', 'mixed'].forEach(origin => {
        const result = validateProgramOrigin(origin);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(origin);
      });
    });

    test('should handle case insensitive input', () => {
      const result = validateProgramOrigin('FEDERAL');
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('federal');
    });

    test('should handle invalid origins with fallback', () => {
      const result = validateProgramOrigin('invalid');
      expect(result.isValid).toBe(false);
      expect(result.sanitizedValue).toBe('federal');
      expect(result.fallbackApplied).toBe(true);
    });
  });

  describe('validateSuccessRate', () => {
    test('should validate correct success rates', () => {
      expect(validateSuccessRate(50).isValid).toBe(true);
      expect(validateSuccessRate(0).isValid).toBe(true);
      expect(validateSuccessRate(100).isValid).toBe(true);
    });

    test('should handle out of range values with clamping', () => {
      const result1 = validateSuccessRate(-10);
      expect(result1.isValid).toBe(false);
      expect(result1.sanitizedValue).toBe(0);

      const result2 = validateSuccessRate(150);
      expect(result2.isValid).toBe(false);
      expect(result2.sanitizedValue).toBe(100);
    });
  });

  describe('validateAllMetadataFields', () => {
    test('should validate complete valid program', () => {
      const program = {
        id: 'test-program',
        relevanceLevel: 2,
        isFederalStateSpecific: true,
        playgroundFundingHistory: false,
        programOrigin: 'state',
        implementationLevel: 'state',
        successRate: 75
      };

      const result = validateAllMetadataFields(program);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.hasFallbacks).toBe(false);
    });

    test('should handle program with missing fields using fallbacks', () => {
      const program = {
        id: 'incomplete-program',
        relevanceLevel: 2
        // Missing other required fields
      };

      const result = validateAllMetadataFields(program);
      expect(result.isValid).toBe(false); // Has validation errors
      expect(result.hasFallbacks).toBe(true);
      expect(result.sanitizedProgram).toBeDefined();
      expect(result.sanitizedProgram.isFederalStateSpecific).toBe(false); // Default fallback
    });

    test('should handle completely invalid program', () => {
      const result = validateAllMetadataFields(null);
      expect(result.isValid).toBe(false);
      expect(result.sanitizedProgram).toBe(null);
    });
  });

  describe('sanitizeProgram', () => {
    test('should sanitize program with missing metadata', () => {
      const program = {
        id: 'test-program',
        name: 'Test Program',
        federalStates: ['Bayern']
      };

      const result = sanitizeProgram(program);
      expect(result.applied).toBe(true);
      expect(result.sanitizedProgram).toBeDefined();
      expect(result.sanitizedProgram.relevanceLevel).toBeDefined();
    });

    test('should preserve original program when requested', () => {
      const program = { id: 'test', name: 'Test' };
      const result = sanitizeProgram(program, { preserveOriginal: true });
      expect(result.originalProgram).toEqual(program);
    });
  });

  describe('validateProgramBatch', () => {
    test('should validate array of programs', () => {
      const programs = [
        {
          id: 'program1',
          relevanceLevel: 1,
          isFederalStateSpecific: true,
          playgroundFundingHistory: false,
          programOrigin: 'state',
          implementationLevel: 'state',
          successRate: 80
        },
        {
          id: 'program2',
          name: 'Incomplete Program'
          // Missing metadata - should be handled with fallbacks
        }
      ];

      const result = validateProgramBatch(programs);
      expect(result.totalProcessed).toBe(2);
      expect(result.validCount).toBeGreaterThan(0);
    });

    test('should handle invalid input gracefully', () => {
      const result = validateProgramBatch('not-an-array');
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Input must be an array of programs');
    });
  });

  describe('createProgramWithDefaults', () => {
    test('should create program with safe defaults', () => {
      const program = { id: 'test', name: 'Test Program' };
      const result = createProgramWithDefaults(program);
      
      expect(result.relevanceLevel).toBe(3);
      expect(result.isFederalStateSpecific).toBe(false);
      expect(result.programOrigin).toBe('federal');
      expect(result.successRate).toBe(50);
    });

    test('should throw error for invalid program', () => {
      expect(() => createProgramWithDefaults(null)).toThrow(MetadataValidationError);
    });
  });

  describe('validateMetadataConsistency', () => {
    test('should detect inconsistencies', () => {
      const program = {
        relevanceLevel: 1, // Core program
        isFederalStateSpecific: false, // But not federal state specific - inconsistent
        programOrigin: 'state',
        implementationLevel: 'national' // State program with national implementation - inconsistent
      };

      const result = validateMetadataConsistency(program);
      expect(result.isConsistent).toBe(false);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
    });

    test('should validate consistent metadata', () => {
      const program = {
        relevanceLevel: 1,
        isFederalStateSpecific: true,
        programOrigin: 'state',
        implementationLevel: 'state',
        successRate: 75,
        playgroundFundingHistory: true
      };

      const result = validateMetadataConsistency(program);
      expect(result.isConsistent).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should create MetadataValidationError correctly', () => {
      const error = new MetadataValidationError('test-id', 'testField', 'invalidValue', 'Test reason');
      expect(error.name).toBe('MetadataValidationError');
      expect(error.programId).toBe('test-id');
      expect(error.field).toBe('testField');
      expect(error.reason).toBe('Test reason');
    });

    test('should handle recovery for failed programs', () => {
      const failedProgram = { id: 'failed', name: 'Failed Program' };
      const errors = [new MetadataValidationError('failed', 'test', null, 'Test error')];
      
      const result = recoverFailedProgram(failedProgram, errors);
      expect(result.success).toBe(true);
      expect(result.recoveredProgram).toBeDefined();
      expect(result.recoveredProgram.relevanceLevel).toBeDefined();
    });
  });
});