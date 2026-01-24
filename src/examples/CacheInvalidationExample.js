/**
 * Cache Invalidation System Example
 * 
 * This example demonstrates how to use the comprehensive cache invalidation system
 * implemented in RelevanceEngine and DatabaseUpdateService.
 */

import { RelevanceEngine } from '../services/RelevanceEngine.js';
import { RelevanceCache } from '../services/RelevanceCache.js';
import { DatabaseUpdateService } from '../services/DatabaseUpdateService.js';
import { EventEmitter } from 'events';

// Sample funding programs for demonstration
const samplePrograms = [
  {
    name: 'Bayern Spielplatzförderung',
    federalStates: ['BY'],
    type: 'playground',
    measures: ['Spielgeräte', 'Sicherheit'],
    relevanceLevel: 1,
    isFederalStateSpecific: true,
    playgroundFundingHistory: true
  },
  {
    name: 'LEADER Programm',
    federalStates: ['all'],
    type: 'rural_development',
    measures: ['Infrastruktur', 'Tourismus'],
    relevanceLevel: 2,
    isFederalStateSpecific: false,
    playgroundFundingHistory: false
  },
  {
    name: 'Bundesweite Sportförderung',
    federalStates: ['all'],
    type: 'sports',
    measures: ['Sportanlagen', 'Vereinsförderung'],
    relevanceLevel: 3,
    isFederalStateSpecific: false,
    playgroundFundingHistory: false
  }
];

