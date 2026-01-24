/**
 * FederalStatePrioritizer - Handles federal state-specific logic and prioritization
 * 
 * This component implements the "Land vor Bund" (State before Federal) principle
 * by providing state matching algorithms and priority scoring based on state specificity.
 * 
 * Key Features:
 * - Federal state matching algorithms
 * - Priority scoring based on state specificity  
 * - Support for "all" vs specific state programs
 * - Integration with RelevanceEngine for optimized sorting
 */

export class FederalStatePrioritizer {
  // German federal state codes and names mapping
  static FEDERAL_STATES = {
    'BW': 'Baden-Württemberg',
    'BY': 'Bayern', 
    'BE': 'Berlin',
    'BB': 'Brandenburg',
    'HB': 'Bremen',
    'HH': 'Hamburg',
    'HE': 'Hessen',
    'MV': 'Mecklenburg-Vorpommern',
    'NI': 'Niedersachsen',
    'NW': 'Nordrhein-Westfalen',
    'RP': 'Rheinland-Pfalz',
    'SL': 'Saarland',
    'SN': 'Sachsen',
    'ST': 'Sachsen-Anhalt',
    'SH': 'Schleswig-Holstein',
    'TH': 'Thüringen'
  };

  // Priority weights for different state matching scenarios
  static PRIORITY_WEIGHTS = {
    EXACT_STATE_MATCH: 100,      // Program specifically for user's state
    MULTI_STATE_MATCH: 80,       // Program for multiple states including user's
    ALL_STATES_CORE: 60,         // Core program available to all states
    ALL_STATES_SUPPLEMENTARY: 40, // Supplementary program available to all states
    ALL_STATES_NATIONAL: 20,     // National program available to all states
    NO_MATCH: 0                  // Program not available in user's state
  };

  constructor() {
    // Initialize any needed state or configuration
  }

  /**
   * Check if a program matches a specific federal state
   * @param {Object} program - Funding program to check
   * @param {string} userFederalState - User's federal state code (e.g., 'BY', 'NW')
   * @returns {boolean} True if program is available in the user's state
   */
  matchesFederalState(program, userFederalState) {
    if (!program || !program.federalStates || !userFederalState) {
      return false;
    }

    // Handle case where federalStates is not an array
    const federalStates = Array.isArray(program.federalStates) 
      ? program.federalStates 
      : [program.federalStates];

    // Check for exact state match or "all" states
    return federalStates.includes(userFederalState) || 
           federalStates.includes('all');
  }

  /**
   * Calculate federal state priority score for a program
   * @param {Object} program - Funding program with relevance metadata
   * @param {string} userFederalState - User's federal state code
   * @returns {number} Priority score (0-100)
   */
  calculateStatePriorityScore(program, userFederalState) {
    if (!program || !userFederalState) {
      return FederalStatePrioritizer.PRIORITY_WEIGHTS.NO_MATCH;
    }

    const federalStates = Array.isArray(program.federalStates) 
      ? program.federalStates 
      : [program.federalStates];

    // No match - program not available in user's state
    if (!this.matchesFederalState(program, userFederalState)) {
      return FederalStatePrioritizer.PRIORITY_WEIGHTS.NO_MATCH;
    }

    // Exact state match - program specifically for user's state only
    if (federalStates.length === 1 && federalStates[0] === userFederalState) {
      return FederalStatePrioritizer.PRIORITY_WEIGHTS.EXACT_STATE_MATCH;
    }

    // Multi-state match - program for multiple specific states including user's
    if (federalStates.includes(userFederalState) && !federalStates.includes('all')) {
      return FederalStatePrioritizer.PRIORITY_WEIGHTS.MULTI_STATE_MATCH;
    }

    // Programs available to all states - prioritize by relevance level
    if (federalStates.includes('all')) {
      const relevanceLevel = program.relevanceLevel || 3; // Default to national if not set
      
      switch (relevanceLevel) {
        case 1: // Core Programs
          return FederalStatePrioritizer.PRIORITY_WEIGHTS.ALL_STATES_CORE;
        case 2: // Supplementary Programs  
          return FederalStatePrioritizer.PRIORITY_WEIGHTS.ALL_STATES_SUPPLEMENTARY;
        case 3: // National Programs
          return FederalStatePrioritizer.PRIORITY_WEIGHTS.ALL_STATES_NATIONAL;
        default:
          return FederalStatePrioritizer.PRIORITY_WEIGHTS.NO_MATCH;
      }
    }

    return FederalStatePrioritizer.PRIORITY_WEIGHTS.NO_MATCH;
  }

