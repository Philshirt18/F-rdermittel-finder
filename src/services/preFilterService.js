/**
 * Pre-Filter Service for Funding Programs
 * 
 * This service provides deterministic filtering of funding programs
 * BEFORE AI analysis to ensure only truly matching programs are shown.
 * 
 * Enhanced with relevance-based exclusion to filter out Level 4 (irrelevant) programs.
 */

import { RelevanceEngine } from './RelevanceEngine.js';

/**
 * Filter programs by federal state
 * @param {Array} programs - Array of funding programs
 * @param {string} selectedState - Selected federal state (e.g., "BY", "NW")
 * @returns {Array} Filtered programs that match the state
 */
export const filterByState = (programs, selectedState) => {
  if (!selectedState || !Array.isArray(programs)) {
    return [];
  }

  return programs.filter(program => {
    // Program must include the selected state OR "all" in its federalStates array
    return program.federalStates && 
           (program.federalStates.includes(selectedState) || 
            program.federalStates.includes('all'));
  });
};
/**
 * Filter programs by project type
 * @param {Array} programs - Array of funding programs
 * @param {string} selectedType - Selected project type ("playground" or "calisthenics")
 * @returns {Array} Filtered programs that match the type
 */
export const filterByType = (programs, selectedType) => {
  if (!selectedType || !Array.isArray(programs)) {
    return [];
  }

  return programs.filter(program => {
    // Program's type array must include the selected type
    return program.type && program.type.includes(selectedType);
  });
};
/**
 * Filter programs by measures
 * @param {Array} programs - Array of funding programs
 * @param {Array} selectedMeasures - Selected measures (e.g., ["newBuild", "accessibility"])
 * @returns {Array} Filtered programs that support ALL selected measures
 */
export const filterByMeasures = (programs, selectedMeasures) => {
  if (!Array.isArray(programs)) {
    return [];
  }

  // If no measures selected, return all programs (no filtering)
  if (!selectedMeasures || selectedMeasures.length === 0) {
    return programs;
  }

  return programs.filter(program => {
    // Program's measures array must include ALL selected measures
    if (!program.measures || !Array.isArray(program.measures)) {
      return false;
    }

    return selectedMeasures.every(measure => program.measures.includes(measure));
  });
};
/**
 * Filter programs by relevance level, excluding Level 4 (irrelevant) programs
 * @param {Array} programs - Array of funding programs
 * @param {RelevanceEngine} relevanceEngine - Optional RelevanceEngine instance
 * @returns {Array} Filtered programs excluding Level 4 programs
 */
export const filterByRelevance = (programs, relevanceEngine = null) => {
  if (!Array.isArray(programs)) {
    return [];
  }

  // If no RelevanceEngine provided, return all programs (backward compatibility)
  if (!relevanceEngine) {
    return programs;
  }

  return programs.filter(program => {
    const relevanceLevel = relevanceEngine.getRelevanceLevel(program);
    // Exclude Level 4 (Excluded) programs
    return relevanceLevel !== 4;
  });
};

/**
 * Main pre-filter function that chains all filters
 * @param {Object} input - Filter input
 * @param {string} input.federalState - Selected federal state
 * @param {string} input.projectType - Selected project type
 * @param {Array} input.measures - Selected measures
 * @param {Array} allPrograms - All available funding programs
 * @param {RelevanceEngine} relevanceEngine - Optional RelevanceEngine instance for relevance-based filtering
 * @returns {Object} Filter result with programs and counts
 */
export const preFilterPrograms = (input, allPrograms, relevanceEngine = null) => {
  const { federalState, projectType, measures } = input;

  if (!Array.isArray(allPrograms)) {
    return {
      programs: [],
      stateSpecificCount: 0,
      bundesweiteCount: 0
    };
  }

  // Chain filters: relevance → state → type → measures
  let filteredPrograms = filterByRelevance(allPrograms, relevanceEngine);
  filteredPrograms = filterByState(filteredPrograms, federalState);
  filteredPrograms = filterByType(filteredPrograms, projectType);
  filteredPrograms = filterByMeasures(filteredPrograms, measures);

  // Add isStateSpecific flag to each program
  const programsWithFlags = filteredPrograms.map(program => ({
    ...program,
    isStateSpecific: program.federalStates && 
                     program.federalStates.includes(federalState) && 
                     !program.federalStates.includes('all')
  }));

  // Count state-specific vs bundesweite programs
  const stateSpecificCount = programsWithFlags.filter(p => p.isStateSpecific).length;
  const bundesweiteCount = programsWithFlags.filter(p => !p.isStateSpecific).length;

  return {
    programs: programsWithFlags,
    stateSpecificCount,
    bundesweiteCount
  };
};