/**
 * Metadata helpers for funding programs
 * These functions add enhanced metadata fields required for the optimized funding logic
 */

/**
 * Add enhanced metadata to a funding program
 * @param {Object} program - Original funding program object
 * @returns {Object} Program with enhanced metadata
 */
export function addEnhancedMetadata(program) {
  // Determine relevance level based on program characteristics
  let relevanceLevel = 3; // Default to National (Level 3)
  let isFederalStateSpecific = false;
  let playgroundFundingHistory = false;
  let programOrigin = 'federal';
  let implementationLevel = 'national';
  let successRate = 50; // Default success rate

  // Determine if program is federal state specific
  if (program.federalStates && program.federalStates.length === 1 && program.federalStates[0] !== 'all') {
    isFederalStateSpecific = true;
    relevanceLevel = 1; // Core Programs (Level 1)
    programOrigin = 'state';
    implementationLevel = 'state';
    successRate = 75; // Higher success rate for state-specific programs
  } else if (program.federalStates && program.federalStates.includes('all')) {
    // Check if it's a state-implemented federal/EU program
    if (program.name.includes('LEADER') || program.name.includes('GAK') || 
        program.name.includes('Städtebauförderung') || program.name.includes('Dorferneuerung')) {
      relevanceLevel = 2; // Supplementary Programs (Level 2)
      programOrigin = program.name.includes('LEADER') ? 'eu' : 'federal';
      implementationLevel = 'state';
      successRate = 65;
    } else {
      relevanceLevel = 3; // National Programs (Level 3)
      successRate = 50;
    }
  }

  // Determine playground funding history
  if (program.type && program.type.includes('playground')) {
    playgroundFundingHistory = true;
    successRate += 10; // Bonus for playground-specific programs
  }

  // Special handling for specific program types
  if (program.name.includes('Spielplatz') || program.name.includes('Kinderhilfswerk') || 
      program.name.includes('Spielraum')) {
    playgroundFundingHistory = true;
    relevanceLevel = Math.min(relevanceLevel, 2); // Boost relevance for playground-specific
    successRate += 15;
  }

  // Handle stiftungen and special programs
  if (program.name.includes('Stiftung') || program.name.includes('LOTTO') || 
      program.name.includes('Aktion Mensch')) {
    programOrigin = 'mixed';
    implementationLevel = 'national';
    if (program.type && program.type.includes('playground')) {
      relevanceLevel = 2; // Supplementary for playground-relevant foundations
    }
  }

  // Exclude clearly irrelevant programs (Level 4)
  if (program.name.includes('Sportstätten') && !program.type.includes('playground') && 
      !program.type.includes('combination')) {
    relevanceLevel = 4; // Excluded Programs
    successRate = 20;
  }

  // Exclude programs that are clearly not playground-related
  if (program.name.includes('Digitalisierung') || program.name.includes('Hochschul') ||
      program.name.includes('Forschung') || program.name.includes('Innovation')) {
    if (!program.type.includes('playground') && !program.type.includes('combination')) {
      relevanceLevel = 4; // Excluded Programs
      successRate = 20;
    }
  }

  // Exclude research and education programs unless they're playground-related
  if (program.type && program.type.includes('research') && 
      !program.type.includes('playground') && !program.type.includes('combination')) {
    relevanceLevel = 4; // Excluded Programs
    successRate = 20;
  }

  // Cap success rate at 90%
  successRate = Math.min(successRate, 90);

  return {
    ...program,
    // New metadata fields for optimized logic
    relevanceLevel,
    isFederalStateSpecific,
    playgroundFundingHistory,
    programOrigin,
    implementationLevel,
    successRate,
    lastRelevanceUpdate: new Date().toISOString()
  };
}

/**
 * Add enhanced metadata to all programs in an array
 * @param {Array} programs - Array of funding programs
 * @returns {Array} Programs with enhanced metadata
 */
export function addEnhancedMetadataToAll(programs) {
  return programs.map(program => addEnhancedMetadata(program));
}

/**
 * Get enhanced metadata for a specific program without modifying the original
 * @param {Object} program - Original funding program object
 * @returns {Object} Just the metadata fields
 */
