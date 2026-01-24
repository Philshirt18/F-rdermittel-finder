/**
 * Unit Tests for RelevanceClassifier
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { RelevanceClassifier } from './RelevanceClassifier.js';

describe('RelevanceClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new RelevanceClassifier();
  });

  describe('Constants', () => {
    test('should have correct relevance levels', () => {
      expect(RelevanceClassifier.RELEVANCE_LEVELS.CORE).toBe(1);
      expect(RelevanceClassifier.RELEVANCE_LEVELS.SUPPLEMENTARY).toBe(2);
      expect(RelevanceClassifier.RELEVANCE_LEVELS.NATIONAL).toBe(3);
      expect(RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED).toBe(4);
    });

    test('should have playground keywords', () => {
      expect(RelevanceClassifier.PLAYGROUND_KEYWORDS).toContain('spielplatz');
      expect(RelevanceClassifier.PLAYGROUND_KEYWORDS).toContain('playground');
    });

    test('should have exclusion keywords', () => {
      expect(RelevanceClassifier.EXCLUSION_KEYWORDS).toContain('hochschule');
      expect(RelevanceClassifier.EXCLUSION_KEYWORDS).toContain('digitalisierung');
    });
  });

  describe('classifyProgram', () => {
    test('should classify federal state specific program as Core (Level 1)', () => {
      const program = {
        name: 'Bayern Spielplatzförderung',
        type: ['playground'],
        federalStates: ['BY'],
        measures: ['newBuild'],
        description: 'Landesförderprogramm für Spielplätze'
      };

      const level = classifier.classifyProgram(program);
      expect(level).toBe(RelevanceClassifier.RELEVANCE_LEVELS.CORE);
    });

    test('should classify EU/Federal implementation as Supplementary (Level 2)', () => {
      const program = {
        name: 'EFRE Spielplatzförderung',
        type: ['playground'],
        federalStates: ['all'],
        measures: ['newBuild'],
        description: 'EFRE Förderung für Spielplätze'
      };

      const level = classifier.classifyProgram(program);
      expect(level).toBe(RelevanceClassifier.RELEVANCE_LEVELS.SUPPLEMENTARY);
    });

    test('should classify national program as National (Level 3)', () => {
      const program = {
        name: 'Bundesweite Spielplatzförderung',
        type: ['playground'],
        federalStates: ['all'],
        measures: ['newBuild'],
        description: 'Nationale Förderung für Spielplätze'
      };

      const level = classifier.classifyProgram(program);
      expect(level).toBe(RelevanceClassifier.RELEVANCE_LEVELS.NATIONAL);
    });

    test('should classify irrelevant program as Excluded (Level 4)', () => {
      const program = {
        name: 'Hochschul-Digitalisierung',
        type: ['research'],
        federalStates: ['all'],
        measures: ['digitalization'],
        description: 'Digitalisierung an Hochschulen und Universitäten'
      };

      const level = classifier.classifyProgram(program);
      expect(level).toBe(RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED);
    });

    test('should return EXCLUDED for null or undefined program', () => {
      expect(classifier.classifyProgram(null)).toBe(RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED);
      expect(classifier.classifyProgram(undefined)).toBe(RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED);
      expect(classifier.classifyProgram({})).toBe(RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED);
    });
  });

  describe('isPlaygroundRelevant', () => {
    test('should return true for programs with playground keywords', () => {
      const program = {
        name: 'Spielplatz Modernisierung',
        description: 'Förderung für Kinderspielplätze'
      };

      expect(classifier.isPlaygroundRelevant(program)).toBe(true);
    });

    test('should return true for programs with playground type', () => {
      const program = {
        name: 'General Förderung',
        type: ['playground'],
        description: 'Allgemeine Förderung'
      };

      expect(classifier.isPlaygroundRelevant(program)).toBe(true);
    });

    test('should return true for programs with playground measures', () => {
      const program = {
        name: 'Infrastruktur Förderung',
        measures: ['newBuild', 'renovation'],
        description: 'Infrastruktur Förderung'
      };

      expect(classifier.isPlaygroundRelevant(program)).toBe(true);
    });

    test('should return false for irrelevant programs', () => {
      const program = {
        name: 'Hochschul Förderung',
        type: ['research'],
        measures: ['digitalization'],
        description: 'Förderung für Universitäten'
      };

      expect(classifier.isPlaygroundRelevant(program)).toBe(false);
    });

    test('should return false for null program', () => {
      expect(classifier.isPlaygroundRelevant(null)).toBe(false);
    });
  });

  describe('isFederalStateSpecific', () => {
    test('should return true for programs with specific federal states', () => {
      const program = {
        name: 'Bayern Förderung',
        federalStates: ['BY', 'BW']
      };

      expect(classifier.isFederalStateSpecific(program)).toBe(true);
    });

    test('should return false for programs with "all" federal states', () => {
      const program = {
        name: 'Bundesweite Förderung',
        federalStates: ['all']
      };

      expect(classifier.isFederalStateSpecific(program)).toBe(false);
    });

    test('should return true for programs with state indicators in text', () => {
      const program = {
        name: 'Landesförderprogramm Bayern',
        federalStates: ['all'],
        description: 'Spezielles Landesprogramm'
      };

      expect(classifier.isFederalStateSpecific(program)).toBe(true);
    });

    test('should return false for null program', () => {
      expect(classifier.isFederalStateSpecific(null)).toBe(false);
    });
  });

  describe('shouldExcludeProgram', () => {
    test('should exclude programs with exclusion keywords and no playground relevance', () => {
      const program = {
        name: 'Hochschul Digitalisierung',
        type: ['research'],
        description: 'Digitalisierung an Universitäten'
      };

      expect(classifier.shouldExcludeProgram(program)).toBe(true);
    });

    test('should not exclude playground programs even with exclusion keywords', () => {
      const program = {
        name: 'Digitaler Spielplatz',
        type: ['playground'],
        description: 'Digitalisierung von Spielplätzen'
      };

      expect(classifier.shouldExcludeProgram(program)).toBe(false);
    });

    test('should exclude null program', () => {
      expect(classifier.shouldExcludeProgram(null)).toBe(true);
    });
  });

  describe('isEUFederalImplementation', () => {
    test('should return true for programs with EU/Federal indicators', () => {
      const program = {
        name: 'EFRE Förderung',
        federalStates: ['all'],
        description: 'Europäischer Fonds für regionale Entwicklung'
      };

      expect(classifier.isEUFederalImplementation(program)).toBe(true);
    });

    test('should return true for GAK programs', () => {
      const program = {
        name: 'GAK Dorfentwicklung',
        federalStates: ['all'],
        description: 'Gemeinschaftsaufgabe Agrarstruktur'
      };

      expect(classifier.isEUFederalImplementation(program)).toBe(true);
    });

    test('should return false for regular national programs', () => {
      const program = {
        name: 'Allgemeine Förderung',
        federalStates: ['all'],
        description: 'Allgemeine nationale Förderung'
      };

      expect(classifier.isEUFederalImplementation(program)).toBe(false);
    });

    test('should return false for null program', () => {
      expect(classifier.isEUFederalImplementation(null)).toBe(false);
    });
  });

  describe('getSearchableText', () => {
    test('should combine all program text fields', () => {
      const program = {
        name: 'Test Program',
        description: 'Test Description',
        source: 'Test Source',
        type: ['playground', 'combination'],
        measures: ['newBuild', 'renovation'],
        federalStates: ['BY', 'BW']
      };

      const searchText = classifier.getSearchableText(program);
      
      expect(searchText).toContain('test program');
      expect(searchText).toContain('test description');
      expect(searchText).toContain('playground combination');
      expect(searchText).toContain('newbuild renovation');
      expect(searchText).toContain('by bw');
    });

    test('should handle missing fields gracefully', () => {
      const program = {
        name: 'Test Program'
      };

      const searchText = classifier.getSearchableText(program);
      expect(searchText).toContain('test program');
      expect(typeof searchText).toBe('string');
    });
  });

  describe('Static Methods', () => {
    test('isValidRelevanceLevel should validate levels correctly', () => {
      expect(RelevanceClassifier.isValidRelevanceLevel(1)).toBe(true);
      expect(RelevanceClassifier.isValidRelevanceLevel(2)).toBe(true);
      expect(RelevanceClassifier.isValidRelevanceLevel(3)).toBe(true);
      expect(RelevanceClassifier.isValidRelevanceLevel(4)).toBe(true);
      expect(RelevanceClassifier.isValidRelevanceLevel(5)).toBe(false);
      expect(RelevanceClassifier.isValidRelevanceLevel(0)).toBe(false);
    });

    test('getRelevanceLevelName should return correct names', () => {
      expect(RelevanceClassifier.getRelevanceLevelName(1)).toBe('Core Programs');
      expect(RelevanceClassifier.getRelevanceLevelName(2)).toBe('Supplementary Programs');
      expect(RelevanceClassifier.getRelevanceLevelName(3)).toBe('National Programs');
      expect(RelevanceClassifier.getRelevanceLevelName(4)).toBe('Excluded Programs');
      expect(RelevanceClassifier.getRelevanceLevelName(99)).toBe('Unknown Level');
    });

    test('getAllRelevanceLevels should return complete level metadata', () => {
      const levels = RelevanceClassifier.getAllRelevanceLevels();
      
      expect(levels[1]).toHaveProperty('name', 'Core Programs');
      expect(levels[1]).toHaveProperty('priority', 'Highest');
      expect(levels[1]).toHaveProperty('color', 'green');
      
      expect(levels[2]).toHaveProperty('name', 'Supplementary Programs');
      expect(levels[2]).toHaveProperty('priority', 'Medium-High');
      expect(levels[2]).toHaveProperty('color', 'yellow');
      
      expect(levels[3]).toHaveProperty('name', 'National Programs');
      expect(levels[3]).toHaveProperty('priority', 'Medium');
      expect(levels[3]).toHaveProperty('color', 'green');
      
      expect(levels[4]).toHaveProperty('name', 'Excluded Programs');
      expect(levels[4]).toHaveProperty('priority', 'Excluded');
      expect(levels[4]).toHaveProperty('color', 'red');
    });
  });

  describe('Edge Cases', () => {
    test('should handle programs with empty arrays', () => {
      const program = {
        name: 'Empty Program',
        type: [],
        federalStates: [],
        measures: []
      };

      const level = classifier.classifyProgram(program);
      expect([1, 2, 3, 4]).toContain(level);
    });

    test('should handle programs with mixed case text', () => {
      const program = {
        name: 'SPIELPLATZ Förderung',
        description: 'PLAYGROUND development program'
      };

      expect(classifier.isPlaygroundRelevant(program)).toBe(true);
    });

    test('should handle programs with special characters', () => {
      const program = {
        name: 'Spiel-platz Förderung (2024)',
        description: 'Förderung für Kinder-Spielplätze & Outdoor-Fitness'
      };

      expect(classifier.isPlaygroundRelevant(program)).toBe(true);
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    describe('Property 2: Priority Mapping Consistency', () => {
      /**
       * **Validates: Requirements 1.2, 1.3, 1.4**
       * 
       * Property: For any funding program, its priority level should correspond correctly 
       * to its relevance level (Level 1 → highest, Level 2 → medium-high, Level 3 → medium)
       */
      test('priority mapping should be consistent with relevance levels', () => {
        // Generate arbitrary funding programs
        const arbitraryFundingProgram = fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.option(fc.string({ maxLength: 200 })),
          type: fc.option(fc.array(fc.constantFrom('playground', 'infrastructure', 'research', 'education'))),
          federalStates: fc.option(fc.oneof(
            fc.constant(['all']),
            fc.array(fc.constantFrom('BY', 'BW', 'NW', 'NI', 'HE', 'RP', 'SH', 'BB', 'SN', 'ST', 'TH', 'MV', 'SL', 'HB', 'HH', 'BE'), { minLength: 1, maxLength: 5 })
          )),
          measures: fc.option(fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'digitalization'))),
          source: fc.option(fc.string({ maxLength: 50 }))
        });

        fc.assert(fc.property(
          arbitraryFundingProgram,
          (program) => {
            const classifier = new RelevanceClassifier();
            const relevanceLevel = classifier.classifyProgram(program);
            const allLevels = RelevanceClassifier.getAllRelevanceLevels();
            
            // Verify the program gets a valid relevance level
            expect(RelevanceClassifier.isValidRelevanceLevel(relevanceLevel)).toBe(true);
            
            // Get the priority information for this level
            const levelInfo = allLevels[relevanceLevel];
            expect(levelInfo).toBeDefined();
            
            // Verify priority mapping consistency
            switch (relevanceLevel) {
              case RelevanceClassifier.RELEVANCE_LEVELS.CORE: // Level 1
                expect(levelInfo.priority).toBe('Highest');
                break;
              case RelevanceClassifier.RELEVANCE_LEVELS.SUPPLEMENTARY: // Level 2
                expect(levelInfo.priority).toBe('Medium-High');
                break;
              case RelevanceClassifier.RELEVANCE_LEVELS.NATIONAL: // Level 3
                expect(levelInfo.priority).toBe('Medium');
                break;
              case RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED: // Level 4
                expect(levelInfo.priority).toBe('Excluded');
                break;
              default:
                // Should never reach here with valid levels
                expect(false).toBe(true);
            }
            
            // Verify that Level 4 programs are marked as excluded (no priority)
            if (relevanceLevel === RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED) {
              expect(levelInfo.priority).toBe('Excluded');
            }
            
            return true;
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });

      test('priority hierarchy should be correctly ordered', () => {
        fc.assert(fc.property(
          fc.array(fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.option(fc.string({ maxLength: 200 })),
            type: fc.option(fc.array(fc.constantFrom('playground', 'infrastructure', 'research', 'education'))),
            federalStates: fc.option(fc.oneof(
              fc.constant(['all']),
              fc.array(fc.constantFrom('BY', 'BW', 'NW', 'NI', 'HE', 'RP', 'SH', 'BB', 'SN', 'ST', 'TH', 'MV', 'SL', 'HB', 'HH', 'BE'), { minLength: 1, maxLength: 5 })
            )),
            measures: fc.option(fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'digitalization'))),
            source: fc.option(fc.string({ maxLength: 50 }))
          }), { minLength: 1, maxLength: 20 }),
          (programs) => {
            const classifier = new RelevanceClassifier();
            const allLevels = RelevanceClassifier.getAllRelevanceLevels();
            
            // Classify all programs and collect their levels
            const classifiedPrograms = programs.map(program => ({
              program,
              level: classifier.classifyProgram(program),
              priority: allLevels[classifier.classifyProgram(program)].priority
            }));
            
            // Group by relevance level
            const level1Programs = classifiedPrograms.filter(p => p.level === 1);
            const level2Programs = classifiedPrograms.filter(p => p.level === 2);
            const level3Programs = classifiedPrograms.filter(p => p.level === 3);
            const level4Programs = classifiedPrograms.filter(p => p.level === 4);
            
            // Verify priority consistency within each level
            level1Programs.forEach(p => expect(p.priority).toBe('Highest'));
            level2Programs.forEach(p => expect(p.priority).toBe('Medium-High'));
            level3Programs.forEach(p => expect(p.priority).toBe('Medium'));
            level4Programs.forEach(p => expect(p.priority).toBe('Excluded'));
            
            // Verify that Level 1 has higher priority than Level 2, Level 2 higher than Level 3
            // (Level 4 is excluded, so it doesn't participate in priority ordering)
            const priorityOrder = ['Highest', 'Medium-High', 'Medium'];
            const nonExcludedPrograms = classifiedPrograms.filter(p => p.level !== 4);
            
            if (nonExcludedPrograms.length > 1) {
              // Sort by relevance level and verify priority order is maintained
              const sortedByLevel = nonExcludedPrograms.sort((a, b) => a.level - b.level);
              for (let i = 0; i < sortedByLevel.length - 1; i++) {
                const currentPriorityIndex = priorityOrder.indexOf(sortedByLevel[i].priority);
                const nextPriorityIndex = priorityOrder.indexOf(sortedByLevel[i + 1].priority);
                
                // Current priority should be higher (lower index) or equal to next priority
                expect(currentPriorityIndex).toBeLessThanOrEqual(nextPriorityIndex);
              }
            }
            
            return true;
          }
        ), { numRuns: 10 });  // Reduced for faster execution
      });
    });
  });
});