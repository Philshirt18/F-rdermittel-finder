/**
 * Simple Filter Service for Funding Programs
 * 
 * New funding recommendation logic using simplified location-based filtering.
 * 
 * Goals:
 * - Make results more relevant
 * - Remove unnecessary cross-matching between urban and rural programs
 * - Clear separation between Stadt/Quartier and Ländlicher Raum
 */

/**
 * Program location type classification
 * Based on program name and characteristics
 */
const PROGRAM_LOCATION_TYPES = {
  // URBAN PROGRAMS - Stadt / Quartier
  "Städtebauförderung - Lebendige Zentren": "urban",
  "Soziale Stadt - Zusammenhalt im Quartier": "urban",
  "Wachstum und nachhaltige Erneuerung": "urban",
  "BMWSB - Nationale Projekte des Städtebaus": "urban",
  "Bundesprogramm Sanierung kommunaler Einrichtungen": "urban",
  "Städtebauförderung Baden-Württemberg": "urban",
  "Investitionspakt BW - Soziale Integration im Quartier": "urban",
  "Ausgleichstock Baden-Württemberg": "urban",
  "Städtebauförderung Berlin - Lebendige Zentren": "urban",
  "Sozialer Zusammenhalt Berlin / Quartiersmanagement": "urban",
  "Grünflächen und Spielplätze in der Nachbarschaft (Berlin)": "urban",
  "RiLiSE - Nachhaltige Stadtentwicklung Hessen": "urban",
  "Lebendige Zentren Hessen": "urban",
  "Sozialer Zusammenhalt Hessen": "urban",
  "Zukunft Innenstadt Hessen": "urban",
  "Sportstättenbau Hessen": "urban",

  // RURAL PROGRAMS - Ländlicher Raum
  "GAK - Förderung der Dorfentwicklung": "rural",
  "LEADER - EU-Förderung für ländliche Regionen": "rural",
  "BULEplus - Soziale Dorfentwicklung": "rural",
  "Entwicklungsprogramm Ländlicher Raum (ELR) BW": "rural",
  "LEADER Baden-Württemberg": "rural",
  "Regionalbudget Baden-Württemberg": "rural",
  "Dorfentwicklung Hessen": "rural",
  "STARKES DORF+ Hessen": "rural",
  "Dorferneuerung Bayern": "rural",
  "LEADER Bayern 2023-2027": "rural",
  "Regionalbudget Bayern": "rural",
  "LEADER Brandenburg": "rural",
  "Integrierte ländliche Entwicklung Brandenburg (ILE)": "rural",
  "LEADER Mecklenburg-Vorpommern": "rural",
  "Integrierte ländliche Entwicklung M-V (ILERL)": "rural",
  "GAK-Regionalbudget Mecklenburg-Vorpommern": "rural",
  "ZILE - Dorfentwicklung Niedersachsen": "rural",
  "ZILE - Basisdienstleistungen Niedersachsen": "rural",
  "LEADER Niedersachsen (KLARA)": "rural",
  "Struktur- und Dorfentwicklung NRW": "rural",
  "Regionalbudget für Kleinprojekte NRW": "rural",
  "LEADER Nordrhein-Westfalen": "rural",
  "Dorferneuerung Rheinland-Pfalz (kommunal)": "rural",
  "LEADER Rheinland-Pfalz": "rural",
  "Regionalbudget (GAK) Rheinland-Pfalz": "rural",
  "Öffentliche Dorferneuerung Saarland": "rural",
  "LEADER Saarland": "rural",
  "Vitale Dorfkerne und Ortszentren Sachsen": "rural",
  "Regionalbudgets Sachsen": "rural",
  "LEADER Sachsen": "rural",
  "Förderrichtlinie Ländliche Entwicklung Sachsen": "rural",
  "LEADER Sachsen-Anhalt": "rural",
  "Dorfentwicklung und ländlicher Wegebau Sachsen-Anhalt": "rural",
  "GAK-Ortskernentwicklung Schleswig-Holstein": "rural",
  "Förderung des ländlichen Raums (ELER/GAP)": "rural",
  "LEADER Schleswig-Holstein": "rural",
  "Integrierte ländliche Entwicklung (ILE) Schleswig-Holstein": "rural",
  "Dorferneuerung und -entwicklung Thüringen": "rural",
  "LEADER Thüringen (PORTIA)": "rural",
  "Integrierte Ländliche Entwicklung (ILE) Thüringen": "rural",

  // BOTH - Programs that work for both urban and rural
  "Deutsches Kinderhilfswerk - Themenfonds Spielraum": "both",
  "Deutsches Kinderhilfswerk - Spielplatz-Initiative": "both",
  "KfW 208 - Investitionskredit Kommunen": "both",
  "Klimaanpassung in sozialen Einrichtungen (AnpaSo)": "both"
};

