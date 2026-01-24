/**
 * Strict Filter Service for Funding Programs
 * 
 * Implements strict, legally-compliant filtering based on exact use case matching.
 * NO approximations, NO "could also work" logic, NO generalizations.
 * 
 * Enhanced with relevance-based scoring and playground funding history prioritization.
 */

import { RelevanceEngine } from './RelevanceEngine.js';

/**
 * Strict mapping of Einsatzbereich to allowed program types
 */
const EINSATZBEREICH_PROGRAM_MAPPING = {
  // Stadt / Quartier - alle städtischen und quartiersbezogenen Programme
  'stadt-quartier': {
    allowedTypes: ['public_infrastructure', 'urban_development', 'green_spaces', 'social_integration', 'housing_development', 'educational_infrastructure', 'social_facilities'],
    excludedTypes: ['rural_development', 'village_renewal', 'leader']
  },
  
  // Ländlicher Raum - nur ländliche Entwicklungsprogramme
  'laendlicher-raum': {
    allowedTypes: ['rural_development', 'village_renewal', 'leader'],
    excludedTypes: ['urban_development', 'housing_development', 'social_integration']
  },
  
  // Legacy support - alte Werte werden auf neue gemappt
  'oeffentlich-kommunal': {
    allowedTypes: ['public_infrastructure', 'urban_development', 'green_spaces'],
    excludedTypes: ['private', 'educational', 'social_facilities']
  },
  'parks-gruenanlage': {
    allowedTypes: ['green_spaces', 'urban_development', 'public_infrastructure'],
    excludedTypes: ['private', 'educational', 'social_facilities']
  },
  'neubaugebiet': {
    allowedTypes: ['urban_development', 'housing_development', 'public_infrastructure'],
    excludedTypes: ['private', 'educational', 'rural']
  },
  'wohnquartier': {
    allowedTypes: ['urban_development', 'social_integration', 'housing_development'],
    excludedTypes: ['private', 'educational', 'rural']
  },
  'freizeit-erholung': {
    allowedTypes: ['recreation_facilities', 'tourism_infrastructure', 'public_infrastructure'],
    excludedTypes: ['private', 'educational', 'housing_development']
  },
  'kommunal-angebunden': {
    allowedTypes: ['educational_infrastructure', 'social_facilities', 'social_integration', 'public_infrastructure'],
    excludedTypes: ['private', 'rural']
  }
};

/**
 * Strict program classification based on actual usage patterns
 */
