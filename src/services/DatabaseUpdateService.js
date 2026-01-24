/**
 * DatabaseUpdateService - Service for handling funding program database updates
 * 
 * This service demonstrates how to integrate cache invalidation with database operations.
 * It provides methods for updating, creating, and deleting funding programs while
 * automatically triggering appropriate cache invalidation.
 */

import { EventEmitter } from 'events';

export class DatabaseUpdateService extends EventEmitter {
  constructor(relevanceEngine) {
    super();
    this.relevanceEngine = relevanceEngine;
    
    // Initialize event listeners for cache invalidation
    if (relevanceEngine) {
      relevanceEngine.initializeEventListeners(this);
    }
  }

  /**
   * Update a single funding program
   * @param {Object} updatedProgram - The updated program data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateProgram(updatedProgram, options = {}) {
    const result = {
      success: true,
      programName: updatedProgram.name,
      timestamp: new Date().toISOString(),
      cacheInvalidation: null
    };

    try {
      // Simulate database update operation
      await this.performDatabaseUpdate(updatedProgram);
      
      // Emit event for cache invalidation
      this.emit('funding_program_updated', {
        program: updatedProgram,
        context: {
          updateType: 'single',
          autoRefresh: options.autoRefresh !== false,
          invalidateRelated: options.invalidateRelated !== false,
          updateInternalData: true,
          ...options
        }
      });

      // If relevance engine is available, get invalidation result
      if (this.relevanceEngine) {
        result.cacheInvalidation = this.relevanceEngine.onProgramsUpdated([updatedProgram], {
          updateType: 'single',
          autoRefresh: options.autoRefresh !== false,
          invalidateRelated: options.invalidateRelated !== false,
          updateInternalData: true
        });
      }

      result.message = `Program '${updatedProgram.name}' updated successfully`;

    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.message = `Failed to update program '${updatedProgram.name}': ${error.message}`;
    }

    return result;
  }

  /**
   * Update multiple funding programs in bulk
   * @param {Array} updatedPrograms - Array of updated program data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateProgramsBulk(updatedPrograms, options = {}) {
    const result = {
      success: true,
      updatedCount: 0,
      failedPrograms: [],
      timestamp: new Date().toISOString(),
      cacheInvalidation: null
    };

    try {
      // Simulate bulk database update
      const updateResults = await Promise.allSettled(
        updatedPrograms.map(program => this.performDatabaseUpdate(program))
      );

      // Process results
      updateResults.forEach((updateResult, index) => {
        if (updateResult.status === 'fulfilled') {
          result.updatedCount++;
        } else {
          result.failedPrograms.push({
            program: updatedPrograms[index].name,
            error: updateResult.reason.message
          });
        }
      });

      // Only emit event for successfully updated programs
      const successfulPrograms = updatedPrograms.filter((_, index) => 
        updateResults[index].status === 'fulfilled'
      );

      if (successfulPrograms.length > 0) {
        this.emit('funding_programs_bulk_updated', {
          programs: successfulPrograms,
          context: {
            updateType: 'bulk',
            totalAttempted: updatedPrograms.length,
            successfulCount: successfulPrograms.length,
            refreshAfterBulk: options.refreshAfterBulk !== false,
            ...options
          }
        });

        // Get cache invalidation result
        if (this.relevanceEngine) {
          result.cacheInvalidation = this.relevanceEngine.onBulkOperation(
            'bulk_update',
            successfulPrograms,
            {
              totalAttempted: updatedPrograms.length,
              successfulCount: successfulPrograms.length,
              refreshAfterBulk: options.refreshAfterBulk !== false
            }
          );
        }
      }

      result.success = result.failedPrograms.length === 0;
      result.message = `Bulk update completed: ${result.updatedCount}/${updatedPrograms.length} programs updated successfully`;

    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.message = `Bulk update failed: ${error.message}`;
    }

    return result;
  }

  /**
   * Create a new funding program
   * @param {Object} newProgram - The new program data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Creation result
   */
  async createProgram(newProgram, options = {}) {
    const result = {
      success: true,
      programName: newProgram.name,
      timestamp: new Date().toISOString(),
      cacheInvalidation: null
    };

    try {
      // Simulate database creation
      await this.performDatabaseCreate(newProgram);
      
      // Emit event for cache invalidation
      this.emit('funding_program_created', {
        program: newProgram,
        context: {
          creationType: 'single',
          ...options
        }
      });

      // Get cache invalidation result
      if (this.relevanceEngine) {
        result.cacheInvalidation = this.relevanceEngine.onProgramCreated(newProgram, {
          creationType: 'single'
        });
      }

      result.message = `Program '${newProgram.name}' created successfully`;

    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.message = `Failed to create program '${newProgram.name}': ${error.message}`;
    }

    return result;
  }

  /**
   * Delete a funding program
   * @param {string} programName - Name of the program to delete
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteProgram(programName, options = {}) {
    const result = {
      success: true,
      programName,
      timestamp: new Date().toISOString(),
      cacheInvalidation: null
    };

    try {
      // Simulate database deletion
      await this.performDatabaseDelete(programName);
      
      // Emit event for cache invalidation
      this.emit('funding_program_deleted', {
        programName,
        context: {
          deletionType: 'single',
          ...options
        }
      });

      // Get cache invalidation result
      if (this.relevanceEngine) {
        result.cacheInvalidation = this.relevanceEngine.onProgramDeleted(programName, {
          deletionType: 'single'
        });
      }

      result.message = `Program '${programName}' deleted successfully`;

    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.message = `Failed to delete program '${programName}': ${error.message}`;
    }

    return result;
  }

  /**
   * Trigger manual cache invalidation
   * @param {Object} criteria - Invalidation criteria
   * @returns {Object} Invalidation result
   */
  invalidateCache(criteria = {}) {
    if (!this.relevanceEngine) {
      return {
        success: false,
        error: 'RelevanceEngine not available',
        message: 'Cache invalidation requires RelevanceEngine instance'
      };
    }

    // Emit cache invalidation event
    this.emit('cache_invalidation_requested', {
      programNames: criteria.programNames,
      options: criteria.options || {}
    });

    // Perform invalidation
    if (criteria.programNames) {
      return this.relevanceEngine.invalidateCache(criteria.programNames, criteria.options);
    } else if (criteria.criteria) {
      return this.relevanceEngine.invalidateByCriteria(criteria.criteria);
    } else {
      return this.relevanceEngine.invalidateCache(null, criteria.options);
    }
  }