export function getEnhancedMetadata(program) {
  const enhanced = addEnhancedMetadata(program);
  return {
    relevanceLevel: enhanced.relevanceLevel,
    isFederalStateSpecific: enhanced.isFederalStateSpecific,
    playgroundFundingHistory: enhanced.playgroundFundingHistory,
    programOrigin: enhanced.programOrigin,
    implementationLevel: enhanced.implementationLevel,
    successRate: enhanced.successRate,
    lastRelevanceUpdate: enhanced.lastRelevanceUpdate
  };
}

/**
 * Validation error class for metadata validation failures
 */
export class MetadataValidationError extends Error {
  constructor(programId, field, value, reason) {
    super(`Metadata validation failed for program ${programId}, field '${field}': ${reason}`);
    this.programId = programId;
    this.field = field;
    this.value = value;
    this.reason = reason;
    this.name = 'MetadataValidationError';
  }
}

/**
 * Validate relevance level field
 * @param {*} value - Value to validate
 * @returns {Object} Validation result with isValid, sanitizedValue, and error
 */
export function validateRelevanceLevel(value) {
  if (value === undefined || value === null) {
    return {
      isValid: false,
      sanitizedValue: 3, // Default fallback to National level
      error: 'Relevance level is required',
      fallbackApplied: true
    };
  }

  const numValue = Number(value);
  if (isNaN(numValue) || !Number.isInteger(numValue)) {
    return {
      isValid: false,
      sanitizedValue: 3,
      error: 'Relevance level must be an integer',
      fallbackApplied: true
    };
  }

  if (numValue < 1 || numValue > 4) {
    return {
      isValid: false,
      sanitizedValue: Math.max(1, Math.min(4, numValue)), // Clamp to valid range
      error: 'Relevance level must be between 1 and 4',
      fallbackApplied: true
    };
  }

  return {
    isValid: true,
    sanitizedValue: numValue,
    error: null,
    fallbackApplied: false
  };
}

/**
 * Validate boolean fields
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} Validation result
 */
export function validateBooleanField(value, fieldName) {
  if (value === undefined || value === null) {
    return {
      isValid: false,
      sanitizedValue: false, // Default fallback to false
      error: `${fieldName} is required`,
      fallbackApplied: true
    };
  }

  if (typeof value === 'boolean') {
    return {
      isValid: true,
      sanitizedValue: value,
      error: null,
      fallbackApplied: false
    };
  }

  // Try to convert string values
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
      return {
        isValid: true,
        sanitizedValue: true,
        error: null,
        fallbackApplied: false
      };
    }
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
      return {
        isValid: true,
        sanitizedValue: false,
        error: null,
        fallbackApplied: false
      };
    }
  }

  return {
    isValid: false,
    sanitizedValue: false,
    error: `${fieldName} must be a boolean value`,
    fallbackApplied: true
  };
}

/**
 * Validate program origin field
 * @param {*} value - Value to validate
 * @returns {Object} Validation result
 */
export function validateProgramOrigin(value) {
  const validOrigins = ['federal', 'state', 'eu', 'mixed'];
  
  if (value === undefined || value === null) {
    return {
      isValid: false,
      sanitizedValue: 'federal', // Default fallback
      error: 'Program origin is required',
      fallbackApplied: true
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      sanitizedValue: 'federal',
      error: 'Program origin must be a string',
      fallbackApplied: true
    };
  }

  const lowerValue = value.toLowerCase();
  if (!validOrigins.includes(lowerValue)) {
    return {
      isValid: false,
      sanitizedValue: 'federal',
      error: `Program origin must be one of: ${validOrigins.join(', ')}`,
      fallbackApplied: true
    };
  }

  return {
    isValid: true,
    sanitizedValue: lowerValue,
    error: null,
    fallbackApplied: false
  };
}

/**
 * Validate implementation level field
 * @param {*} value - Value to validate
 * @returns {Object} Validation result
 */
export function validateImplementationLevel(value) {
  const validLevels = ['national', 'state', 'regional', 'local'];
  
  if (value === undefined || value === null) {
    return {
      isValid: false,
      sanitizedValue: 'national', // Default fallback
      error: 'Implementation level is required',
      fallbackApplied: true
    };
  }

  if (typeof value !== 'string') {
    return {
      isValid: false,
      sanitizedValue: 'national',
      error: 'Implementation level must be a string',
      fallbackApplied: true
    };
  }

  const lowerValue = value.toLowerCase();
  if (!validLevels.includes(lowerValue)) {
    return {
      isValid: false,
      sanitizedValue: 'national',
      error: `Implementation level must be one of: ${validLevels.join(', ')}`,
      fallbackApplied: true
    };
  }

  return {
    isValid: true,
    sanitizedValue: lowerValue,
    error: null,
    fallbackApplied: false
  };
}

