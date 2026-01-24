/**
 * Result Sorting Service
 * 
 * Enhanced sorting with multi-level relevance-based logic:
 * 1. Primary: Relevance level (1 > 2 > 3)
 * 2. Secondary: Federal state match
 * 3. Tertiary: Funding rate (highest first)
 * 
 * Also includes legacy sorting for backward compatibility.
 */

/**
 * Parse funding rate string to numeric value for comparison
 * @param {string} fundingRateStr - Funding rate string (e.g., "60-90%", "bis 80%", "bis 10.000 EUR")
 * @returns {number} Numeric value for comparison (0-100 for percentages, raw number for EUR amounts)
 */
export const parseFundingRate = (fundingRateStr) => {
  if (!fundingRateStr || typeof fundingRateStr !== 'string') {
    return 0;
  }

  const str = fundingRateStr.toLowerCase().trim();
  
  // Handle EUR amounts (convert to percentage equivalent for comparison)
  if (str.includes('eur')) {
    const eurMatch = str.match(/(\d+(?:\.\d+)?)/);
    if (eurMatch) {
      const amount = parseFloat(eurMatch[1]);
      // Convert EUR amounts to a comparable scale (higher amounts = higher score)
      // Use logarithmic scale to handle wide range of amounts
      return Math.min(100, Math.log10(amount + 1) * 20);
    }
    return 0;
  }
  
  // Handle percentage ranges (e.g., "60-90%")
  const rangeMatch = str.match(/(\d+)-(\d+)%/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return max; // Use maximum value for comparison
  }
  
  // Handle "bis X%" format
  const bisMatch = str.match(/bis\s+(\d+)%/);
  if (bisMatch) {
    return parseInt(bisMatch[1]);
  }
  
  // Handle simple percentage (e.g., "75%")
  const percentMatch = str.match(/(\d+)%/);
  if (percentMatch) {
    return parseInt(percentMatch[1]);
  }
  
  // Handle "variabel" or other non-numeric values
  if (str.includes('variabel')) {
    return 50; // Default middle value for variable rates
  }
  
  return 0;
};

/**
 * Check if a program matches the user's federal state
 * @param {Object} program - Funding program
 * @param {string} userFederalState - User's federal state code
 * @returns {boolean} True if program matches state
 */
export const matchesFederalState = (program, userFederalState) => {
  if (!program.federalStates || !userFederalState) {
    return false;
  }
  
  return program.federalStates.includes(userFederalState) || 
         program.federalStates.includes('all');
};

/**
 * Check if a program is state-specific (not bundesweit)
 * @param {Object} program - Funding program
 * @returns {boolean} True if program is state-specific
 */
export const isStateSpecific = (program) => {
  if (!program.federalStates || !Array.isArray(program.federalStates)) {
    return false;
  }
  
  // Program is state-specific if it doesn't include 'all' and has specific state codes
  return !program.federalStates.includes('all') && program.federalStates.length > 0;
};

/**
 * Enhanced sort by relevance with multi-level sorting
 * Priority: State-specific programs first, then bundesweite programs
 * @param {Array} programs - Array of programs with relevance metadata
 * @param {string} userFederalState - User's federal state code
 * @returns {Array} Sorted programs
 */
export const sortByRelevance = (programs, userFederalState = null) => {
  if (!Array.isArray(programs)) {
    return [];
  }

  return programs.sort((a, b) => {
    // 1. Primary: State-specific programs before bundesweite programs
    const aIsStateSpecific = isStateSpecific(a);
    const bIsStateSpecific = isStateSpecific(b);
    
    if (aIsStateSpecific !== bIsStateSpecific) {
      return bIsStateSpecific - aIsStateSpecific; // true (1) comes before false (0)
    }
    
    // 2. Secondary: Within state-specific programs, prioritize user's state
    if (userFederalState && aIsStateSpecific && bIsStateSpecific) {
      const aStateMatch = matchesFederalState(a, userFederalState);
      const bStateMatch = matchesFederalState(b, userFederalState);
      
      if (aStateMatch !== bStateMatch) {
        return bStateMatch - aStateMatch; // true (1) comes before false (0)
      }
    }
    
    // 3. Tertiary: Relevance level (1 > 2 > 3, lower number = higher priority)
    const aLevel = a.relevanceLevel || 3;
    const bLevel = b.relevanceLevel || 3;
    
    if (aLevel !== bLevel) {
      return aLevel - bLevel;
    }
    
    // 4. Quaternary: Funding rate (highest first)
    const aRate = parseFundingRate(a.fundingRate);
    const bRate = parseFundingRate(b.fundingRate);
    
    return bRate - aRate;
  });
};

/**
 * Limit results to specified number of most relevant programs
 * @param {Array} programs - Sorted programs array
 * @param {number} maxResults - Maximum number of results (default: 20)
 * @returns {Array} Limited results array
 */
export const limitResults = (programs, maxResults = 20) => {
  if (!Array.isArray(programs)) {
    return [];
  }
  
  return programs.slice(0, maxResults);
};

/**
 * Enhanced sorting with relevance-based multi-level logic and result limiting
 * @param {Array} programs - Array of programs with relevance metadata
 * @param {string} userFederalState - User's federal state code
 * @param {number} maxResults - Maximum number of results (default: 20)
 * @returns {Array} Sorted and limited programs
 */
export const sortAndLimitByRelevance = (programs, userFederalState = null, maxResults = 20) => {
  const sorted = sortByRelevance(programs, userFederalState);
  return limitResults(sorted, maxResults);
};

/**
 * Legacy sort results by state-specific first, then bundesweite, then by fitScore
 * Maintained for backward compatibility
 * @param {Array} programs - Array of ranked programs with isStateSpecific flag
 * @returns {Array} Sorted programs
 */
export const sortResults = (programs) => {
  if (!Array.isArray(programs)) {
    return [];
  }

  return programs.sort((a, b) => {
    // First priority: state-specific programs come before bundesweite
    if (a.isStateSpecific && !b.isStateSpecific) {
      return -1; // a comes first
    }
    if (!a.isStateSpecific && b.isStateSpecific) {
      return 1; // b comes first
    }
    
    // Second priority: within each group, sort by fitScore descending
    return (b.fitScore || 0) - (a.fitScore || 0);
  });
};