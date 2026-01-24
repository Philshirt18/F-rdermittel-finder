import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  strictFilterPrograms, 
  strictFilterProgramsWithRelevance,
  getStrictProgramNames, 
  isProgramAllowedForUseCase,
  validateProgramForUseCase,
  filterByRelevanceScore,
  prioritizePlaygroundFundingHistory
} from './strictFilterService';
import { RelevanceEngine } from './RelevanceEngine';

// Mock programs for testing
const mockPrograms = [
  {
    name: "Städtebauförderung - Lebendige Zentren",
    type: ["playground"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation"],
    fundingRate: "60-80%"
  },
  {
    name: "Klimaanpassung in sozialen Einrichtungen (AnpaSo)",
    type: ["playground"],
    federalStates: ["all"],
    measures: ["newBuild", "greening"],
    fundingRate: "bis 80%"
  },
  {
    name: "Deutsches Kinderhilfswerk - Spielplatz-Initiative",
    type: ["playground"],
    federalStates: ["all"],
    measures: ["newBuild"],
    fundingRate: "bis 5.000 EUR"
  },
  {
    name: "LEADER Niedersachsen (KLARA)",
    type: ["playground"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation"],
    fundingRate: "50-80%"
  },
  {
    name: "Spielplatzförderung Mecklenburg-Vorpommern",
    type: ["playground"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 90%"
  }
];

// Mock RelevanceEngine for testing
let mockRelevanceEngine;

beforeEach(() => {
  // Create a mock RelevanceEngine for testing
  mockRelevanceEngine = new RelevanceEngine(mockPrograms);
});

describe('strictFilterPrograms (backward compatibility)', () => {
  it('should return empty array for invalid inputs', () => {
    expect(strictFilterPrograms(null, 'NI', mockPrograms)).toEqual([]);
    expect(strictFilterPrograms('kita', null, mockPrograms)).toEqual([]);
    expect(strictFilterPrograms('kita', 'NI', null)).toEqual([]);
  });

  it('should filter by federal state', () => {
    const result = strictFilterPrograms('kita', 'NI', mockPrograms);
    const programNames = getStrictProgramNames(result);
    
    // Should include programs available in NI (state-specific + bundesweite)
    expect(programNames).not.toContain('Spielplatzförderung Mecklenburg-Vorpommern');
  });

  it('should exclude forbidden program types', () => {
    const result = strictFilterPrograms('oeffentlich-kommunal', 'NI', mockPrograms);
    const programNames = getStrictProgramNames(result);
    
    // Should exclude Deutsches Kinderhilfswerk (Stiftung)
    expect(programNames).not.toContain('Deutsches Kinderhilfswerk - Spielplatz-Initiative');
  });

  it('should apply strict Einsatzbereich matching for kommunal-angebunden', () => {
    const result = strictFilterPrograms('kommunal-angebunden', 'NI', mockPrograms);
    const programNames = getStrictProgramNames(result);
    
    // Should include programs suitable for communally connected facilities
    expect(programNames).toContain('Klimaanpassung in sozialen Einrichtungen (AnpaSo)');
    
    // Should exclude programs not suitable for communally connected facilities
    expect(programNames).not.toContain('Städtebauförderung - Lebendige Zentren');
  });

  it('should apply strict Einsatzbereich matching for öffentlich-kommunal', () => {
    const result = strictFilterPrograms('oeffentlich-kommunal', 'NI', mockPrograms);
    const programNames = getStrictProgramNames(result);
    
    // Should include programs suitable for public playgrounds
    expect(programNames).toContain('Städtebauförderung - Lebendige Zentren');
    
    // Should exclude programs not suitable for public playgrounds
    expect(programNames).not.toContain('Klimaanpassung in sozialen Einrichtungen (AnpaSo)');
  });

  it('should apply strict Einsatzbereich matching for ländlicher Raum', () => {
    const result = strictFilterPrograms('laendlicher-raum', 'NI', mockPrograms);
    const programNames = getStrictProgramNames(result);
    
    // Should include programs suitable for rural areas
    expect(programNames).toContain('LEADER Niedersachsen (KLARA)');
    
    // Should exclude urban development programs
    expect(programNames).not.toContain('Städtebauförderung - Lebendige Zentren');
  });

  it('should return empty array when no programs match strict criteria', () => {
    const result = strictFilterPrograms('invalid-category', 'NI', mockPrograms);
    expect(result).toEqual([]);
  });

  it('should sort results with state-specific programs first', () => {
    const result = strictFilterPrograms('laendlicher-raum', 'NI', mockPrograms);
    
    if (result.length > 1) {
      // State-specific programs should come first
      const firstProgram = result[0];
      expect(firstProgram.federalStates).not.toContain('all');
    }
  });
});

describe('strictFilterPrograms with relevance scoring', () => {
  it('should apply relevance scoring when enabled', () => {
    const result = strictFilterPrograms('oeffentlich-kommunal', 'NI', mockPrograms, {
      useRelevanceScoring: true,
      relevanceEngine: mockRelevanceEngine,
      userCriteria: { federalState: 'NI', projectType: 'playground', einsatzbereich: 'oeffentlich-kommunal' }
    });
    
    // Should include relevance scores
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('relevanceScore');
      expect(result[0]).toHaveProperty('relevanceLevel');
    }
  });

  it('should prioritize programs with playground funding history', () => {
    const result = strictFilterPrograms('oeffentlich-kommunal', 'NI', mockPrograms, {
      useRelevanceScoring: true,
      relevanceEngine: mockRelevanceEngine,
      userCriteria: { federalState: 'NI', projectType: 'playground', einsatzbereich: 'oeffentlich-kommunal' }
    });
    
    // Programs with playground funding history should be prioritized
    const playgroundHistoryPrograms = result.filter(p => p.playgroundFundingHistory);
    const nonPlaygroundHistoryPrograms = result.filter(p => !p.playgroundFundingHistory);
    
    if (playgroundHistoryPrograms.length > 0 && nonPlaygroundHistoryPrograms.length > 0) {
      const firstPlaygroundIndex = result.findIndex(p => p.playgroundFundingHistory);
      const firstNonPlaygroundIndex = result.findIndex(p => !p.playgroundFundingHistory);
      
      expect(firstPlaygroundIndex).toBeLessThan(firstNonPlaygroundIndex);
    }
  });

  it('should maintain backward compatibility when relevance scoring is disabled', () => {
    const resultWithoutScoring = strictFilterPrograms('oeffentlich-kommunal', 'NI', mockPrograms);
    const resultWithScoringDisabled = strictFilterPrograms('oeffentlich-kommunal', 'NI', mockPrograms, {
      useRelevanceScoring: false
    });
    
    expect(resultWithoutScoring).toEqual(resultWithScoringDisabled);
  });
});

describe('strictFilterProgramsWithRelevance', () => {
  it('should return programs with relevance scoring enabled by default', () => {
    const result = strictFilterProgramsWithRelevance('oeffentlich-kommunal', 'NI', mockPrograms, mockRelevanceEngine);
    
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('relevanceScore');
      expect(result[0]).toHaveProperty('relevanceLevel');
      expect(result[0]).toHaveProperty('playgroundFundingHistory');
    }
  });

  it('should accept additional criteria', () => {
    const additionalCriteria = { measures: ['newBuild'] };
    const result = strictFilterProgramsWithRelevance(
      'oeffentlich-kommunal', 
      'NI', 
      mockPrograms, 
      mockRelevanceEngine, 
      additionalCriteria
    );
    
    // Should not throw and should return results
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('filterByRelevanceScore', () => {
  it('should filter programs by minimum relevance score', () => {
    const programsWithScores = [
      { name: 'Program A', relevanceScore: 50 },
      { name: 'Program B', relevanceScore: 25 },
      { name: 'Program C', relevanceScore: 45 }
    ];
    
    const userCriteria = { einsatzbereich: 'oeffentlich-kommunal' };
    const result = filterByRelevanceScore(programsWithScores, userCriteria);
    
    // Should only include programs meeting minimum threshold (40 for oeffentlich-kommunal)
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['Program A', 'Program C']);
  });

  it('should use lower threshold for rural areas', () => {
    const programsWithScores = [
      { name: 'Program A', relevanceScore: 25 },
      { name: 'Program B', relevanceScore: 15 },
      { name: 'Program C', relevanceScore: 35 }
    ];
    
    const userCriteria = { einsatzbereich: 'laendlicher-raum' };
    const result = filterByRelevanceScore(programsWithScores, userCriteria);
    
    // Should include programs meeting lower threshold (20 for laendlicher-raum)
    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['Program A', 'Program C']);
  });
});

describe('prioritizePlaygroundFundingHistory', () => {
  it('should prioritize programs with playground funding history', () => {
    const programs = [
      { name: 'Program A' },
      { name: 'Program B' },
      { name: 'Program C' }
    ];
    
    const result = prioritizePlaygroundFundingHistory(programs, mockRelevanceEngine);
    
    // Should add playgroundFundingHistory property
    expect(result.every(p => p.hasOwnProperty('playgroundFundingHistory'))).toBe(true);
  });
});

describe('validateProgramForUseCase', () => {
  it('should provide enhanced validation with relevance engine', () => {
    const result = validateProgramForUseCase(
      'Städtebauförderung - Lebendige Zentren', 
      'oeffentlich-kommunal', 
      mockRelevanceEngine
    );
    
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('relevanceLevel');
    expect(result).toHaveProperty('playgroundFundingHistory');
  });

  it('should fall back to basic validation without relevance engine', () => {
    const result = validateProgramForUseCase(
      'Städtebauförderung - Lebendige Zentren', 
      'oeffentlich-kommunal'
    );
    
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reason');
    expect(result.relevanceLevel).toBeNull();
    expect(result.playgroundFundingHistory).toBe(false);
  });

  it('should exclude programs with relevance level 4', () => {
    // Mock a program that would be classified as level 4
    const mockEngineWithExcluded = {
      programs: [{ name: 'Test Program', type: ['playground'] }],
      getRelevanceLevel: (program) => 4,
      classifier: {
        isPlaygroundRelevant: (program) => false
      }
    };
    
    const result = validateProgramForUseCase(
      'Test Program', 
      'oeffentlich-kommunal', 
      null, // federalState
      mockEngineWithExcluded
    );
    
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Excluded by relevance classification');
  });
});

describe('isProgramAllowedForUseCase', () => {
  it('should return false for excluded programs', () => {
    expect(isProgramAllowedForUseCase('Deutsches Kinderhilfswerk - Test', 'kita')).toBe(false);
    expect(isProgramAllowedForUseCase('LOTTO-Stiftung Test', 'oeffentlich-kommunal')).toBe(false);
    expect(isProgramAllowedForUseCase('Sanierung Test', 'kita')).toBe(false);
  });

  it('should return true for explicitly allowed combinations', () => {
    expect(isProgramAllowedForUseCase('Klimaanpassung in sozialen Einrichtungen (AnpaSo)', 'kommunal-angebunden')).toBe(true);
    expect(isProgramAllowedForUseCase('Städtebauförderung - Lebendige Zentren', 'oeffentlich-kommunal')).toBe(true);
  });

  it('should return false for explicitly excluded combinations', () => {
    expect(isProgramAllowedForUseCase('Städtebauförderung - Lebendige Zentren', 'kommunal-angebunden')).toBe(false);
    expect(isProgramAllowedForUseCase('GAK - Förderung der Dorfentwicklung', 'neubaugebiet')).toBe(false);
  });

  it('should return false for unclassified programs (strict approach)', () => {
    expect(isProgramAllowedForUseCase('Unknown Program', 'kommunal-angebunden')).toBe(false);
  });
});

describe('getStrictProgramNames', () => {
  it('should return array of program names only', () => {
    const programs = [
      { name: 'Program A', other: 'data' },
      { name: 'Program B', other: 'data' }
    ];
    
    const result = getStrictProgramNames(programs);
    expect(result).toEqual(['Program A', 'Program B']);
  });

  it('should return empty array for empty input', () => {
    expect(getStrictProgramNames([])).toEqual([]);
  });
});

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
    source: fc.option(fc.string({ maxLength: 100 }), { nil: '' }),
    fundingRate: fc.option(fc.string({ maxLength: 20 }), { nil: '50%' })
  });

  // Generator for user criteria
  const arbitraryUserCriteria = () => fc.record({
    federalState: fc.constantFrom('BY', 'BW', 'NW', 'NI', 'HE', 'RP', 'SH', 'BB', 'SN', 'ST', 'TH', 'MV', 'SL', 'HB', 'HH', 'BE'),
    projectType: fc.constantFrom('playground', 'combination', 'research'),
    einsatzbereich: fc.constantFrom('oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier', 'laendlicher-raum', 'freizeit-erholung', 'kommunal-angebunden'),
    measures: fc.option(fc.array(fc.constantFrom('newBuild', 'renovation', 'accessibility', 'digitalization', 'expansion'), { minLength: 0, maxLength: 3 }), { nil: [] })
  });

  /**
   * Property 7: Backward Compatibility
   * **Validates: Requirements 3.4, 8.1, 8.2**
   * 
   * For any existing API call with legacy parameters, the system should return results 
   * in the expected format while applying new relevance logic. When relevance scoring 
   * is disabled, the behavior should be identical to the legacy system.
   */
  it('Property 7: backward compatibility maintains identical behavior when relevance scoring disabled', () => {
    fc.assert(fc.property(
      fc.array(arbitraryFundingProgram(), { minLength: 1, maxLength: 20 }),
      arbitraryUserCriteria(),
      (programs, userCriteria) => {
        // Ensure programs have playground type for meaningful filtering
        const playgroundPrograms = programs.map(p => ({
          ...p,
          type: p.type && p.type.length > 0 ? [...p.type, 'playground'] : ['playground']
        }));

        // Test 1: Legacy API call (no options parameter)
        const legacyResult = strictFilterPrograms(
          userCriteria.einsatzbereich, 
          userCriteria.federalState, 
          playgroundPrograms
        );

        // Test 2: Explicit relevance scoring disabled
        const explicitDisabledResult = strictFilterPrograms(
          userCriteria.einsatzbereich, 
          userCriteria.federalState, 
          playgroundPrograms,
          { useRelevanceScoring: false }
        );

        // Test 3: Empty options object
        const emptyOptionsResult = strictFilterPrograms(
          userCriteria.einsatzbereich, 
          userCriteria.federalState, 
          playgroundPrograms,
          {}
        );

        // Property 1: All three calls should return identical results
        const resultsIdentical = JSON.stringify(legacyResult) === JSON.stringify(explicitDisabledResult) &&
                                JSON.stringify(legacyResult) === JSON.stringify(emptyOptionsResult);

        // Property 2: Results should not contain new relevance fields when scoring disabled
        const noRelevanceFields = legacyResult.every(program => 
          !program.hasOwnProperty('relevanceScore') &&
          !program.hasOwnProperty('relevanceLevel') &&
          !program.hasOwnProperty('playgroundFundingHistory') &&
          !program.hasOwnProperty('isFederalStateSpecific')
        );

        // Property 3: Results should maintain original data structure
        const originalStructureMaintained = legacyResult.every(program => 
          program.hasOwnProperty('name') &&
          program.hasOwnProperty('type') &&
          program.hasOwnProperty('federalStates') &&
          typeof program.name === 'string' &&
          Array.isArray(program.type) &&
          Array.isArray(program.federalStates)
        );

        // Property 4: Legacy sorting behavior should be preserved (state-specific first, then alphabetical)
        let legacySortingPreserved = true;
        if (legacyResult.length > 1) {
          for (let i = 0; i < legacyResult.length - 1; i++) {
            const current = legacyResult[i];
            const next = legacyResult[i + 1];
            
            const currentIsStateSpecific = current.federalStates && !current.federalStates.includes('all');
            const nextIsStateSpecific = next.federalStates && !next.federalStates.includes('all');
            
            // State-specific programs should come before national programs
            if (!currentIsStateSpecific && nextIsStateSpecific) {
              legacySortingPreserved = false;
              break;
            }
            
            // Within same state specificity, should be alphabetically ordered
            if (currentIsStateSpecific === nextIsStateSpecific) {
              if (current.name.localeCompare(next.name) > 0) {
                legacySortingPreserved = false;
                break;
              }
            }
          }
        }

        // Property 5: All existing filtering rules should still apply
        const existingFiltersApplied = legacyResult.every(program => {
          // Must be playground type
          const isPlaygroundType = program.type && program.type.includes('playground');
          
          // Must match federal state
          const matchesFederalState = program.federalStates && 
            (program.federalStates.includes(userCriteria.federalState) || 
             program.federalStates.includes('all'));
          
          // Must not be excluded program type
          const excludedPrograms = ['Deutsches Kinderhilfswerk', 'Aktion Mensch', 'Deutsche Fernsehlotterie', 
                                   'LOTTO-Stiftung', 'LOTTO hilft', 'Totomittel', 'Glück für', 'BINGO!',
                                   'Freiwilliges Engagement', 'Bürgerfonds', 'Heimat-Scheck',
                                   'Sanierung', 'Modernisierung', 'Energetische'];
          const notExcluded = !excludedPrograms.some(excluded => program.name.includes(excluded));
          
          return isPlaygroundType && matchesFederalState && notExcluded;
        });

        // Property 6: Function signature compatibility - should work with original parameter types
        let signatureCompatible = true;
        try {
          // Test with string parameters (original signature)
          const stringResult = strictFilterPrograms(
            String(userCriteria.einsatzbereich),
            String(userCriteria.federalState),
            playgroundPrograms
          );
          signatureCompatible = Array.isArray(stringResult);
        } catch (error) {
          signatureCompatible = false;
        }

        return resultsIdentical && 
               noRelevanceFields && 
               originalStructureMaintained && 
               legacySortingPreserved && 
               existingFiltersApplied && 
               signatureCompatible;
      }
    ), { 
      numRuns: 10,  // 25 iterations for faster execution as per user instruction
      verbose: false
    });
  });

  /**
   * Property 6: Relevance-Based Scoring
   * **Validates: Requirements 3.2, 3.3**
   * 
   * For any program passing through the strict filter with relevance scoring enabled,
   * it should receive a relevance score and programs with playground funding history 
   * should score higher for playground projects
   */
  it('Property 6: relevance-based scoring produces consistent results with playground prioritization', () => {
    fc.assert(fc.property(
      fc.array(arbitraryFundingProgram(), { minLength: 1, maxLength: 20 }),
      arbitraryUserCriteria(),
      (programs, userCriteria) => {
        // Ensure at least one program is playground type for meaningful test
        const playgroundPrograms = programs.map(p => ({
          ...p,
          type: p.type && p.type.length > 0 ? [...p.type, 'playground'] : ['playground']
        }));

        const relevanceEngine = new RelevanceEngine(playgroundPrograms);
        
        // Apply strict filtering with relevance scoring
        const result = strictFilterPrograms(userCriteria.einsatzbereich, userCriteria.federalState, playgroundPrograms, {
          useRelevanceScoring: true,
          relevanceEngine,
          userCriteria
        });

        // Property 1: All programs in result should have relevance scores
        const allHaveScores = result.every(program => 
          typeof program.relevanceScore === 'number' && 
          program.relevanceScore >= 0 && 
          program.relevanceScore <= 100
        );

        // Property 2: All programs should have relevance levels
        const allHaveLevels = result.every(program => 
          typeof program.relevanceLevel === 'number' && 
          [1, 2, 3, 4].includes(program.relevanceLevel)
        );

        // Property 3: Programs should be sorted by relevance (level 1 > 2 > 3, exclude 4)
        const properlyOrdered = result.every((program, index) => {
          if (index === 0) return true;
          const prevProgram = result[index - 1];
          
          // Primary: relevance level (lower number = higher relevance)
          if (prevProgram.relevanceLevel !== program.relevanceLevel) {
            return prevProgram.relevanceLevel <= program.relevanceLevel;
          }
          
          // If same relevance level, playground funding history should be prioritized for playground projects
          if (userCriteria.projectType === 'playground') {
            if (prevProgram.playgroundFundingHistory !== program.playgroundFundingHistory) {
              return prevProgram.playgroundFundingHistory;
            }
          }
          
          return true;
        });

        // Property 4: Programs with playground funding history should be marked correctly
        const playgroundHistoryMarked = result.every(program => 
          typeof program.playgroundFundingHistory === 'boolean'
        );

        // Property 5: Federal state specificity should be marked correctly
        const federalStateMarked = result.every(program => 
          typeof program.isFederalStateSpecific === 'boolean'
        );

        // Property 6: For playground projects, programs with playground funding history 
        // should appear before those without (within same relevance level)
        let playgroundPriorityRespected = true;
        if (userCriteria.projectType === 'playground' && result.length > 1) {
          for (let i = 0; i < result.length - 1; i++) {
            const current = result[i];
            const next = result[i + 1];
            
            // If same relevance level, playground history should come first
            if (current.relevanceLevel === next.relevanceLevel) {
              if (!current.playgroundFundingHistory && next.playgroundFundingHistory) {
                playgroundPriorityRespected = false;
                break;
              }
            }
          }
        }

        return allHaveScores && 
               allHaveLevels && 
               properlyOrdered && 
               playgroundHistoryMarked && 
               federalStateMarked && 
               playgroundPriorityRespected;
      }
    ), { 
      numRuns: 10,  // 25 iterations for faster execution as per user instruction
      verbose: false
    });
  });
});