/**
 * Validate success rate field
 * @param {*} value - Value to validate
 * @returns {Object} Validation result
 */
export function validateSuccessRate(value) {
  if (value === undefined || value === null) {
    return {
      isValid: false,
      sanitizedValue: 50, // Default fallback
      error: 'Success rate is required',
      fallbackApplied: true
    };
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return {
      isValid: false,
      sanitizedValue: 50,
      error: 'Success rate must be a number',
      fallbackApplied: true
    };
  }

  if (numValue < 0 || numValue > 100) {
    return {
      isValid: false,
      sanitizedValue: Math.max(0, Math.min(100, numValue)), // Clamp to valid range
      error: 'Success rate must be between 0 and 100',
      fallbackApplied: true
    };
  }

  return {
    isValid: true,
    sanitizedValue: numValue,
    error: null,
    fallbackApplied: false
  };
}

/**
 * Comprehensive validation for all metadata fields
 * @param {Object} program - Program to validate
 * @param {Object} options - Validation options
 * @returns {Object} Comprehensive validation result
 */
export function validateAllMetadataFields(program, options = {}) {
  const { strict = false, throwOnError = false } = options;
  
  if (!program || typeof program !== 'object') {
    const error = new MetadataValidationError('unknown', 'program', program, 'Program must be an object');
    if (throwOnError) throw error;
    return {
      isValid: false,
      errors: [error],
      sanitizedProgram: null,
      hasErrors: true,
      hasFallbacks: false
    };
  }

  const programId = program.id || program.name || 'unknown';
  const errors = [];
  const warnings = [];
  const sanitizedProgram = { ...program };
  let hasFallbacks = false;

  // Validate relevance level
  const relevanceLevelResult = validateRelevanceLevel(program.relevanceLevel);
  if (!relevanceLevelResult.isValid) {
    const error = new MetadataValidationError(programId, 'relevanceLevel', program.relevanceLevel, relevanceLevelResult.error);
    if (strict && throwOnError) throw error;
    errors.push(error);
  }
  sanitizedProgram.relevanceLevel = relevanceLevelResult.sanitizedValue;
  if (relevanceLevelResult.fallbackApplied) {
    hasFallbacks = true;
    warnings.push(`Applied fallback value for relevanceLevel: ${relevanceLevelResult.sanitizedValue}`);
  }

  // Validate isFederalStateSpecific
  const federalStateResult = validateBooleanField(program.isFederalStateSpecific, 'isFederalStateSpecific');
  if (!federalStateResult.isValid) {
    const error = new MetadataValidationError(programId, 'isFederalStateSpecific', program.isFederalStateSpecific, federalStateResult.error);
    if (strict && throwOnError) throw error;
    errors.push(error);
  }
  sanitizedProgram.isFederalStateSpecific = federalStateResult.sanitizedValue;
  if (federalStateResult.fallbackApplied) {
    hasFallbacks = true;
    warnings.push(`Applied fallback value for isFederalStateSpecific: ${federalStateResult.sanitizedValue}`);
  }

  // Validate playgroundFundingHistory
  const playgroundResult = validateBooleanField(program.playgroundFundingHistory, 'playgroundFundingHistory');
  if (!playgroundResult.isValid) {
    const error = new MetadataValidationError(programId, 'playgroundFundingHistory', program.playgroundFundingHistory, playgroundResult.error);
    if (strict && throwOnError) throw error;
    errors.push(error);
  }
  sanitizedProgram.playgroundFundingHistory = playgroundResult.sanitizedValue;
  if (playgroundResult.fallbackApplied) {
    hasFallbacks = true;
    warnings.push(`Applied fallback value for playgroundFundingHistory: ${playgroundResult.sanitizedValue}`);
  }

  // Validate programOrigin
  const originResult = validateProgramOrigin(program.programOrigin);
  if (!originResult.isValid) {
    const error = new MetadataValidationError(programId, 'programOrigin', program.programOrigin, originResult.error);
    if (strict && throwOnError) throw error;
    errors.push(error);
  }
  sanitizedProgram.programOrigin = originResult.sanitizedValue;
  if (originResult.fallbackApplied) {
    hasFallbacks = true;
    warnings.push(`Applied fallback value for programOrigin: ${originResult.sanitizedValue}`);
  }

  // Validate implementationLevel
  const implementationResult = validateImplementationLevel(program.implementationLevel);
  if (!implementationResult.isValid) {
    const error = new MetadataValidationError(programId, 'implementationLevel', program.implementationLevel, implementationResult.error);
    if (strict && throwOnError) throw error;
    errors.push(error);
  }
  sanitizedProgram.implementationLevel = implementationResult.sanitizedValue;
  if (implementationResult.fallbackApplied) {
    hasFallbacks = true;
    warnings.push(`Applied fallback value for implementationLevel: ${implementationResult.sanitizedValue}`);
  }

  // Validate successRate
  const successRateResult = validateSuccessRate(program.successRate);
  if (!successRateResult.isValid) {
    const error = new MetadataValidationError(programId, 'successRate', program.successRate, successRateResult.error);
    if (strict && throwOnError) throw error;
    errors.push(error);
  }
  sanitizedProgram.successRate = successRateResult.sanitizedValue;
  if (successRateResult.fallbackApplied) {
    hasFallbacks = true;
    warnings.push(`Applied fallback value for successRate: ${successRateResult.sanitizedValue}`);
  }

  // Add validation timestamp
  sanitizedProgram.lastValidation = new Date().toISOString();

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedProgram,
    hasErrors: errors.length > 0,
    hasFallbacks,
    errorCount: errors.length,
    warningCount: warnings.length
  };
}