/**
 * Get location type for a program
 * @param {Object} program - Funding program
 * @returns {string} Location type: "urban", "rural", or "both"
 */
export const getProgramLocationType = (program) => {
  if (!program || !program.name) {
    return "both"; // Default fallback
  }

  const locationType = PROGRAM_LOCATION_TYPES[program.name];
  if (locationType) {
    return locationType;
  }

  // Auto-classify based on program name keywords
  const name = program.name.toLowerCase();
  
  // Rural keywords
  if (name.includes('leader') || 
      name.includes('dorf') || 
      name.includes('ländlich') || 
      name.includes('gak') || 
      name.includes('regionalbudget')) {
    return "rural";
  }
  
  // Urban keywords
  if (name.includes('städtebau') || 
      name.includes('quartier') || 
      name.includes('soziale stadt') || 
      name.includes('innenstadt') || 
      name.includes('zentren')) {
    return "urban";
  }
  
  // Default to both if unclear
  return "both";
};

/**
 * Get program priority for sorting
 * @param {Object} program - Funding program
 * @param {string} userFederalState - User's federal state
 * @returns {number} Priority (1 = highest, 3 = lowest)
 */
export const getProgramPriority = (program, userFederalState) => {
  if (!program.federalStates || !Array.isArray(program.federalStates)) {
    return 3; // Lowest priority for programs without state info
  }

  // Priority 1: Bundeslandspezifische Programme (state-specific)
  if (program.federalStates.includes(userFederalState) && !program.federalStates.includes('all')) {
    return 1;
  }

  // Priority 2: Bundes-/EU-Programme mit Standortbezug
  if (program.federalStates.includes('all')) {
    const locationType = getProgramLocationType(program);
    if (locationType === 'urban' || locationType === 'rural') {
      return 2; // Location-specific federal programs
    }
  }

  // Priority 3: Allgemeine bundesweite Programme / Stiftungen
  return 3;
};

/**
 * Parse funding rate for sorting
 * @param {string} fundingRateStr - Funding rate string
 * @returns {number} Numeric value for comparison
 */