  /**
   * Trigger cache refresh
   * @param {Array} programNames - Programs to refresh (null for all)
   * @param {Object} options - Refresh options
   * @returns {Object} Refresh result
   */
  refreshCache(programNames = null, options = {}) {
    if (!this.relevanceEngine) {
      return {
        success: false,
        error: 'RelevanceEngine not available',
        message: 'Cache refresh requires RelevanceEngine instance'
      };
    }

    // Emit cache refresh event
    this.emit('cache_refresh_requested', {
      programNames,
      options
    });

    // Perform refresh
    try {
      this.relevanceEngine.performAutoRefresh(programNames, options);
      return {
        success: true,
        message: `Cache refresh completed for ${programNames ? programNames.length + ' programs' : 'all programs'}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Cache refresh failed: ${error.message}`
      };
    }
  }

  /**
   * Get cache health status
   * @returns {Object} Cache health information
   */
  getCacheHealth() {
    if (!this.relevanceEngine) {
      return {
        status: 'unavailable',
        message: 'RelevanceEngine not available'
      };
    }

    return this.relevanceEngine.getCacheHealthStatus();
  }

  /**
   * Perform cache maintenance
   * @param {Object} options - Maintenance options
   * @returns {Object} Maintenance result
   */
  performCacheMaintenance(options = {}) {
    if (!this.relevanceEngine) {
      return {
        success: false,
        error: 'RelevanceEngine not available',
        message: 'Cache maintenance requires RelevanceEngine instance'
      };
    }

    return this.relevanceEngine.performCacheMaintenance(options);
  }

  /**
   * Simulate database update operation
   * @param {Object} program - Program to update
   * @returns {Promise<void>}
   */
  async performDatabaseUpdate(program) {
    // Simulate async database operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Simulate potential database errors
    if (program.name === 'ERROR_TEST') {
      throw new Error('Simulated database error');
    }
    
    // In a real implementation, this would update the actual database
    console.log(`Database: Updated program '${program.name}'`);
  }

  /**
   * Simulate database create operation
   * @param {Object} program - Program to create
   * @returns {Promise<void>}
   */
  async performDatabaseCreate(program) {
    // Simulate async database operation
    await new Promise(resolve => setTimeout(resolve, 15));
    
    // Simulate potential database errors
    if (program.name === 'DUPLICATE_TEST') {
      throw new Error('Program already exists');
    }
    
    console.log(`Database: Created program '${program.name}'`);
  }

  /**
   * Simulate database delete operation
   * @param {string} programName - Program name to delete
   * @returns {Promise<void>}
   */
  async performDatabaseDelete(programName) {
    // Simulate async database operation
    await new Promise(resolve => setTimeout(resolve, 8));
    
    // Simulate potential database errors
    if (programName === 'NOT_FOUND_TEST') {
      throw new Error('Program not found');
    }
    
    console.log(`Database: Deleted program '${programName}'`);
  }

  /**
   * Schedule automatic cache maintenance
   * @param {Object} schedule - Maintenance schedule
   * @returns {Object} Schedule result
   */
  scheduleMaintenanceTask(schedule = {}) {
    if (!this.relevanceEngine) {
      return {
        success: false,
        error: 'RelevanceEngine not available'
      };
    }

    const maintenanceSchedule = {
      interval: schedule.interval || 24 * 60 * 60 * 1000, // 24 hours
      criteria: schedule.criteria || { expiredOnly: true },
      maintenance: true,
      maintenanceOptions: {
        cleanExpired: true,
        optimizeMemory: true,
        validateConsistency: schedule.validateConsistency !== false,
        ...schedule.maintenanceOptions
      }
    };

    this.relevanceEngine.scheduleInvalidation(maintenanceSchedule);

    return {
      success: true,
      message: 'Maintenance task scheduled successfully',
      schedule: maintenanceSchedule
    };
  }

  /**
   * Stop scheduled maintenance
   * @returns {Object} Stop result
   */
  stopMaintenanceTask() {
    if (!this.relevanceEngine) {
      return {
        success: false,
        error: 'RelevanceEngine not available'
      };
    }

    this.relevanceEngine.stopScheduledInvalidation();

    return {
      success: true,
      message: 'Scheduled maintenance stopped'
    };
  }

  /**
   * Get comprehensive service status
   * @returns {Object} Service status information
   */
  getServiceStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      relevanceEngineAvailable: !!this.relevanceEngine,
      eventListeners: this.listenerCount('funding_program_updated') > 0
    };

    if (this.relevanceEngine) {
      status.cacheHealth = this.relevanceEngine.getCacheHealthStatus();
      status.invalidationMetrics = this.relevanceEngine.getInvalidationMetrics();
    }

    return status;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      this.removeAllListeners();
    } catch (error) {
      // Ignore cleanup errors
    }
    
    if (this.relevanceEngine) {
      try {
        this.relevanceEngine.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}