/**
 * Validate that a program has all required metadata fields (legacy function, enhanced)
 * @param {Object} program - Program to validate
 * @returns {Object} Validation result with isValid boolean and missing fields array
 */
export function validateProgramMetadata(program) {
  const requiredFields = [
    'relevanceLevel',
    'isFederalStateSpecific', 
    'playgroundFundingHistory',
    'programOrigin',
    'implementationLevel',
    'successRate'
  ];

  const missingFields = requiredFields.filter(field => 
    program[field] === undefined || program[field] === null
  );

  // Enhanced validation using the new comprehensive validator
  const comprehensiveResult = validateAllMetadataFields(program, { strict: false });

  return {
    isValid: missingFields.length === 0 && comprehensiveResult.isValid,
    missingFields,
    hasAllRequired: missingFields.length === 0,
    validationErrors: comprehensiveResult.errors,
    sanitizedProgram: comprehensiveResult.sanitizedProgram,
    hasFallbacks: comprehensiveResult.hasFallbacks
  };
}

/**
 * Helper function to determine program origin based on name and characteristics
 * @param {Object} program - Funding program
 * @returns {string} Program origin: 'federal', 'state', 'eu', 'mixed'
 */
export function determineProgramOrigin(program) {
  if (program.name.includes('LEADER') || program.name.includes('ELER')) {
    return 'eu';
  }
  
  if (program.federalStates && program.federalStates.length === 1 && program.federalStates[0] !== 'all') {
    return 'state';
  }
  
  if (program.name.includes('Stiftung') || program.name.includes('LOTTO') || 
      program.name.includes('Aktion Mensch')) {
    return 'mixed';
  }
  
  return 'federal';
}

/**
 * Helper function to determine implementation level
 * @param {Object} program - Funding program
 * @returns {string} Implementation level: 'national', 'state', 'regional', 'local'
 */
export function determineImplementationLevel(program) {
  if (program.federalStates && program.federalStates.length === 1 && program.federalStates[0] !== 'all') {
    return 'state';
  }
  
  if (program.name.includes('Regional') || program.name.includes('LEADER')) {
    return 'regional';
  }
  
  if (program.name.includes('kommunal') || program.name.includes('Gemeinde')) {
    return 'local';
  }
  
  return 'national';
}

/**
 * Sanitize and validate a program with fallback strategies
 * @param {Object} program - Program to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized program with validation results
 */