export const parseFundingRate = (fundingRateStr) => {
  if (!fundingRateStr || typeof fundingRateStr !== 'string') {
    return 0;
  }

  const str = fundingRateStr.toLowerCase().trim();
  
  // Handle EUR amounts
  if (str.includes('eur')) {
    const eurMatch = str.match(/(\d+(?:\.\d+)?)/);
    if (eurMatch) {
      const amount = parseFloat(eurMatch[1]);
      return Math.min(100, Math.log10(amount + 1) * 20);
    }
    return 0;
  }
  
  // Handle percentage ranges (e.g., "60-90%")
  const rangeMatch = str.match(/(\d+)-(\d+)%/);
  if (rangeMatch) {
    return parseInt(rangeMatch[2]); // Use maximum value
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
  
  // Handle "variabel"
  if (str.includes('variabel')) {
    return 50;
  }
  
  return 0;
};

/**
 * Simple filter programs based on location and federal state
 * @param {string} einsatzbereich - "stadt-quartier", "laendlicher-raum", or null
 * @param {string} federalState - Federal state code
 * @param {Array} allPrograms - All available programs
 * @returns {Array} Filtered and sorted programs
 */
export const simpleFilterPrograms = (einsatzbereich, federalState, allPrograms) => {
  if (!Array.isArray(allPrograms)) {
    return [];
  }

  console.log(`🎯 Simple Filter: ${einsatzbereich} in ${federalState}`);
  console.log(`📊 Input programs: ${allPrograms.length}`);

  // Step 1: Filter by federal state
  const statePrograms = allPrograms.filter(program => 
    program.federalStates && 
    (program.federalStates.includes(federalState) || program.federalStates.includes('all'))
  );
  
  console.log(`🏛️  After state filter: ${statePrograms.length}`);

  // Step 2: Filter by project type (only playground)
  const playgroundPrograms = statePrograms.filter(program =>
    program.type && program.type.includes('playground')
  );
  
  console.log(`🎪 After playground filter: ${playgroundPrograms.length}`);

  // Step 3: Filter by location type (strict rules)
  let locationFilteredPrograms = playgroundPrograms;
  
  if (einsatzbereich === 'stadt-quartier') {
    // Stadt / Quartier: Exclude rural-only programs
    locationFilteredPrograms = playgroundPrograms.filter(program => {
      const locationType = getProgramLocationType(program);
      return locationType === 'urban' || locationType === 'both';
    });
    console.log(`🏙️  After urban filter: ${locationFilteredPrograms.length}`);
    
  } else if (einsatzbereich === 'laendlicher-raum') {
    // Ländlicher Raum: Exclude urban-only programs
    locationFilteredPrograms = playgroundPrograms.filter(program => {
      const locationType = getProgramLocationType(program);
      return locationType === 'rural' || locationType === 'both';
    });
    console.log(`🌾 After rural filter: ${locationFilteredPrograms.length}`);
    
  } else {
    // No location selected: Show all programs
    console.log(`🌍 No location filter applied`);
  }

  // Step 4: Add metadata for sorting
  const programsWithMetadata = locationFilteredPrograms.map(program => ({
    ...program,
    locationType: getProgramLocationType(program),
    priority: getProgramPriority(program, federalState),
    fundingRateNumeric: parseFundingRate(program.fundingRate),
    isStateSpecific: program.federalStates && !program.federalStates.includes('all')
  }));

  // Step 5: Sort by priority rules
  const sortedPrograms = programsWithMetadata.sort((a, b) => {
    // Primary: Priority (1 > 2 > 3)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    
    // Secondary: Within same priority, state-specific first
    if (a.isStateSpecific !== b.isStateSpecific) {
      return b.isStateSpecific - a.isStateSpecific;
    }
    
    // Tertiary: Funding rate (highest first)
    if (a.fundingRateNumeric !== b.fundingRateNumeric) {
      return b.fundingRateNumeric - a.fundingRateNumeric;
    }
    
    // Quaternary: Alphabetical by name
    return a.name.localeCompare(b.name);
  });

  console.log(`✅ Final sorted programs: ${sortedPrograms.length}`);
  console.log('📋 Program breakdown:');
  
  const priorityBreakdown = {1: 0, 2: 0, 3: 0};
  const locationBreakdown = {urban: 0, rural: 0, both: 0};
  
  sortedPrograms.forEach(program => {
    priorityBreakdown[program.priority]++;
    locationBreakdown[program.locationType]++;
  });
  
  console.log(`   Priority 1 (State-specific): ${priorityBreakdown[1]}`);
  console.log(`   Priority 2 (Federal w/ location): ${priorityBreakdown[2]}`);
  console.log(`   Priority 3 (General federal): ${priorityBreakdown[3]}`);
  console.log(`   Urban: ${locationBreakdown.urban}, Rural: ${locationBreakdown.rural}, Both: ${locationBreakdown.both}`);

  return sortedPrograms;
};

/**
 * Get program names for debugging
 * @param {Array} programs - Filtered programs
 * @returns {Array} Array of program names
 */
export const getSimpleFilterProgramNames = (programs) => {
  return programs.map(program => program.name);
};

/**
 * Validate program location type assignment
 * @param {string} programName - Program name
 * @returns {Object} Validation result
 */
export const validateProgramLocationType = (programName) => {
  const locationType = PROGRAM_LOCATION_TYPES[programName];
  const autoClassified = getProgramLocationType({ name: programName });
  
  return {
    programName,
    explicitType: locationType || null,
    autoClassifiedType: autoClassified,
    isConsistent: locationType ? locationType === autoClassified : true
  };
};

/**
 * Get statistics about program classification
 * @param {Array} allPrograms - All programs
 * @returns {Object} Classification statistics
 */
export const getClassificationStats = (allPrograms) => {
  const stats = {
    total: allPrograms.length,
    urban: 0,
    rural: 0,
    both: 0,
    explicit: 0,
    autoClassified: 0
  };
  
  allPrograms.forEach(program => {
    const locationType = getProgramLocationType(program);
    stats[locationType]++;
    
    if (PROGRAM_LOCATION_TYPES[program.name]) {
      stats.explicit++;
    } else {
      stats.autoClassified++;
    }
  });
  
  return stats;
};