  /**
   * Prioritize programs based on federal state specificity
   * Implements "Land vor Bund" principle: state programs before national programs
   * @param {Array} programs - Array of programs with relevance metadata
   * @param {string} userFederalState - User's federal state code
   * @returns {Array} Programs sorted by state priority
   */
  prioritizeByState(programs, userFederalState) {
    if (!programs || !Array.isArray(programs)) {
      return [];
    }

    if (!userFederalState) {
      // If no state specified, return programs as-is
      return [...programs];
    }

    // Calculate state priority score for each program
    const programsWithStateScore = programs.map(program => ({
      ...program,
      statePriorityScore: this.calculateStatePriorityScore(program, userFederalState)
    }));

    // Sort by state priority score (highest first), then by relevance level (lowest first)
    return programsWithStateScore.sort((a, b) => {
      // Primary sort: State priority score (higher is better)
      if (a.statePriorityScore !== b.statePriorityScore) {
        return b.statePriorityScore - a.statePriorityScore;
      }

      // Secondary sort: Relevance level (lower number is better: 1 > 2 > 3)
      const aLevel = a.relevanceLevel || 3;
      const bLevel = b.relevanceLevel || 3;
      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }

      // Tertiary sort: Funding rate (higher is better)
      const aRate = this.parseFundingRate(a.fundingRate);
      const bRate = this.parseFundingRate(b.fundingRate);
      return bRate - aRate;
    });
  }

  /**
   * Get programs by state specificity level
   * @param {Array} programs - Array of programs with relevance metadata
   * @param {string} userFederalState - User's federal state code
   * @param {string} specificityLevel - 'state-specific', 'multi-state', 'national'
   * @returns {Array} Filtered programs
   */
  getProgramsByStateSpecificity(programs, userFederalState, specificityLevel) {
    if (!programs || !Array.isArray(programs)) {
      return [];
    }

    return programs.filter(program => {
      const federalStates = Array.isArray(program.federalStates) 
        ? program.federalStates 
        : [program.federalStates];

      switch (specificityLevel) {
        case 'state-specific':
          // Programs for specific states only (not "all")
          return !federalStates.includes('all') && 
                 federalStates.includes(userFederalState);
        
        case 'multi-state':
          // Programs for multiple specific states
          return !federalStates.includes('all') && 
                 federalStates.length > 1 &&
                 federalStates.includes(userFederalState);
        
        case 'national':
          // Programs available to all states
          return federalStates.includes('all');
        
        default:
          return true;
      }
    });
  }

  /**
   * Check if program supports Core_Programs vs National_Programs distinction
   * @param {Object} program - Funding program
   * @returns {Object} Classification result
   */
  classifyProgramByOrigin(program) {
    if (!program) {
      return { type: 'unknown', confidence: 0 };
    }

    const federalStates = Array.isArray(program.federalStates) 
      ? program.federalStates 
      : [program.federalStates];

    const relevanceLevel = program.relevanceLevel || 3;
    const isFederalStateSpecific = program.isFederalStateSpecific || false;

    // Core Programs (Level 1): Bundeslandspezifische Programme
    if (relevanceLevel === 1 || isFederalStateSpecific) {
      return {
        type: 'Core_Programs',
        level: 1,
        confidence: 0.9,
        description: 'Bundeslandspezifische Programme'
      };
    }

    // Supplementary Programs (Level 2): Landesumgesetzte Bundes-/EU-Programme
    if (relevanceLevel === 2) {
      return {
        type: 'Supplementary_Programs', 
        level: 2,
        confidence: 0.8,
        description: 'Landesumgesetzte Bundes-/EU-Programme'
      };
    }

    // National Programs (Level 3): Echte bundesweite Programme
    if (relevanceLevel === 3 && federalStates.includes('all')) {
      return {
        type: 'National_Programs',
        level: 3, 
        confidence: 0.7,
        description: 'Echte bundesweite Programme'
      };
    }

    // Default classification
    return {
      type: 'National_Programs',
      level: 3,
      confidence: 0.5,
      description: 'Standard bundesweite Programme'
    };
  }

  /**
   * Get state-specific statistics for programs
   * @param {Array} programs - Array of programs
   * @param {string} userFederalState - User's federal state code
   * @returns {Object} Statistics about state-specific programs
   */
  getStateStatistics(programs, userFederalState) {
    if (!programs || !Array.isArray(programs)) {
      return {
        total: 0,
        stateSpecific: 0,
        multiState: 0,
        national: 0,
        available: 0,
        notAvailable: 0
      };
    }

    const stats = {
      total: programs.length,
      stateSpecific: 0,
      multiState: 0, 
      national: 0,
      available: 0,
      notAvailable: 0,
      corePrograms: 0,
      supplementaryPrograms: 0,
      nationalPrograms: 0
    };

    programs.forEach(program => {
      const federalStates = Array.isArray(program.federalStates) 
        ? program.federalStates 
        : [program.federalStates];

      // Count by state specificity
      if (federalStates.includes('all')) {
        stats.national++;
      } else if (federalStates.length === 1) {
        stats.stateSpecific++;
      } else {
        stats.multiState++;
      }

      // Count availability
      if (this.matchesFederalState(program, userFederalState)) {
        stats.available++;
      } else {
        stats.notAvailable++;
      }

      // Count by program type
      const classification = this.classifyProgramByOrigin(program);
      switch (classification.type) {
        case 'Core_Programs':
          stats.corePrograms++;
          break;
        case 'Supplementary_Programs':
          stats.supplementaryPrograms++;
          break;
        case 'National_Programs':
          stats.nationalPrograms++;
          break;
      }
    });

    return stats;
  }

  /**
   * Parse funding rate string to numeric value for comparison
   * @param {string} fundingRate - Funding rate string (e.g., "60-80%", "bis 90%")
   * @returns {number} Numeric funding rate (0-100)
   */
  parseFundingRate(fundingRate) {
    if (!fundingRate || typeof fundingRate !== 'string') {
      return 0;
    }

    // Extract numbers from funding rate string
    const numbers = fundingRate.match(/\d+/g);
    if (!numbers || numbers.length === 0) {
      return 0;
    }

    // If range (e.g., "60-80%"), take the higher value
    if (numbers.length > 1) {
      return Math.max(...numbers.map(n => parseInt(n, 10)));
    }

    // Single number
    return parseInt(numbers[0], 10);
  }

  /**
   * Validate federal state code
   * @param {string} stateCode - Federal state code to validate
   * @returns {boolean} True if valid state code
   */
  static isValidFederalState(stateCode) {
    return Boolean(stateCode && Object.keys(FederalStatePrioritizer.FEDERAL_STATES).includes(stateCode));
  }

  /**
   * Get full name for federal state code
   * @param {string} stateCode - Federal state code
   * @returns {string} Full state name or empty string if invalid
   */
  static getFederalStateName(stateCode) {
    return FederalStatePrioritizer.FEDERAL_STATES[stateCode] || '';
  }

  /**
   * Get all available federal states
   * @returns {Object} Map of state codes to names
   */
  static getAllFederalStates() {
    return { ...FederalStatePrioritizer.FEDERAL_STATES };
  }
}