const PROGRAM_CLASSIFICATIONS = {
  // Bundesweite Programme
  "Städtebauförderung - Lebendige Zentren": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier'],
    excludedUseCases: ['kita', 'schule', 'soziale-einrichtung']
  },
  "Soziale Stadt - Zusammenhalt im Quartier": {
    types: ['social_integration', 'urban_development'],
    useCases: ['stadt-quartier', 'wohnquartier', 'sozialer-wohnungsbau', 'soziale-einrichtung'],
    excludedUseCases: ['kita', 'schule', 'tourismus']
  },
  "Wachstum und nachhaltige Erneuerung": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet'],
    excludedUseCases: ['kommunal-angebunden']
  },
  "BMWSB - Nationale Projekte des Städtebaus": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage'],
    excludedUseCases: ['kommunal-angebunden', 'laendlicher-raum']
  },
  "GAK - Förderung der Dorfentwicklung": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier', 'kommunal-angebunden']
  },
  "LEADER - EU-Förderung für ländliche Regionen": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier', 'kommunal-angebunden']
  },
  "BULEplus - Bundesprogramm Ländliche Entwicklung": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'kommunal-angebunden']
  },
  "KfW 208 - Investitionskredit Kommunen": {
    types: ['public_infrastructure', 'municipal_investment'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden'],
    excludedUseCases: ['freizeit-erholung']
  },
  "Klimaanpassung in sozialen Einrichtungen (AnpaSo)": {
    types: ['social_facilities', 'climate_adaptation'],
    useCases: ['stadt-quartier', 'kommunal-angebunden'],
    excludedUseCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'freizeit-erholung']
  },

  // ========== HESSEN PROGRAMME ==========
  "RiLiSE - Nachhaltige Stadtentwicklung Hessen": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier'],
    excludedUseCases: ['kita', 'schule']
  },
  "Lebendige Zentren Hessen": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Sozialer Zusammenhalt Hessen": {
    types: ['social_integration', 'urban_development'],
    useCases: ['stadt-quartier', 'wohnquartier', 'soziale-einrichtung', 'kommunal-angebunden'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Dorfentwicklung Hessen": {
    types: ['rural_development', 'village_renewal', 'public_infrastructure'],
    useCases: ['laendlicher-raum', 'oeffentlich-kommunal', 'parks-gruenanlage'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier']
  },
  "STARKES DORF+ Hessen": {
    types: ['rural_development', 'village_renewal', 'public_infrastructure'],
    useCases: ['laendlicher-raum', 'oeffentlich-kommunal', 'parks-gruenanlage'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier']
  },
  "Sportstättenbau Hessen": {
    types: ['sports_facilities', 'public_infrastructure'],
    useCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'freizeit-erholung'],
    excludedUseCases: ['kita', 'schule', 'soziale-einrichtung']
  },

  // ========== CORE BUNDESWEITE PROGRAMME ==========
  "Deutsches Kinderhilfswerk - Themenfonds Spielraum": {
    types: ['public_infrastructure', 'social_facilities'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'wohnquartier', 'kommunal-angebunden'],
    excludedUseCases: []
  },
  "Deutsches Kinderhilfswerk - Spielplatz-Initiative": {
    types: ['public_infrastructure', 'social_facilities'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'wohnquartier', 'kommunal-angebunden'],
    excludedUseCases: []
  },
  "BULEplus - Soziale Dorfentwicklung": {
    types: ['rural_development', 'social_integration'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['stadt-quartier', 'neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Bundesprogramm Sanierung kommunaler Einrichtungen": {
    types: ['public_infrastructure', 'municipal_investment'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden'],
    excludedUseCases: []
  },
  "Zukunft Innenstadt Hessen": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Sportstättenbau Hessen": {
    types: ['sports_facilities', 'public_infrastructure'],
    useCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'freizeit-erholung'],
    excludedUseCases: ['kita', 'schule', 'soziale-einrichtung']
  },
  "LOTTO hilft Hessen": {
    types: ['social_facilities', 'public_infrastructure'],
    useCases: ['oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden', 'freizeit-erholung'],
    excludedUseCases: []
  },

  // ========== BERLIN PROGRAMME ==========
  "Städtebauförderung Berlin - Lebendige Zentren": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Sozialer Zusammenhalt Berlin / Quartiersmanagement": {
    types: ['social_integration', 'urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'wohnquartier', 'soziale-einrichtung', 'kommunal-angebunden', 'oeffentlich-kommunal'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Grünflächen und Spielplätze in der Nachbarschaft (Berlin)": {
    types: ['green_spaces', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'wohnquartier', 'kommunal-angebunden'],
    excludedUseCases: ['laendlicher-raum']
  },

  // ========== ADDITIONAL RURAL PROGRAMS ==========
  "Städtebauförderung Baden-Württemberg": {
    types: ['urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'neubaugebiet', 'wohnquartier'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Investitionspakt BW - Soziale Integration im Quartier": {
    types: ['social_integration', 'urban_development', 'public_infrastructure'],
    useCases: ['stadt-quartier', 'wohnquartier', 'soziale-einrichtung', 'kommunal-angebunden', 'oeffentlich-kommunal'],
    excludedUseCases: ['laendlicher-raum']
  },
  "Ausgleichstock Baden-Württemberg": {
    types: ['public_infrastructure', 'municipal_investment'],
    useCases: ['stadt-quartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'wohnquartier', 'kommunal-angebunden'],
    excludedUseCases: []
  },
  "Entwicklungsprogramm Ländlicher Raum (ELR) BW": {
    types: ['rural_development', 'public_infrastructure'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Baden-Württemberg": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Regionalbudget Baden-Württemberg": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Dorferneuerung Bayern": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Bayern 2023-2027": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Regionalbudget Bayern": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Brandenburg": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Integrierte ländliche Entwicklung Brandenburg (ILE)": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Mecklenburg-Vorpommern": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Integrierte ländliche Entwicklung M-V (ILERL)": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "GAK-Regionalbudget Mecklenburg-Vorpommern": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "ZILE - Dorfentwicklung Niedersachsen": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "ZILE - Basisdienstleistungen Niedersachsen": {
    types: ['rural_development', 'public_infrastructure'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Niedersachsen (KLARA)": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Struktur- und Dorfentwicklung NRW": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Regionalbudget für Kleinprojekte NRW": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Nordrhein-Westfalen": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Dorferneuerung Rheinland-Pfalz (kommunal)": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Rheinland-Pfalz": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Regionalbudget (GAK) Rheinland-Pfalz": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Öffentliche Dorferneuerung Saarland": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Saarland": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Vitale Dorfkerne und Ortszentren Sachsen": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Regionalbudgets Sachsen": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Sachsen": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Förderrichtlinie Ländliche Entwicklung Sachsen": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Sachsen-Anhalt": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Dorfentwicklung und ländlicher Wegebau Sachsen-Anhalt": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "GAK-Ortskernentwicklung Schleswig-Holstein": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Förderung des ländlichen Raums (ELER/GAP)": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Schleswig-Holstein": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Integrierte ländliche Entwicklung (ILE) Schleswig-Holstein": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Dorferneuerung und -entwicklung Thüringen": {
    types: ['rural_development', 'village_renewal'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "LEADER Thüringen (PORTIA)": {
    types: ['rural_development', 'leader'],
    useCases: ['laendlicher-raum', 'freizeit-erholung'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  },
  "Integrierte Ländliche Entwicklung (ILE) Thüringen": {
    types: ['rural_development'],
    useCases: ['laendlicher-raum'],
    excludedUseCases: ['neubaugebiet', 'wohnquartier', 'oeffentlich-kommunal', 'parks-gruenanlage', 'kommunal-angebunden']
  }
};

/**
 * Excluded program types (never allowed)
 */
const EXCLUDED_PROGRAMS = [
  // Stiftungen
  "Deutsches Kinderhilfswerk",
  "Aktion Mensch",
  "Deutsche Fernsehlotterie",
  "Deutsche Stiftung für Engagement und Ehrenamt",
  
  // LOTTO-Mittel
  "LOTTO-Stiftung",
  "LOTTO hilft",
  "Totomittel",
  "Glück für",
  "BINGO!",
  
  // Ehrenamt/Engagement
  "Freiwilliges Engagement",
  "Bürgerfonds",
  "Heimat-Scheck",
  
  // Sanierung (nur Neubau erlaubt)
  "Sanierung",
  "Modernisierung",
  "Energetische"
];

/**
 * City-states that should not receive rural development programs
 */
const CITY_STATES = ['Hamburg', 'Berlin', 'Bremen'];

/**
 * Check if a federal state is a city-state (no rural areas)
 * @param {string} federalState - Federal state name
 * @returns {boolean} True if it's a city-state
 */
const isCityState = (federalState) => {
  return CITY_STATES.includes(federalState);
};

/**
 * Enhanced strict filtering function with relevance scoring
 * @param {string} einsatzbereich - Selected Einsatzbereich
 * @param {string} federalState - Federal state
 * @param {Array} allPrograms - All available programs
 * @param {Object} options - Additional options for enhanced filtering
 * @param {boolean} options.useRelevanceScoring - Enable relevance-based scoring (default: false for backward compatibility)
 * @param {Object} options.userCriteria - User criteria for relevance scoring
 * @param {RelevanceEngine} options.relevanceEngine - RelevanceEngine instance
 * @returns {Array} Strictly filtered programs with optional relevance scoring
 */
export const strictFilterPrograms = (einsatzbereich, federalState, allPrograms, options = {}) => {
  if (!einsatzbereich || !federalState || !Array.isArray(allPrograms)) {
    return [];
  }

  // Step 1: Filter by federal state (hard requirement)
  const statePrograms = allPrograms.filter(program => 
    program.federalStates && 
    (program.federalStates.includes(federalState) || program.federalStates.includes('all'))
  );

  // Step 2: Filter by project type (only playground)
  const playgroundPrograms = statePrograms.filter(program =>
    program.type && program.type.includes('playground')
  );

  // Step 3: Exclude forbidden programs
  const allowedPrograms = playgroundPrograms.filter(program => {
    const programName = program.name;
    return !EXCLUDED_PROGRAMS.some(excluded => 
      programName.includes(excluded)
    );
  });

  // Step 4: Apply strict Einsatzbereich matching
  const strictlyMatchedPrograms = allowedPrograms.filter(program => {
    const classification = PROGRAM_CLASSIFICATIONS[program.name];
    
    if (!classification) {
      // If program not classified, exclude it (strict approach)
      return false;
    }

    // Special rule: Exclude rural programs for city-states
    if (isCityState(federalState) && classification.types.includes('rural_development')) {
      console.log(`Excluding rural program "${program.name}" for city-state ${federalState}`);
      return false;
    }

    // Check if program explicitly allows this use case
    if (classification.useCases && classification.useCases.includes(einsatzbereich)) {
      return true;
    }

    // Check if program explicitly excludes this use case
    if (classification.excludedUseCases && classification.excludedUseCases.includes(einsatzbereich)) {
      return false;
    }

    // If not explicitly defined, exclude (strict approach)
    return false;
  });

  // Step 5: Apply relevance scoring if enabled
  let finalPrograms = strictlyMatchedPrograms;
  
  if (options.useRelevanceScoring && options.relevanceEngine) {
    finalPrograms = applyRelevanceScoring(
      strictlyMatchedPrograms, 
      options.userCriteria || { federalState, projectType: 'playground', einsatzbereich },
      options.relevanceEngine
    );
  } else {
    // Step 6: Sort by relevance (state-specific first, then by classification match) - legacy behavior
    finalPrograms = strictlyMatchedPrograms.sort((a, b) => {
      // State-specific programs first
      const aIsStateSpecific = a.federalStates && !a.federalStates.includes('all');
      const bIsStateSpecific = b.federalStates && !b.federalStates.includes('all');
      
      if (aIsStateSpecific && !bIsStateSpecific) return -1;
      if (!aIsStateSpecific && bIsStateSpecific) return 1;
      
      // Then by program name (alphabetical)
      return a.name.localeCompare(b.name);
    });
  }

  return finalPrograms;
};

/**
 * Apply relevance-based scoring to programs
 * @param {Array} programs - Programs to score
 * @param {Object} userCriteria - User criteria for scoring
 * @param {RelevanceEngine} relevanceEngine - RelevanceEngine instance
 * @returns {Array} Programs with relevance scores, sorted by score
 */
const applyRelevanceScoring = (programs, userCriteria, relevanceEngine) => {
  // Calculate relevance scores for each program
  const scoredPrograms = programs.map(program => {
    const relevanceScore = relevanceEngine.calculateRelevanceScore(program, userCriteria);
    const relevanceLevel = relevanceEngine.getRelevanceLevel(program);
    
    return {
      ...program,
      relevanceScore,
      relevanceLevel,
      // Add playground funding history flag for prioritization
      playgroundFundingHistory: relevanceEngine.classifier.isPlaygroundRelevant(program),
      isFederalStateSpecific: relevanceEngine.classifier.isFederalStateSpecific(program)
    };
  });

  // Sort by relevance score (highest first), with playground funding history bonus
  return scoredPrograms.sort((a, b) => {
    // Primary: Relevance level (1 > 2 > 3, exclude 4)
    if (a.relevanceLevel !== b.relevanceLevel) {
      return a.relevanceLevel - b.relevanceLevel;
    }
    
    // Secondary: Playground funding history for playground projects
    if (userCriteria.projectType === 'playground') {
      if (a.playgroundFundingHistory && !b.playgroundFundingHistory) return -1;
      if (!a.playgroundFundingHistory && b.playgroundFundingHistory) return 1;
    }
    
    // Tertiary: Federal state match
    const aStateMatch = a.isFederalStateSpecific && 
      a.federalStates && a.federalStates.includes(userCriteria.federalState);
    const bStateMatch = b.isFederalStateSpecific && 
      b.federalStates && b.federalStates.includes(userCriteria.federalState);
    
    if (aStateMatch && !bStateMatch) return -1;
    if (!aStateMatch && bStateMatch) return 1;
    
    // Quaternary: Relevance score
    return b.relevanceScore - a.relevanceScore;
  });
};

/**
 * Enhanced strict filtering with relevance engine integration
 * @param {string} einsatzbereich - Selected Einsatzbereich
 * @param {string} federalState - Federal state
 * @param {Array} allPrograms - All available programs
 * @param {RelevanceEngine} relevanceEngine - RelevanceEngine instance
 * @param {Object} additionalCriteria - Additional user criteria
 * @returns {Array} Enhanced filtered and scored programs
 */
export const strictFilterProgramsWithRelevance = (einsatzbereich, federalState, allPrograms, relevanceEngine, additionalCriteria = {}) => {
  const userCriteria = {
    federalState,
    projectType: 'playground',
    einsatzbereich,
    ...additionalCriteria
  };

  return strictFilterPrograms(einsatzbereich, federalState, allPrograms, {
    useRelevanceScoring: true,
    userCriteria,
    relevanceEngine
  });
};

/**
 * Get minimum relevance score threshold based on criteria
 * @param {Object} userCriteria - User criteria
 * @returns {number} Minimum score threshold
 */
const getMinimumRelevanceScore = (userCriteria) => {
  // Base threshold
  let threshold = 30;
  
  // Lower threshold for rural areas (fewer programs available)
  if (userCriteria.einsatzbereich === 'laendlicher-raum') {
    threshold = 20;
  }
  
  // Higher threshold for well-served areas
  if (userCriteria.einsatzbereich === 'oeffentlich-kommunal') {
    threshold = 40;
  }
  
  return threshold;
};

/**
 * Filter programs by minimum relevance score
 * @param {Array} programs - Programs with relevance scores
 * @param {Object} userCriteria - User criteria
 * @returns {Array} Programs meeting minimum score threshold
 */
export const filterByRelevanceScore = (programs, userCriteria) => {
  const minScore = getMinimumRelevanceScore(userCriteria);
  return programs.filter(program => 
    program.relevanceScore && program.relevanceScore >= minScore
  );
};

/**
 * Get programs with playground funding history prioritization
 * @param {Array} programs - Programs to prioritize
 * @param {RelevanceEngine} relevanceEngine - RelevanceEngine instance
 * @returns {Array} Programs with playground history prioritized
 */
export const prioritizePlaygroundFundingHistory = (programs, relevanceEngine) => {
  return programs.map(program => ({
    ...program,
    playgroundFundingHistory: relevanceEngine.classifier.isPlaygroundRelevant(program)
  })).sort((a, b) => {
    // Playground funding history programs first
    if (a.playgroundFundingHistory && !b.playgroundFundingHistory) return -1;
    if (!a.playgroundFundingHistory && b.playgroundFundingHistory) return 1;
    
    // Then by existing order
    return 0;
  });
};

/**
 * Validate if a specific program is allowed for given use case
/**
 * Get program names only (for strict output format)
 * @param {Array} programs - Filtered programs
 * @returns {Array} Array of program names only
 */
export const getStrictProgramNames = (programs) => {
  return programs.map(program => program.name);
};

/**
 * Validate if a specific program is allowed for given use case
 * @param {string} programName - Program name
 * @param {string} einsatzbereich - Use case
 * @param {string} federalState - Federal state (optional, for city-state check)
 * @returns {boolean} True if allowed
 */
export const isProgramAllowedForUseCase = (programName, einsatzbereich, federalState = null) => {
  // Check if program is excluded
  if (EXCLUDED_PROGRAMS.some(excluded => programName.includes(excluded))) {
    return false;
  }

  const classification = PROGRAM_CLASSIFICATIONS[programName];
  if (!classification) {
    return false;
  }

  // Special rule: Exclude rural programs for city-states
  if (federalState && isCityState(federalState) && classification.types.includes('rural_development')) {
    return false;
  }

  // Check explicit inclusion
  if (classification.useCases && classification.useCases.includes(einsatzbereich)) {
    return true;
  }

  // Check explicit exclusion
  if (classification.excludedUseCases && classification.excludedUseCases.includes(einsatzbereich)) {
    return false;
  }

  // Default: not allowed (strict approach)
  return false;
};

/**
 * Enhanced validation with relevance engine support
 * @param {string} programName - Program name
 * @param {string} einsatzbereich - Use case
 * @param {string} federalState - Federal state (for city-state check)
 * @param {RelevanceEngine} relevanceEngine - Optional relevance engine for enhanced validation
 * @returns {Object} Validation result with details
 */
export const validateProgramForUseCase = (programName, einsatzbereich, federalState = null, relevanceEngine = null) => {
  const basicAllowed = isProgramAllowedForUseCase(programName, einsatzbereich, federalState);
  
  const result = {
    allowed: basicAllowed,
    reason: basicAllowed ? 'Explicitly allowed' : 'Not allowed or excluded',
    relevanceLevel: null,
    playgroundFundingHistory: false
  };
  
  // Add city-state specific reason
  if (!basicAllowed && federalState) {
    const classification = PROGRAM_CLASSIFICATIONS[programName];
    if (classification && isCityState(federalState) && classification.types.includes('rural_development')) {
      result.reason = `Rural development program not applicable for city-state ${federalState}`;
    }
  }
  
  if (relevanceEngine) {
    // Find the program in the engine's data
    const program = relevanceEngine.programs.find(p => p.name === programName);
    if (program) {
      result.relevanceLevel = relevanceEngine.getRelevanceLevel(program);
      result.playgroundFundingHistory = relevanceEngine.classifier.isPlaygroundRelevant(program);
      
      // Override basic validation if relevance level is 4 (excluded)
      if (result.relevanceLevel === 4) {
        result.allowed = false;
        result.reason = 'Excluded by relevance classification';
      }
    }
  }
  
  return result;
};