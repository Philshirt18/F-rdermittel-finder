/**
 * RelevanceClassifier - Classifies funding programs into 4 relevance levels
 * 
 * Classification Logic:
 * Level 1 (Core): Bundeslandspezifische Programme - highest priority
 * Level 2 (Supplementary): Landesumgesetzte Bundes-/EU-Programme - medium-high priority  
 * Level 3 (National): Echte bundesweite Programme - medium priority
 * Level 4 (Excluded): Unrelevante Programme - excluded from results
 */

export class RelevanceClassifier {
  // Relevance level constants
  static RELEVANCE_LEVELS = {
    CORE: 1,           // Bundeslandspezifische Programme
    SUPPLEMENTARY: 2,  // Landesumgesetzte Bundes-/EU-Programme  
    NATIONAL: 3,       // Echte bundesweite Programme
    EXCLUDED: 4        // Unrelevante Programme
  };

  // Keywords that indicate playground relevance
  static PLAYGROUND_KEYWORDS = [
    'spielplatz', 'playground', 'spielgerät', 'spielfläche', 'kinderspielplatz',
    'spielbereich', 'spielanlage', 'outdoor-fitness', 'bewegungspark',
    'mehrgenerationenspielplatz', 'inklusiver spielplatz', 'barrierefreier spielplatz'
  ];

  // Keywords that indicate exclusion (irrelevant programs)
  static EXCLUSION_KEYWORDS = [
    'hochschule', 'universität', 'forschung', 'wissenschaft', 'studium',
    'digitalisierung', 'breitband', 'internet', 'software', 'it-infrastruktur',
    'landwirtschaft', 'agrar', 'forstwirtschaft', 'fischerei',
    'industrie 4.0', 'künstliche intelligenz', 'blockchain',
    'wasserwirtschaft', 'hochwasserschutz', 'deichbau',
    'verkehrsinfrastruktur', 'straßenbau', 'schienenverkehr',
    'energieeffizienz', 'photovoltaik', 'windenergie', 'wärmepumpe'
  ];

  // Federal state specific program indicators
  static STATE_SPECIFIC_INDICATORS = [
    'landesförderprogramm', 'landesprogramm', 'landesförderung',
    'bayern', 'baden-württemberg', 'nordrhein-westfalen', 'niedersachsen',
    'hessen', 'rheinland-pfalz', 'schleswig-holstein', 'brandenburg',
    'sachsen', 'sachsen-anhalt', 'thüringen', 'mecklenburg-vorpommern',
    'saarland', 'bremen', 'hamburg', 'berlin'
  ];

  // EU/Federal implementation indicators
  static EU_FEDERAL_INDICATORS = [
    'efre', 'eler', 'esf', 'europäischer fonds', 'eu-förderung',
    'bundesförderung', 'bundesprogramm', 'gak', 'städtebauförderung',
    'nationale projekte', 'modellvorhaben', 'bundesmittel'
  ];

  /**
   * Classify a funding program into one of 4 relevance levels
   * @param {Object} program - Funding program to classify
   * @returns {number} Relevance level (1-4)
   */
  classifyProgram(program) {
    if (!program || !program.name) {
      return RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED;
    }

    // First check if program should be excluded
    if (this.shouldExcludeProgram(program)) {
      return RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED;
    }

    // Check if it's a federal state specific program (Level 1)
    if (this.isFederalStateSpecific(program)) {
      return RelevanceClassifier.RELEVANCE_LEVELS.CORE;
    }

    // Check if it's an EU/Federal program implemented at state level (Level 2)
    if (this.isEUFederalImplementation(program)) {
      return RelevanceClassifier.RELEVANCE_LEVELS.SUPPLEMENTARY;
    }

    // Default to national program (Level 3)
    return RelevanceClassifier.RELEVANCE_LEVELS.NATIONAL;
  }

  /**
   * Check if program is playground relevant
   * @param {Object} program - Funding program
   * @returns {boolean} True if playground relevant
   */
  isPlaygroundRelevant(program) {
    if (!program) return false;

    const searchText = this.getSearchableText(program).toLowerCase();
    
    // Check for playground keywords
    const hasPlaygroundKeywords = RelevanceClassifier.PLAYGROUND_KEYWORDS.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    // Check if program type includes playground
    const hasPlaygroundType = program.type && program.type.includes('playground');

    // Check if measures include playground-relevant activities
    const hasPlaygroundMeasures = program.measures && (
      program.measures.includes('newBuild') ||
      program.measures.includes('renovation') ||
      program.measures.includes('accessibility')
    );

    return hasPlaygroundKeywords || hasPlaygroundType || hasPlaygroundMeasures;
  }