export function sanitizeProgram(program, options = {}) {
  const { 
    applyFallbacks = true, 
    logWarnings = false,
    preserveOriginal = true 
  } = options;

  if (!program || typeof program !== 'object') {
    if (logWarnings) {
      console.warn('Invalid program object provided to sanitizeProgram');
    }
    return {
      sanitizedProgram: null,
      isValid: false,
      errors: ['Invalid program object'],
      applied: false
    };
  }

  // First, try to add enhanced metadata if missing
  let workingProgram = { ...program };
  
  // Check if program already has metadata, if not, generate it
  const hasMetadata = workingProgram.relevanceLevel !== undefined;
  if (!hasMetadata) {
    workingProgram = addEnhancedMetadata(workingProgram);
  }

  // Validate and sanitize all fields
  const validationResult = validateAllMetadataFields(workingProgram, { strict: false });

  if (applyFallbacks && validationResult.hasFallbacks) {
    workingProgram = validationResult.sanitizedProgram;
  }

  if (logWarnings && validationResult.warnings.length > 0) {
    console.warn(`Metadata warnings for program ${workingProgram.id || workingProgram.name}:`, validationResult.warnings);
  }

  return {
    sanitizedProgram: workingProgram,
    originalProgram: preserveOriginal ? program : null,
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
    hasFallbacks: validationResult.hasFallbacks,
    applied: true
  };
}

/**
 * Batch validate and sanitize multiple programs
 * @param {Array} programs - Array of programs to validate
 * @param {Object} options - Validation options
 * @returns {Object} Batch validation results
 */
export function validateProgramBatch(programs, options = {}) {
  const { 
    continueOnError = true, 
    maxErrors = 10,
    logProgress = false 
  } = options;

  if (!Array.isArray(programs)) {
    return {
      validPrograms: [],
      invalidPrograms: [],
      errors: ['Input must be an array of programs'],
      totalProcessed: 0,
      validCount: 0,
      invalidCount: 0,
      success: false
    };
  }

  const validPrograms = [];
  const invalidPrograms = [];
  const allErrors = [];
  let processedCount = 0;

  for (const program of programs) {
    try {
      const result = sanitizeProgram(program, options);
      
      if (result.isValid || result.hasFallbacks) {
        validPrograms.push(result.sanitizedProgram);
      } else {
        invalidPrograms.push({
          program: result.originalProgram || program,
          errors: result.errors,
          warnings: result.warnings
        });
        allErrors.push(...result.errors);
      }

      processedCount++;

      if (logProgress && processedCount % 10 === 0) {
        console.log(`Processed ${processedCount}/${programs.length} programs`);
      }

      // Stop if too many errors and not continuing on error
      if (!continueOnError && allErrors.length >= maxErrors) {
        break;
      }

    } catch (error) {
      const programId = program?.id || program?.name || 'unknown';
      const validationError = new MetadataValidationError(programId, 'general', null, error.message);
      allErrors.push(validationError);
      
      invalidPrograms.push({
        program,
        errors: [validationError],
        warnings: []
      });

      if (!continueOnError) {
        break;
      }
    }
  }

  return {
    validPrograms,
    invalidPrograms,
    errors: allErrors,
    totalProcessed: processedCount,
    validCount: validPrograms.length,
    invalidCount: invalidPrograms.length,
    success: allErrors.length === 0,
    hasPartialSuccess: validPrograms.length > 0
  };
}

/**
 * Create a program with safe defaults when metadata is completely missing
 * @param {Object} program - Original program
 * @returns {Object} Program with safe default metadata
 */
export function createProgramWithDefaults(program) {
  if (!program || typeof program !== 'object') {
    throw new MetadataValidationError('unknown', 'program', program, 'Cannot create defaults for invalid program');
  }

  const safeDefaults = {
    relevanceLevel: 3, // Default to National level
    isFederalStateSpecific: false,
    playgroundFundingHistory: false,
    programOrigin: 'federal',
    implementationLevel: 'national',
    successRate: 50,
    lastRelevanceUpdate: new Date().toISOString(),
    lastValidation: new Date().toISOString(),
    metadataSource: 'defaults'
  };

  return {
    ...program,
    ...safeDefaults
  };
}

/**
 * Recovery function for programs that fail validation
 * @param {Object} program - Failed program
 * @param {Array} errors - Validation errors
 * @returns {Object} Recovery result
 */