async function demonstrateCacheInvalidation() {
  console.log('=== Cache Invalidation System Demo ===\n');

  // 1. Initialize the system
  console.log('1. Initializing cache and relevance engine...');
  const cache = new RelevanceCache({
    maxSize: 1000,
    defaultTTL: 60 * 60 * 1000, // 1 hour
    enableMetrics: true,
    enableMemoryMonitoring: true
  });

  const relevanceEngine = new RelevanceEngine(samplePrograms, cache);
  const databaseService = new DatabaseUpdateService(relevanceEngine);

  // 2. Pre-populate cache
  console.log('\n2. Pre-populating cache by classifying programs...');
  const classified = relevanceEngine.classifyPrograms();
  console.log(`Classified ${classified.length} programs`);
  console.log(`Cache size: ${cache.size()} entries`);

  // 3. Demonstrate selective cache invalidation
  console.log('\n3. Demonstrating selective cache invalidation...');
  const selectiveResult = relevanceEngine.invalidateCache(['Bayern Spielplatzförderung'], {
    invalidateRelated: true,
    autoRefresh: false
  });
  console.log('Selective invalidation result:', {
    success: selectiveResult.success,
    strategy: selectiveResult.strategy,
    invalidatedCount: selectiveResult.invalidatedCount
  });

  // 4. Demonstrate complete cache invalidation
  console.log('\n4. Demonstrating complete cache invalidation...');
  const completeResult = relevanceEngine.invalidateCache();
  console.log('Complete invalidation result:', {
    success: completeResult.success,
    strategy: completeResult.strategy,
    invalidatedCount: completeResult.invalidatedCount
  });
  console.log(`Cache size after complete invalidation: ${cache.size()}`);

  // 5. Demonstrate database update with automatic cache invalidation
  console.log('\n5. Demonstrating database update with automatic cache invalidation...');
  
  // Re-populate cache first
  relevanceEngine.classifyPrograms();
  console.log(`Cache size before update: ${cache.size()}`);

  const updatedProgram = {
    ...samplePrograms[0],
    measures: ['Spielgeräte', 'Sicherheit', 'Inklusion', 'Barrierefreiheit']
  };

  const updateResult = await databaseService.updateProgram(updatedProgram, {
    autoRefresh: true,
    invalidateRelated: true
  });

  console.log('Database update result:', {
    success: updateResult.success,
    programName: updateResult.programName,
    cacheInvalidated: updateResult.cacheInvalidation?.success
  });

  // 6. Demonstrate criteria-based invalidation
  console.log('\n6. Demonstrating criteria-based invalidation...');
  
  // Re-populate cache
  relevanceEngine.classifyPrograms();
  
  const criteriaResult = relevanceEngine.invalidateByCriteria({
    federalState: 'BY',
    relevanceLevel: 1
  });

  console.log('Criteria-based invalidation result:', {
    success: criteriaResult.success,
    strategy: criteriaResult.strategy,
    invalidatedCount: criteriaResult.invalidatedCount,
    criteria: criteriaResult.criteria
  });

  // 7. Demonstrate cache health monitoring
  console.log('\n7. Demonstrating cache health monitoring...');
  const health = relevanceEngine.getCacheHealthStatus();
  console.log('Cache health status:', {
    status: health.status,
    hitRate: health.cacheStats?.hitRate,
    memoryUsage: health.cacheStats?.memoryUsage,
    recommendationsCount: health.recommendations?.length
  });

  if (health.recommendations && health.recommendations.length > 0) {
    console.log('Cache recommendations:');
    health.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority}] ${rec.message}`);
    });
  }

  // 8. Demonstrate cache maintenance
  console.log('\n8. Demonstrating cache maintenance...');
  const maintenanceResult = relevanceEngine.performCacheMaintenance({
    cleanExpired: true,
    optimizeMemory: true,
    validateConsistency: true,
    refreshFrequent: false
  });

  console.log('Cache maintenance result:', {
    success: maintenanceResult.success,
    actionsPerformed: maintenanceResult.actions?.length,
    errors: maintenanceResult.errors?.length
  });

  if (maintenanceResult.actions && maintenanceResult.actions.length > 0) {
    console.log('Maintenance actions performed:');
    maintenanceResult.actions.forEach((action, index) => {
      console.log(`  ${index + 1}. ${action}`);
    });
  }

  // 9. Demonstrate bulk operations
  console.log('\n9. Demonstrating bulk operations...');
  const bulkPrograms = samplePrograms.map(program => ({
    ...program,
    lastUpdated: new Date().toISOString()
  }));

  const bulkResult = await databaseService.updateProgramsBulk(bulkPrograms, {
    refreshAfterBulk: true
  });

  console.log('Bulk update result:', {
    success: bulkResult.success,
    updatedCount: bulkResult.updatedCount,
    totalAttempted: bulkPrograms.length,
    cacheInvalidated: bulkResult.cacheInvalidation?.success
  });

  // 10. Demonstrate event-driven invalidation
  console.log('\n10. Demonstrating event-driven invalidation...');
  
  // Set up event listener
  const eventEmitter = new EventEmitter();
  let eventReceived = false;

  eventEmitter.on('relevance_cache_invalidated', (data) => {
    eventReceived = true;
    console.log('Cache invalidation event received:', {
      eventType: data.eventType,
      timestamp: data.timestamp
    });
  });

  // Initialize event listeners
  relevanceEngine.initializeEventListeners(eventEmitter);

  // Trigger an event
  relevanceEngine.onProgramsUpdated([samplePrograms[0]], {
    updateType: 'manual_demo'
  });

  // Wait a moment for event processing
  await new Promise(resolve => setTimeout(resolve, 10));
  console.log(`Event-driven invalidation working: ${eventReceived}`);

  // 11. Demonstrate scheduled maintenance
  console.log('\n11. Demonstrating scheduled maintenance...');
  
  const scheduleResult = databaseService.scheduleMaintenanceTask({
    interval: 5000, // 5 seconds for demo
    validateConsistency: true,
    maintenanceOptions: {
      cleanExpired: true,
      optimizeMemory: true
    }
  });

  console.log('Scheduled maintenance result:', {
    success: scheduleResult.success,
    interval: scheduleResult.schedule?.interval
  });

  // Stop the scheduled task after demo
  setTimeout(() => {
    const stopResult = databaseService.stopMaintenanceTask();
    console.log('Stopped scheduled maintenance:', stopResult.success);
  }, 1000);

  // 12. Demonstrate error handling
  console.log('\n12. Demonstrating error handling...');
  
  try {
    // Attempt to update a program that will cause an error
    const errorResult = await databaseService.updateProgram({
      name: 'ERROR_TEST', // This triggers a simulated error
      federalStates: ['BY']
    });

    console.log('Error handling result:', {
      success: errorResult.success,
      error: errorResult.error,
      hasRecovery: !!errorResult.cacheInvalidation?.recovery
    });
  } catch (error) {
    console.log('Caught error as expected:', error.message);
  }

  // 13. Final cache statistics
  console.log('\n13. Final cache statistics...');
  const finalStats = cache.getStats();
  console.log('Final cache stats:', {
    size: finalStats.size,
    hitRate: finalStats.hitRate,
    totalHits: finalStats.totalHits,
    totalMisses: finalStats.totalMisses,
    totalEvictions: finalStats.totalEvictions,
    memoryUsage: finalStats.memoryUsage
  });

  // 14. Service status
  console.log('\n14. Service status...');
  const serviceStatus = databaseService.getServiceStatus();
  console.log('Service status:', {
    relevanceEngineAvailable: serviceStatus.relevanceEngineAvailable,
    eventListeners: serviceStatus.eventListeners,
    cacheHealthStatus: serviceStatus.cacheHealth?.status
  });

  // Cleanup
  console.log('\n15. Cleaning up...');
  databaseService.destroy();
  console.log('Demo completed successfully!');
}

// Error handling wrapper
async function runDemo() {
  try {
    await demonstrateCacheInvalidation();
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules or run directly
export { demonstrateCacheInvalidation };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}