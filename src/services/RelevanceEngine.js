/**
 * RelevanceEngine - Core component for funding program relevance classification
 * 
 * This engine classifies all funding programs into 4 relevance levels:
 * Level 1 (Core): Bundeslandspezifische Programme
 * Level 2 (Supplementary): Landesumgesetzte Bundes-/EU-Programme  
 * Level 3 (National): Echte bundesweite Programme
 * Level 4 (Excluded): Unrelevante Programme
 */

import { RelevanceClassifier } from './RelevanceClassifier.js';
import { FederalStatePrioritizer } from './FederalStatePrioritizer.js';
import { addEnhancedMetadata, addEnhancedMetadataToAll, validateProgramMetadata } from '../data/metadataHelpers.js';

export class RelevanceEngine {
  constructor(fundingPrograms, cache = null) {
    this.programs = fundingPrograms || [];
    this.cache = cache;
    this.classifier = new RelevanceClassifier();
    this.prioritizer = new FederalStatePrioritizer();
    this.classifiedPrograms = new Map();
    
    // Automatically enhance programs with metadata on initialization
    this.enhancedPrograms = addEnhancedMetadataToAll(this.programs);
  }

  /**
   * Classify all programs into relevance levels
   * @returns {Array} Programs with relevance level metadata
   */
  classifyPrograms() {
    // Use the enhanced programs that already have metadata
    const classifiedPrograms = this.enhancedPrograms.map(program => {
      // Check cache first
      const cacheKey = this.generateCacheKey(program);
      if (this.cache && this.cache.has(cacheKey)) {
        return {
          ...program,
          ...this.cache.get(cacheKey)
        };
      }

      // The program already has enhanced metadata from initialization
      // But we can still use the classifier for validation or override
      const classifierLevel = this.classifier.classifyProgram(program);
      const classifierFederalState = this.classifier.isFederalStateSpecific(program);
      const classifierPlayground = this.classifier.isPlaygroundRelevant(program);

      // Use classifier results if they differ significantly from metadata
      const finalClassification = {
        relevanceLevel: program.relevanceLevel || classifierLevel,
        isFederalStateSpecific: program.isFederalStateSpecific !== undefined ? program.isFederalStateSpecific : classifierFederalState,
        playgroundFundingHistory: program.playgroundFundingHistory !== undefined ? program.playgroundFundingHistory : classifierPlayground,
        programOrigin: program.programOrigin || 'federal',
        implementationLevel: program.implementationLevel || 'national',
        successRate: program.successRate || 50,
        lastRelevanceUpdate: program.lastRelevanceUpdate || new Date().toISOString()
      };

      // Cache the result
      if (this.cache) {
        this.cache.set(cacheKey, finalClassification);
      }

      // Store in internal map for quick access
      const enhancedProgram = {
        ...program,
        ...finalClassification
      };
      
      this.classifiedPrograms.set(program.name, enhancedProgram);

      return enhancedProgram;
    });

    return classifiedPrograms;
  }

  /**
   * Get programs by specific relevance level
   * @param {number} level - Relevance level (1-4)
   * @param {string} federalState - Optional federal state filter
   * @returns {Array} Programs matching the relevance level
   */
  getProgramsByRelevance(level, federalState = null) {
    const classified = this.classifyPrograms();
    
    let filtered = classified.filter(program => program.relevanceLevel === level);
    
    if (federalState) {
      filtered = filtered.filter(program => 
        program.federalStates && 
        (program.federalStates.includes(federalState) || program.federalStates.includes('all'))
      );
    }
    
    return filtered;
  }