  /**
   * Check if program is federal state specific (Level 1)
   * @param {Object} program - Funding program
   * @returns {boolean} True if federal state specific
   */
  isFederalStateSpecific(program) {
    if (!program) return false;

    // Check federal states array - if it doesn't include "all", it's state specific
    if (program.federalStates && Array.isArray(program.federalStates)) {
      // If it only includes specific states (not "all"), it's state specific
      if (!program.federalStates.includes('all') && program.federalStates.length > 0) {
        return true;
      }
    }

    // Check for state-specific indicators in program text
    const searchText = this.getSearchableText(program).toLowerCase();
    const hasStateIndicators = RelevanceClassifier.STATE_SPECIFIC_INDICATORS.some(indicator =>
      searchText.includes(indicator.toLowerCase())
    );

    return hasStateIndicators;
  }

  /**
   * Check if program should be excluded (Level 4)
   * @param {Object} program - Funding program
   * @returns {boolean} True if should be excluded
   */
  shouldExcludeProgram(program) {
    if (!program) return true;

    const searchText = this.getSearchableText(program).toLowerCase();
    
    // Check for exclusion keywords
    const hasExclusionKeywords = RelevanceClassifier.EXCLUSION_KEYWORDS.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );

    // Check if program is not playground relevant at all
    const isNotPlaygroundRelevant = !this.isPlaygroundRelevant(program);

    // Exclude if it has exclusion keywords AND is not playground relevant
    return hasExclusionKeywords && isNotPlaygroundRelevant;
  }

  /**
   * Check if program is EU/Federal implementation at state level (Level 2)
   * @param {Object} program - Funding program
   * @returns {boolean} True if EU/Federal implementation
   */
  isEUFederalImplementation(program) {
    if (!program) return false;

    const searchText = this.getSearchableText(program).toLowerCase();
    
    // Check for EU/Federal indicators
    const hasEUFederalIndicators = RelevanceClassifier.EU_FEDERAL_INDICATORS.some(indicator =>
      searchText.includes(indicator.toLowerCase())
    );

    // Check if it's marked as "all" federal states but has EU/Federal characteristics
    // BUT exclude if it's already federal state specific
    const isNationalButEUFederal = program.federalStates && 
                                   program.federalStates.includes('all') && 
                                   hasEUFederalIndicators &&
                                   !this.isFederalStateSpecific(program);

    return isNationalButEUFederal;
  }

  /**
   * Get searchable text from program for keyword matching
   * @param {Object} program - Funding program
   * @returns {string} Combined searchable text
   */
  getSearchableText(program) {
    const textParts = [
      program.name || '',
      program.description || '',
      program.source || '',
      Array.isArray(program.type) ? program.type.join(' ') : '',
      Array.isArray(program.measures) ? program.measures.join(' ') : '',
      Array.isArray(program.federalStates) ? program.federalStates.join(' ') : ''
    ];

    return textParts.join(' ').toLowerCase();
  }

  /**
   * Validate classification result
   * @param {number} level - Classification level
   * @returns {boolean} True if valid level
   */
  static isValidRelevanceLevel(level) {
    return Object.values(RelevanceClassifier.RELEVANCE_LEVELS).includes(level);
  }

  /**
   * Get human-readable name for relevance level
   * @param {number} level - Relevance level
   * @returns {string} Human-readable name
   */
  static getRelevanceLevelName(level) {
    const names = {
      [RelevanceClassifier.RELEVANCE_LEVELS.CORE]: 'Core Programs',
      [RelevanceClassifier.RELEVANCE_LEVELS.SUPPLEMENTARY]: 'Supplementary Programs',
      [RelevanceClassifier.RELEVANCE_LEVELS.NATIONAL]: 'National Programs',
      [RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED]: 'Excluded Programs'
    };

    return names[level] || 'Unknown Level';
  }

  /**
   * Get all relevance levels with metadata
   * @returns {Object} Relevance levels with descriptions
   */
  static getAllRelevanceLevels() {
    return {
      [RelevanceClassifier.RELEVANCE_LEVELS.CORE]: {
        name: 'Core Programs',
        description: 'Bundeslandspezifische Programme',
        priority: 'Highest',
        color: 'green'
      },
      [RelevanceClassifier.RELEVANCE_LEVELS.SUPPLEMENTARY]: {
        name: 'Supplementary Programs',
        description: 'Landesumgesetzte Bundes-/EU-Programme',
        priority: 'Medium-High',
        color: 'yellow'
      },
      [RelevanceClassifier.RELEVANCE_LEVELS.NATIONAL]: {
        name: 'National Programs',
        description: 'Echte bundesweite Programme',
        priority: 'Medium',
        color: 'green'
      },
      [RelevanceClassifier.RELEVANCE_LEVELS.EXCLUDED]: {
        name: 'Excluded Programs',
        description: 'Unrelevante Programme',
        priority: 'Excluded',
        color: 'red'
      }
    };
  }
}