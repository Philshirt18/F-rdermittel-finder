/**
 * Integration Tests for Gemini Service
 * Feature: simplified-filter-form
 */

import { describe, it, expect } from 'vitest';
import { preFilterPrograms } from './preFilterService.js';

describe('Gemini Service Integration Tests', () => {
  
  describe('Property 6: AI Receives All Pre-Filtered Programs', () => {
    it('should ensure pre-filter returns programs that would be sent to AI', () => {
      // Feature: simplified-filter-form, Property 6: AI Receives All Pre-Filtered Programs
      
      // Test the pre-filter logic that determines what gets sent to AI
      const mockPrograms = [
        {
          name: 'Program 1',
          federalStates: ['BY'],
          type: ['playground'],
          measures: ['newBuild'],
          source: 'https://example.com/1',
          fundingRate: '50%',
          description: 'Test program 1'
        },
        {
          name: 'Program 2', 
          federalStates: ['all'],
          type: ['playground'],
          measures: ['newBuild', 'accessibility'],
          source: 'https://example.com/2',
          fundingRate: '60%',
          description: 'Test program 2'
        },
        {
          name: 'Program 3',
          federalStates: ['NW'], // Different state
          type: ['playground'],
          measures: ['newBuild'],
          source: 'https://example.com/3',
          fundingRate: '70%',
          description: 'Test program 3'
        }
      ];
      
      const input = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      const result = preFilterPrograms(input, mockPrograms);
      
      // Should return 2 programs (BY-specific + "all", but not NW)
      expect(result.programs).toHaveLength(2);
      expect(result.programs[0].name).toBe('Program 1');
      expect(result.programs[1].name).toBe('Program 2');
      
      // Verify counts
      expect(result.stateSpecificCount).toBe(1);
      expect(result.bundesweiteCount).toBe(1);
      
      // Verify isStateSpecific flag
      expect(result.programs[0].isStateSpecific).toBe(true);
      expect(result.programs[1].isStateSpecific).toBe(false);
    });

    it('should handle empty results correctly', () => {
      // Feature: simplified-filter-form, Property 6: AI Receives All Pre-Filtered Programs (edge case)
      
      const mockPrograms = [
        {
          name: 'Program 1',
          federalStates: ['NW'], // Different state
          type: ['calisthenics'], // Different type
          measures: ['renovation'], // Different measure
          source: 'https://example.com/1',
          fundingRate: '50%',
          description: 'Test program 1'
        }
      ];
      
      const input = {
        federalState: 'BY',
        projectType: 'playground',
        measures: ['newBuild']
      };
      
      const result = preFilterPrograms(input, mockPrograms);
      
      // Should return 0 programs
      expect(result.programs).toHaveLength(0);
      expect(result.stateSpecificCount).toBe(0);
      expect(result.bundesweiteCount).toBe(0);
    });
  });
});