  /**
   * Calculate relevance score for a program based on user criteria
   * @param {Object} program - Funding program
   * @param {Object} userCriteria - User selection criteria
   * @returns {number} Relevance score (0-100)
   */
  calculateRelevanceScore(program, userCriteria) {
    // First classify the program to get its relevance level
    const classified = this.classifyPrograms().find(p => p.name === program.name) || program;
    
    let score = 0;
    
    // Base score from relevance level (higher level = lower score)
    const levelScores = { 1: 50, 2: 40, 3: 30, 4: 0 };
    score += levelScores[classified.relevanceLevel] || 0;
    
    // Federal state match bonus
    if (userCriteria.federalState && classified.isFederalStateSpecific) {
      if (program.federalStates && program.federalStates.includes(userCriteria.federalState)) {
        score += 30;
      }
    }
    
    // Project type match bonus
    if (userCriteria.projectType && program.type && program.type.includes(userCriteria.projectType)) {
      score += 25;
    }
    
    // Playground funding history bonus
    if (userCriteria.projectType === 'playground' && classified.playgroundFundingHistory) {
      score += 20;
    }
    
    // Measures match bonus
    if (userCriteria.measures && program.measures) {
      const matchingMeasures = userCriteria.measures.filter(measure => 
        program.measures.includes(measure)
      );
      score += (matchingMeasures.length / userCriteria.measures.length) * 15;
    }
    
    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get relevance level for a specific program
   * @param {Object} program - Funding program
   * @returns {number} Relevance level (1-4)
   */
  getRelevanceLevel(program) {
    // First check if we have it in our classified programs map
    if (this.classifiedPrograms.has(program.name)) {
      return this.classifiedPrograms.get(program.name).relevanceLevel;
    }
    
    // If not cached, classify and cache it
    const level = this.classifier.classifyProgram(program);
    const isFederalStateSpecific = this.classifier.isFederalStateSpecific(program);
    const playgroundFundingHistory = this.classifier.isPlaygroundRelevant(program);
    
    const classification = {
      ...program,
      relevanceLevel: level,
      isFederalStateSpecific,
      playgroundFundingHistory,
      lastRelevanceUpdate: new Date()
    };
    
    // Store in internal map for quick access
    this.classifiedPrograms.set(program.name, classification);
    
    return level;
  }

  /**
   * Generate cache key for a program
   * @param {Object} program - Funding program
   * @returns {string} Cache key
   */
  generateCacheKey(program) {
    // Use program name and a hash of key properties for cache key
    const keyProps = {
      name: program.name,
      federalStates: program.federalStates,
      type: program.type,
      measures: program.measures
    };
    
    return `${program.name}_${JSON.stringify(keyProps)}`;
  }

  /**
   * Invalidate cache for specific programs or all programs
   * @param {Array} programNames - Optional array of program names to invalidate
   * @param {Object} options - Invalidation options
   * @returns {Object} Invalidation result with statistics
   */
  invalidateCache(programNames = null, options = {}) {
    const result = {
      success: true,
      invalidatedCount: 0,
      errors: [],
      strategy: programNames ? 'selective' : 'complete',
      timestamp: new Date().toISOString()
    };

    if (!this.cache) {
      result.success = false;
      result.errors.push('Cache not available');
      return result;
    }

    try {
      if (programNames) {
        // Selective invalidation
        result.invalidatedCount = this.performSelectiveInvalidation(programNames, options);
      } else {
        // Complete invalidation
        result.invalidatedCount = this.performCompleteInvalidation(options);
      }

      // Trigger auto-refresh if requested
      if (options.autoRefresh) {
        this.performAutoRefresh(programNames, options);
      }

      // Log invalidation event
      this.logInvalidationEvent(result);

    } catch (error) {
      result.success = false;
      result.errors.push(`Cache invalidation failed: ${error.message}`);
      
      // Attempt recovery
      if (options.attemptRecovery !== false) {
        this.attemptCacheRecovery(error, result);
      }
    }

    return result;
  }

  /**
   * Perform selective cache invalidation for specific programs
   * @param {Array} programNames - Program names to invalidate
   * @param {Object} options - Invalidation options
   * @returns {number} Number of entries invalidated
   */
  performSelectiveInvalidation(programNames, options = {}) {
    let invalidatedCount = 0;
    const errors = [];

    programNames.forEach(name => {
      try {
        const program = this.programs.find(p => p.name === name);
        if (program) {
          const cacheKey = this.generateCacheKey(program);
          
          // Invalidate from cache
          if (this.cache.delete(cacheKey)) {
            invalidatedCount++;
          }

          // Invalidate from internal classification map
          this.classifiedPrograms.delete(name);

          // Invalidate related entries if pattern matching is enabled
          if (options.invalidateRelated) {
            const relatedCount = this.invalidateRelatedEntries(program, options);
            invalidatedCount += relatedCount;
          }
        }
      } catch (error) {
        console.warn(`Failed to invalidate cache for program ${name}:`, error);
        errors.push(error);
      }
    });

    // If there were errors and we're not in graceful mode, throw the first error
    if (errors.length > 0 && options.gracefulErrors !== true) {
      throw errors[0];
    }

    return invalidatedCount;
  }

  /**
   * Perform complete cache invalidation
   * @param {Object} options - Invalidation options
   * @returns {number} Number of entries invalidated
   */
  performCompleteInvalidation(options = {}) {
    const initialSize = this.cache.size();
    
    // Clear cache
    this.cache.clear();
    
    // Clear internal classification map
    this.classifiedPrograms.clear();

    return initialSize;
  }

  /**
   * Invalidate cache entries related to a specific program
   * @param {Object} program - The program to find related entries for
   * @param {Object} options - Invalidation options
   * @returns {number} Number of related entries invalidated
   */
  invalidateRelatedEntries(program, options = {}) {
    let invalidatedCount = 0;

    // Invalidate by federal state if program is state-specific
    if (program.federalStates && options.invalidateByState) {
      program.federalStates.forEach(state => {
        if (state !== 'all') {
          const pattern = new RegExp(`.*${state}.*`);
          invalidatedCount += this.cache.invalidateByPattern(pattern);
        }
      });
    }

    // Invalidate by program type if specified
    if (program.type && options.invalidateByType) {
      const pattern = new RegExp(`.*${program.type}.*`);
      invalidatedCount += this.cache.invalidateByPattern(pattern);
    }

    // Invalidate by relevance level if specified
    if (program.relevanceLevel && options.invalidateByRelevanceLevel) {
      const pattern = new RegExp(`.*level_${program.relevanceLevel}.*`);
      invalidatedCount += this.cache.invalidateByPattern(pattern);
    }

    return invalidatedCount;
  }

  /**
   * Perform automatic cache refresh after invalidation
   * @param {Array} programNames - Programs to refresh (null for all)
   * @param {Object} options - Refresh options
   */
  performAutoRefresh(programNames = null, options = {}) {
    try {
      if (programNames) {
        // Refresh specific programs
        programNames.forEach(name => {
          const program = this.programs.find(p => p.name === name);
          if (program) {
            // Trigger re-classification which will populate cache
            this.getRelevanceLevel(program);
          }
        });
      } else if (options.refreshAll) {
        // Refresh all programs
        this.classifyPrograms();
      }
    } catch (error) {
      console.warn('Auto-refresh failed:', error);
    }
  }

  /**
   * Attempt to recover from cache failures
   * @param {Error} error - The original error
   * @param {Object} result - The invalidation result to update
   */
  attemptCacheRecovery(error, result) {
    try {
      // Clear corrupted cache
      if (this.cache) {
        this.cache.clear();
      }

      // Reinitialize cache if possible
      if (this.cache && typeof this.cache.configure === 'function') {
        this.cache.configure({
          maxSize: 1000,
          defaultTTL: 60 * 60 * 1000
        });
      }

      result.recovery = {
        attempted: true,
        success: true,
        action: 'cache_cleared_and_reinitialized'
      };

    } catch (recoveryError) {
      result.recovery = {
        attempted: true,
        success: false,
        error: recoveryError.message
      };
    }
  }

  /**
   * Log invalidation events for monitoring and debugging
   * @param {Object} result - Invalidation result
   */
  logInvalidationEvent(result) {
    const logEntry = {
      timestamp: result.timestamp,
      strategy: result.strategy,
      invalidatedCount: result.invalidatedCount,
      success: result.success,
      errors: result.errors
    };

    // In a real application, this would go to a proper logging system
    if (result.errors.length > 0) {
      console.warn('Cache invalidation completed with errors:', logEntry);
    } else {
      console.log('Cache invalidation completed successfully:', logEntry);
    }
  }

  /**
   * Get statistics about program classification
   * @returns {Object} Classification statistics
   */
  getClassificationStats() {
    const classified = this.classifyPrograms();
    
    const stats = {
      total: classified.length,
      core: classified.filter(p => p.relevanceLevel === 1).length,
      supplementary: classified.filter(p => p.relevanceLevel === 2).length,
      national: classified.filter(p => p.relevanceLevel === 3).length,
      excluded: classified.filter(p => p.relevanceLevel === 4).length,
      federalStateSpecific: classified.filter(p => p.isFederalStateSpecific).length,
      playgroundRelevant: classified.filter(p => p.playgroundFundingHistory).length
    };
    
    return stats;
  }

  /**
   * Prioritize programs by federal state using FederalStatePrioritizer
   * @param {Array} programs - Programs to prioritize
   * @param {string} userFederalState - User's federal state code
   * @returns {Array} Programs sorted by state priority
   */
  prioritizeByFederalState(programs, userFederalState) {
    return this.prioritizer.prioritizeByState(programs, userFederalState);
  }

  /**
   * Get programs filtered by state specificity
   * @param {string} userFederalState - User's federal state code
   * @param {string} specificityLevel - 'state-specific', 'multi-state', 'national'
   * @returns {Array} Filtered programs
   */
  getProgramsByStateSpecificity(userFederalState, specificityLevel) {
    const classified = this.classifyPrograms();
    return this.prioritizer.getProgramsByStateSpecificity(classified, userFederalState, specificityLevel);
  }

  /**
   * Get comprehensive statistics including state-specific data
   * @param {string} userFederalState - User's federal state code
   * @returns {Object} Enhanced statistics
   */
  getEnhancedStats(userFederalState) {
    const classified = this.classifyPrograms();
    const basicStats = this.getClassificationStats();
    const stateStats = this.prioritizer.getStateStatistics(classified, userFederalState);
    
    return {
      ...basicStats,
      stateSpecific: stateStats
    };
  }

  /**
   * Check if a program matches the user's federal state
   * @param {Object} program - Funding program
   * @param {string} userFederalState - User's federal state code
   * @returns {boolean} True if program matches state
   */
  matchesFederalState(program, userFederalState) {
    return this.prioritizer.matchesFederalState(program, userFederalState);
  }

  /**
   * Get all programs with enhanced metadata
   * @returns {Array} Programs with all metadata fields populated
   */
  getEnhancedPrograms() {
    return this.enhancedPrograms;
  }

  /**
   * Validate metadata for all programs
   * @returns {Object} Validation summary with details
   */
  validateAllProgramsMetadata() {
    const results = this.enhancedPrograms.map(program => ({
      name: program.name,
      validation: validateProgramMetadata(program)
    }));

    const validPrograms = results.filter(r => r.validation.isValid);
    const invalidPrograms = results.filter(r => !r.validation.isValid);

    return {
      total: results.length,
      valid: validPrograms.length,
      invalid: invalidPrograms.length,
      validationRate: (validPrograms.length / results.length) * 100,
      invalidPrograms: invalidPrograms.map(p => ({
        name: p.name,
        missingFields: p.validation.missingFields
      }))
    };
  }

  /**
   * Database update hooks for automatic cache invalidation
   */

  /**
   * Hook for when funding programs are updated in the database
   * @param {Array} updatedPrograms - Programs that were updated
   * @param {Object} updateContext - Context about the update operation
   * @returns {Object} Invalidation result
   */
  onProgramsUpdated(updatedPrograms, updateContext = {}) {
    const programNames = updatedPrograms.map(p => p.name);
    
    const invalidationOptions = {
      autoRefresh: updateContext.autoRefresh !== false,
      invalidateRelated: updateContext.invalidateRelated !== false,
      invalidateByState: updateContext.invalidateByState !== false,
      invalidateByType: updateContext.invalidateByType !== false,
      attemptRecovery: true
    };

    const result = this.invalidateCache(programNames, invalidationOptions);
    
    // Update internal programs array if provided
    if (updateContext.updateInternalData) {
      this.updateInternalPrograms(updatedPrograms);
    }

    // Emit invalidation event for external listeners
    this.emitInvalidationEvent('programs_updated', {
      programNames,
      updateContext,
      invalidationResult: result
    });

    return result;
  }

  /**
   * Hook for when a single program is created
   * @param {Object} newProgram - The newly created program
   * @param {Object} context - Creation context
   * @returns {Object} Invalidation result
   */
  onProgramCreated(newProgram, context = {}) {
    // Add to internal programs array
    this.programs.push(newProgram);
    this.enhancedPrograms = addEnhancedMetadataToAll(this.programs);

    // Invalidate related cache entries
    const invalidationOptions = {
      autoRefresh: true,
      invalidateRelated: true,
      invalidateByState: true,
      invalidateByType: true
    };

    // For new programs, we might want to invalidate broader cache areas
    const result = this.invalidateCache(null, invalidationOptions);

    this.emitInvalidationEvent('program_created', {
      programName: newProgram.name,
      context,
      invalidationResult: result
    });

    return result;
  }

  /**
   * Hook for when a program is deleted
   * @param {string} programName - Name of the deleted program
   * @param {Object} context - Deletion context
   * @returns {Object} Invalidation result
   */
  onProgramDeleted(programName, context = {}) {
    // Remove from internal programs array
    this.programs = this.programs.filter(p => p.name !== programName);
    this.enhancedPrograms = this.enhancedPrograms.filter(p => p.name !== programName);

    // Invalidate cache for the deleted program
    const result = this.invalidateCache([programName], {
      invalidateRelated: true,
      invalidateByState: true,
      invalidateByType: true
    });

    this.emitInvalidationEvent('program_deleted', {
      programName,
      context,
      invalidationResult: result
    });

    return result;
  }

  /**
   * Hook for bulk database operations
   * @param {string} operationType - Type of operation ('bulk_update', 'bulk_delete', 'bulk_create')
   * @param {Array} affectedPrograms - Programs affected by the operation
   * @param {Object} context - Operation context
   * @returns {Object} Invalidation result
   */
  onBulkOperation(operationType, affectedPrograms, context = {}) {
    let result;

    switch (operationType) {
      case 'bulk_update':
        result = this.onProgramsUpdated(affectedPrograms, {
          ...context,
          autoRefresh: false // Defer refresh for bulk operations
        });
        break;
      
      case 'bulk_delete':
        const programNames = affectedPrograms.map(p => p.name);
        this.programs = this.programs.filter(p => !programNames.includes(p.name));
        this.enhancedPrograms = this.enhancedPrograms.filter(p => !programNames.includes(p.name));
        result = this.invalidateCache(programNames);
        break;
      
      case 'bulk_create':
        this.programs.push(...affectedPrograms);
        this.enhancedPrograms = addEnhancedMetadataToAll(this.programs);
        result = this.invalidateCache(null); // Full invalidation for bulk creates
        break;
      
      default:
        result = { success: false, errors: [`Unknown bulk operation: ${operationType}`] };
    }

    // Perform refresh after bulk operation if requested
    if (context.refreshAfterBulk !== false) {
      this.performAutoRefresh(null, { refreshAll: true });
    }

    this.emitInvalidationEvent('bulk_operation', {
      operationType,
      affectedCount: affectedPrograms.length,
      context,
      invalidationResult: result
    });

    return result;
  }

  /**
   * Update internal programs array with new data
   * @param {Array} updatedPrograms - Programs with updated data
   */
  updateInternalPrograms(updatedPrograms) {
    updatedPrograms.forEach(updatedProgram => {
      const index = this.programs.findIndex(p => p.name === updatedProgram.name);
      if (index !== -1) {
        this.programs[index] = { ...this.programs[index], ...updatedProgram };
      }
    });

    // Regenerate enhanced programs
    this.enhancedPrograms = addEnhancedMetadataToAll(this.programs);
  }

  /**
   * Event-driven invalidation system
   */

  /**
   * Initialize event listeners for database changes
   * @param {Object} eventEmitter - Event emitter instance (e.g., EventEmitter, custom event system)
   */
  initializeEventListeners(eventEmitter) {
    if (!eventEmitter) return;

    this.eventEmitter = eventEmitter;

    // Listen for database update events
    eventEmitter.on('funding_program_updated', (data) => {
      this.onProgramsUpdated([data.program], data.context);
    });

    eventEmitter.on('funding_programs_bulk_updated', (data) => {
      this.onBulkOperation('bulk_update', data.programs, data.context);
    });

    eventEmitter.on('funding_program_created', (data) => {
      this.onProgramCreated(data.program, data.context);
    });

    eventEmitter.on('funding_program_deleted', (data) => {
      this.onProgramDeleted(data.programName, data.context);
    });

    eventEmitter.on('funding_programs_bulk_deleted', (data) => {
      this.onBulkOperation('bulk_delete', data.programs, data.context);
    });

    // Listen for cache-specific events
    eventEmitter.on('cache_invalidation_requested', (data) => {
      this.invalidateCache(data.programNames, data.options);
    });

    eventEmitter.on('cache_refresh_requested', (data) => {
      this.performAutoRefresh(data.programNames, data.options);
    });
  }

  /**
   * Emit invalidation event for external listeners
   * @param {string} eventType - Type of invalidation event
   * @param {Object} eventData - Event data
   */
  emitInvalidationEvent(eventType, eventData) {
    if (this.eventEmitter) {
      this.eventEmitter.emit('relevance_cache_invalidated', {
        eventType,
        timestamp: new Date().toISOString(),
        ...eventData
      });
    }

    // Also emit specific event type
    if (this.eventEmitter) {
      this.eventEmitter.emit(`relevance_cache_${eventType}`, eventData);
    }
  }

  /**
   * Manual cache invalidation with advanced options
   * @param {Object} criteria - Invalidation criteria
   * @returns {Object} Invalidation result
   */
  invalidateByCriteria(criteria) {
    const result = {
      success: true,
      invalidatedCount: 0,
      errors: [],
      strategy: 'criteria-based',
      timestamp: new Date().toISOString(),
      criteria
    };

    try {
      // Invalidate by federal state
      if (criteria.federalState) {
        const pattern = new RegExp(`.*${criteria.federalState}.*`);
        result.invalidatedCount += this.cache.invalidateByPattern(pattern);
      }

      // Invalidate by relevance level
      if (criteria.relevanceLevel) {
        const pattern = new RegExp(`.*level_${criteria.relevanceLevel}.*`);
        result.invalidatedCount += this.cache.invalidateByPattern(pattern);
      }

      // Invalidate by program type
      if (criteria.programType) {
        const pattern = new RegExp(`.*${criteria.programType}.*`);
        result.invalidatedCount += this.cache.invalidateByPattern(pattern);
      }

      // Invalidate by age (older than specified date)
      if (criteria.olderThan) {
        const cutoffDate = new Date(criteria.olderThan);
        let ageInvalidatedCount = 0;
        
        for (const [key, entry] of this.cache.cache.entries()) {
          if (entry.cachedAt && entry.cachedAt < cutoffDate) {
            this.cache.delete(key);
            ageInvalidatedCount++;
          }
        }
        
        result.invalidatedCount += ageInvalidatedCount;
      }

      // Invalidate expired entries
      if (criteria.expiredOnly) {
        const now = Date.now();
        let expiredCount = 0;
        
        for (const [key, entry] of this.cache.cache.entries()) {
          if (!this.cache.isCacheEntryValid(entry)) {
            this.cache.delete(key);
            expiredCount++;
          }
        }
        
        result.invalidatedCount += expiredCount;
      }

      this.logInvalidationEvent(result);

    } catch (error) {
      result.success = false;
      result.errors.push(`Criteria-based invalidation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get programs by metadata criteria
   * @param {Object} criteria - Metadata criteria to filter by
   * @returns {Array} Filtered programs
   */
  getProgramsByMetadata(criteria) {
    const enhanced = this.getEnhancedPrograms();
    
    return enhanced.filter(program => {
      if (criteria.relevanceLevel && program.relevanceLevel !== criteria.relevanceLevel) {
        return false;
      }
      if (criteria.isFederalStateSpecific !== undefined && program.isFederalStateSpecific !== criteria.isFederalStateSpecific) {
        return false;
      }
      if (criteria.playgroundFundingHistory !== undefined && program.playgroundFundingHistory !== criteria.playgroundFundingHistory) {
        return false;
      }
      if (criteria.programOrigin && program.programOrigin !== criteria.programOrigin) {
        return false;
      }
      if (criteria.implementationLevel && program.implementationLevel !== criteria.implementationLevel) {
        return false;
      }
      if (criteria.minSuccessRate && program.successRate < criteria.minSuccessRate) {
        return false;
      }
      return true;
    });
  }

  /**
   * Error handling and monitoring for cache operations
   */

  /**
   * Get cache health and invalidation statistics
   * @returns {Object} Comprehensive cache health information
   */
  getCacheHealthStatus() {
    if (!this.cache) {
      return {
        status: 'unavailable',
        message: 'Cache not initialized',
        timestamp: new Date().toISOString()
      };
    }

    const cacheHealth = this.cache.getHealthStatus();
    const cacheStats = this.cache.getStats();
    
    return {
      ...cacheHealth,
      cacheStats,
      engineStats: {
        totalPrograms: this.programs.length,
        enhancedPrograms: this.enhancedPrograms.length,
        classifiedPrograms: this.classifiedPrograms.size,
        hasEventEmitter: !!this.eventEmitter
      },
      recommendations: this.generateCacheRecommendations(cacheHealth, cacheStats)
    };
  }

  /**
   * Generate recommendations based on cache health
   * @param {Object} health - Cache health status
   * @param {Object} stats - Cache statistics
   * @returns {Array} Array of recommendations
   */
  generateCacheRecommendations(health, stats) {
    const recommendations = [];

    if (health.hitRate < 50) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Low cache hit rate detected. Consider pre-warming cache or adjusting TTL settings.'
      });
    }

    if (health.memoryUsagePercent > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'High memory usage. Consider reducing cache size or implementing more aggressive cleanup.'
      });
    }

    if (stats.expiredEntries > stats.size * 0.2) {
      recommendations.push({
        type: 'maintenance',
        priority: 'medium',
        message: 'High number of expired entries. Consider running cache cleanup more frequently.'
      });
    }

    if (stats.totalEvictions > stats.totalHits) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        message: 'High eviction rate. Consider increasing cache size or adjusting TTL values.'
      });
    }

    return recommendations;
  }

  /**
   * Perform cache maintenance and optimization
   * @param {Object} options - Maintenance options
   * @returns {Object} Maintenance result
   */
  performCacheMaintenance(options = {}) {
    const result = {
      success: true,
      actions: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Clean expired entries
      if (options.cleanExpired !== false) {
        const expiredCount = this.invalidateByCriteria({ expiredOnly: true }).invalidatedCount;
        result.actions.push(`Cleaned ${expiredCount} expired entries`);
      }

      // Optimize memory usage
      if (options.optimizeMemory) {
        this.cache.performMemoryCleanup();
        result.actions.push('Performed memory optimization');
      }

      // Refresh frequently accessed entries
      if (options.refreshFrequent) {
        const frequentEntries = this.getFrequentlyAccessedEntries();
        this.performAutoRefresh(frequentEntries.map(e => e.programName));
        result.actions.push(`Refreshed ${frequentEntries.length} frequently accessed entries`);
      }

      // Validate cache consistency
      if (options.validateConsistency) {
        const inconsistencies = this.validateCacheConsistency();
        if (inconsistencies.length > 0) {
          result.actions.push(`Found and fixed ${inconsistencies.length} cache inconsistencies`);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Maintenance failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get frequently accessed cache entries for optimization
   * @returns {Array} Array of frequently accessed entries
   */
  getFrequentlyAccessedEntries() {
    if (!this.cache || !this.cache.cache) return [];

    const entries = Array.from(this.cache.cache.entries())
      .map(([key, value]) => ({
        key,
        programName: this.extractProgramNameFromKey(key),
        accessCount: value.accessCount || 0,
        lastAccessed: value.lastAccessed
      }))
      .filter(entry => entry.accessCount > 5) // Threshold for "frequent"
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 20); // Top 20 most accessed

    return entries;
  }

  /**
   * Extract program name from cache key
   * @param {string} key - Cache key
   * @returns {string} Program name
   */
  extractProgramNameFromKey(key) {
    // Cache keys are in format: "programName_hash"
    return key.split('_')[0];
  }

  /**
   * Validate cache consistency with current program data
   * @returns {Array} Array of inconsistencies found and fixed
   */
  validateCacheConsistency() {
    const inconsistencies = [];

    if (!this.cache) return inconsistencies;

    // Check for cached entries of programs that no longer exist
    for (const [key, entry] of this.cache.cache.entries()) {
      const programName = this.extractProgramNameFromKey(key);
      const programExists = this.programs.some(p => p.name === programName);
      
      if (!programExists) {
        this.cache.delete(key);
        inconsistencies.push({
          type: 'orphaned_entry',
          key,
          programName,
          action: 'deleted'
        });
      }
    }

    // Check for programs that should be cached but aren't
    const frequentlyUsedPrograms = this.getFrequentlyUsedPrograms();
    frequentlyUsedPrograms.forEach(program => {
      const key = this.generateCacheKey(program);
      if (!this.cache.has(key)) {
        // Re-classify to populate cache
        this.getRelevanceLevel(program);
        inconsistencies.push({
          type: 'missing_entry',
          programName: program.name,
          action: 'recached'
        });
      }
    });

    return inconsistencies;
  }

  /**
   * Get programs that are frequently used (placeholder - would be based on actual usage metrics)
   * @returns {Array} Array of frequently used programs
   */
  getFrequentlyUsedPrograms() {
    // In a real implementation, this would be based on actual usage analytics
    // For now, return programs that are likely to be frequently accessed
    return this.programs.filter(program => 
      program.relevanceLevel <= 2 || // Core and Supplementary programs
      program.playgroundFundingHistory || // Playground-relevant programs
      program.isFederalStateSpecific // State-specific programs
    ).slice(0, 50); // Limit to top 50
  }

  /**
   * Schedule automatic cache invalidation
   * @param {Object} schedule - Invalidation schedule configuration
   */
  scheduleInvalidation(schedule) {
    if (this.invalidationTimer) {
      clearInterval(this.invalidationTimer);
    }

    const interval = schedule.interval || 24 * 60 * 60 * 1000; // Default: 24 hours
    
    this.invalidationTimer = setInterval(() => {
      const criteria = schedule.criteria || { expiredOnly: true };
      this.invalidateByCriteria(criteria);
      
      if (schedule.maintenance) {
        this.performCacheMaintenance(schedule.maintenanceOptions);
      }
    }, interval);
  }

  /**
   * Stop scheduled invalidation
   */
  stopScheduledInvalidation() {
    if (this.invalidationTimer) {
      clearInterval(this.invalidationTimer);
      this.invalidationTimer = null;
    }
  }

  /**
   * Get comprehensive invalidation history and metrics
   * @returns {Object} Invalidation metrics and history
   */
  getInvalidationMetrics() {
    // In a real implementation, this would track historical data
    // For now, return current cache metrics
    const cacheStats = this.cache ? this.cache.getStats() : {};
    
    return {
      cacheStats,
      recommendations: this.generateCacheRecommendations(
        this.cache ? this.cache.getHealthStatus() : {},
        cacheStats
      ),
      lastMaintenance: this.lastMaintenanceTime || null,
      scheduledInvalidation: !!this.invalidationTimer
    };
  }

  /**
   * Cleanup resources when engine is destroyed
   */
  destroy() {
    this.stopScheduledInvalidation();
    
    if (this.cache && typeof this.cache.destroy === 'function') {
      try {
        this.cache.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (this.eventEmitter) {
      try {
        // Remove all listeners
        if (typeof this.eventEmitter.removeAllListeners === 'function') {
          this.eventEmitter.removeAllListeners();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (this.classifiedPrograms) {
      this.classifiedPrograms.clear();
    }
  }
}