export function recoverFailedProgram(program, errors = []) {
  try {
    // Attempt to create a program with safe defaults
    const recoveredProgram = createProgramWithDefaults(program);
    
    // Try to infer some metadata from the original program
    if (program.federalStates && program.federalStates.length === 1 && program.federalStates[0] !== 'all') {
      recoveredProgram.isFederalStateSpecific = true;
      recoveredProgram.relevanceLevel = 1; // Core program
      recoveredProgram.programOrigin = 'state';
      recoveredProgram.implementationLevel = 'state';
    }

    // Check for playground relevance in name or type
    if (program.name && (program.name.includes('Spielplatz') || program.name.includes('playground'))) {
      recoveredProgram.playgroundFundingHistory = true;
      recoveredProgram.relevanceLevel = Math.min(recoveredProgram.relevanceLevel, 2);
    }

    if (program.type && program.type.includes('playground')) {
      recoveredProgram.playgroundFundingHistory = true;
    }

    return {
      recoveredProgram,
      success: true,
      recoveryMethod: 'defaults_with_inference',
      originalErrors: errors
    };

  } catch (recoveryError) {
    return {
      recoveredProgram: null,
      success: false,
      recoveryMethod: 'failed',
      originalErrors: errors,
      recoveryError: recoveryError.message
    };
  }
}

/**
 * Validate metadata consistency across related fields
 * @param {Object} program - Program to check for consistency
 * @returns {Object} Consistency validation result
 */
export function validateMetadataConsistency(program) {
  const inconsistencies = [];
  const warnings = [];

  if (!program || typeof program !== 'object') {
    return {
      isConsistent: false,
      inconsistencies: ['Invalid program object'],
      warnings: [],
      hasInconsistencies: true
    };
  }

  // Check relevance level vs federal state specificity
  if (program.relevanceLevel === 1 && !program.isFederalStateSpecific) {
    inconsistencies.push('Core programs (level 1) should be federal state specific');
  }

  if (program.isFederalStateSpecific && program.relevanceLevel > 2) {
    warnings.push('Federal state specific programs typically have relevance level 1 or 2');
  }

  // Check program origin vs implementation level consistency
  if (program.programOrigin === 'state' && program.implementationLevel === 'national') {
    inconsistencies.push('State programs should not have national implementation level');
  }

  if (program.programOrigin === 'federal' && program.implementationLevel === 'state' && program.relevanceLevel !== 2) {
    warnings.push('Federal programs with state implementation are typically supplementary (level 2)');
  }

  // Check success rate vs relevance level consistency
  if (program.relevanceLevel === 1 && program.successRate < 60) {
    warnings.push('Core programs typically have higher success rates');
  }

  if (program.relevanceLevel === 4 && program.successRate > 40) {
    warnings.push('Excluded programs typically have lower success rates');
  }

  // Check playground funding history vs relevance for playground projects
  if (program.playgroundFundingHistory && program.relevanceLevel > 2) {
    warnings.push('Programs with playground funding history typically have higher relevance');
  }

  return {
    isConsistent: inconsistencies.length === 0,
    inconsistencies,
    warnings,
    hasInconsistencies: inconsistencies.length > 0,
    hasWarnings: warnings.length > 0
  };
}

/**
 * Get validation summary for debugging and monitoring
 * @param {Object} validationResult - Result from validateAllMetadataFields
 * @returns {string} Human-readable validation summary
 */
export function getValidationSummary(validationResult) {
  if (!validationResult) {
    return 'No validation result provided';
  }

  const parts = [];
  
  if (validationResult.isValid) {
    parts.push('✓ All metadata fields are valid');
  } else {
    parts.push(`✗ ${validationResult.errorCount} validation errors found`);
  }

  if (validationResult.hasFallbacks) {
    parts.push(`⚠ ${validationResult.warningCount} fallback values applied`);
  }

  if (validationResult.errors && validationResult.errors.length > 0) {
    parts.push('Errors:');
    validationResult.errors.forEach(error => {
      parts.push(`  - ${error.field}: ${error.reason}`);
    });
  }

  if (validationResult.warnings && validationResult.warnings.length > 0) {
    parts.push('Warnings:');
    validationResult.warnings.forEach(warning => {
      parts.push(`  - ${warning}`);
    });
  }

  return parts.join('\n');
}