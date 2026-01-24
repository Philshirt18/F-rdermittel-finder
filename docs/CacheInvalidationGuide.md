# Cache Invalidation System Guide

## Overview

The cache invalidation system provides comprehensive cache management for the RelevanceEngine, ensuring cache consistency during database updates and providing robust error handling and recovery mechanisms.

## Key Features

### 1. Selective Cache Invalidation
- Invalidate specific programs by name
- Invalidate related entries based on federal state, program type, or relevance level
- Pattern-based invalidation using regular expressions

### 2. Complete Cache Invalidation
- Clear entire cache when needed
- Automatic cleanup of internal classification maps
- Configurable auto-refresh after invalidation

### 3. Database Update Hooks
- Automatic cache invalidation on program updates
- Support for single and bulk operations
- Event-driven invalidation system

### 4. Error Handling and Recovery
- Graceful handling of cache failures
- Automatic recovery mechanisms
- Comprehensive error logging and reporting

### 5. Cache Health Monitoring
- Real-time cache health status
- Performance metrics and recommendations
- Memory usage monitoring

### 6. Scheduled Maintenance
- Automatic cleanup of expired entries
- Memory optimization
- Cache consistency validation

## Core Components

### RelevanceEngine Cache Methods

#### `invalidateCache(programNames, options)`
Main method for cache invalidation.

```javascript
// Selective invalidation
const result = relevanceEngine.invalidateCache(['Program Name'], {
  autoRefresh: true,
  invalidateRelated: true,
  invalidateByState: true,
  invalidateByType: true
});

// Complete invalidation
const result = relevanceEngine.invalidateCache();
```

**Options:**
- `autoRefresh`: Automatically refresh cache after invalidation
- `invalidateRelated`: Invalidate related entries
- `invalidateByState`: Invalidate by federal state
- `invalidateByType`: Invalidate by program type
- `attemptRecovery`: Attempt recovery on failures

#### `invalidateByCriteria(criteria)`
Criteria-based invalidation for advanced use cases.

```javascript
const result = relevanceEngine.invalidateByCriteria({
  federalState: 'BY',
  relevanceLevel: 1,
  programType: 'playground',
  olderThan: '2024-01-01',
  expiredOnly: true
});
```

#### `performCacheMaintenance(options)`
Comprehensive cache maintenance operations.

```javascript
const result = relevanceEngine.performCacheMaintenance({
  cleanExpired: true,
  optimizeMemory: true,
  refreshFrequent: true,
  validateConsistency: true
});
```

### Database Update Hooks

#### Program Update Hooks
```javascript
// Single program update
const result = relevanceEngine.onProgramsUpdated([updatedProgram], {
  autoRefresh: true,
  invalidateRelated: true,
  updateInternalData: true
});

// Program creation
const result = relevanceEngine.onProgramCreated(newProgram);

// Program deletion
const result = relevanceEngine.onProgramDeleted(programName);

// Bulk operations
const result = relevanceEngine.onBulkOperation('bulk_update', programs, {
  refreshAfterBulk: true
});
```

### DatabaseUpdateService Integration

The DatabaseUpdateService provides a high-level interface for database operations with automatic cache invalidation.

```javascript
import { DatabaseUpdateService } from './services/DatabaseUpdateService.js';

const databaseService = new DatabaseUpdateService(relevanceEngine);

// Update program with automatic cache invalidation
const result = await databaseService.updateProgram(updatedProgram, {
  autoRefresh: true,
  invalidateRelated: true
});

// Bulk update
const result = await databaseService.updateProgramsBulk(programs);

// Manual cache operations
const invalidationResult = databaseService.invalidateCache({
  programNames: ['Program Name'],
  options: { autoRefresh: true }
});

const health = databaseService.getCacheHealth();
const maintenanceResult = databaseService.performCacheMaintenance();
```

## Event-Driven Invalidation

### Setting Up Event Listeners

```javascript
import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();
relevanceEngine.initializeEventListeners(eventEmitter);

// Listen for cache invalidation events
eventEmitter.on('relevance_cache_invalidated', (data) => {
  console.log('Cache invalidated:', data.eventType, data.timestamp);
});
```

### Supported Events

- `funding_program_updated`: Single program update
- `funding_programs_bulk_updated`: Bulk program update
- `funding_program_created`: Program creation
- `funding_program_deleted`: Program deletion
- `cache_invalidation_requested`: Manual invalidation request
- `cache_refresh_requested`: Manual refresh request

## Cache Health Monitoring

### Health Status

```javascript
const health = relevanceEngine.getCacheHealthStatus();

console.log('Cache Status:', health.status); // 'healthy', 'warning', 'critical'
console.log('Hit Rate:', health.cacheStats.hitRate);
console.log('Memory Usage:', health.memoryUsagePercent);
console.log('Recommendations:', health.recommendations);
```

### Health Indicators

- **Healthy**: All metrics within normal ranges
- **Warning**: Some metrics approaching thresholds
- **Critical**: Immediate attention required

### Recommendations

The system provides automatic recommendations based on cache performance:

- Low hit rate → Adjust TTL settings or pre-warm cache
- High memory usage → Reduce cache size or increase cleanup frequency
- High eviction rate → Increase cache size or adjust TTL values
- Many expired entries → Run cleanup more frequently

## Scheduled Maintenance

### Setting Up Automatic Maintenance

```javascript
// Schedule daily maintenance
const schedule = {
  interval: 24 * 60 * 60 * 1000, // 24 hours
  criteria: { expiredOnly: true },
  maintenance: true,
  maintenanceOptions: {
    cleanExpired: true,
    optimizeMemory: true,
    validateConsistency: true
  }
};

relevanceEngine.scheduleInvalidation(schedule);

// Or use DatabaseUpdateService
databaseService.scheduleMaintenanceTask({
  interval: 24 * 60 * 60 * 1000,
  validateConsistency: true
});
```

### Stopping Scheduled Maintenance

```javascript
relevanceEngine.stopScheduledInvalidation();
// or
databaseService.stopMaintenanceTask();
```

## Error Handling

### Error Types

1. **Cache Unavailable**: Cache not initialized
2. **Cache Operation Failed**: Cache operation threw an error
3. **Database Update Failed**: Database operation failed
4. **Recovery Failed**: Recovery attempt unsuccessful

### Error Recovery

The system automatically attempts recovery on cache failures:

```javascript
const result = relevanceEngine.invalidateCache(programNames, {
  attemptRecovery: true // Default: true
});

if (!result.success && result.recovery) {
  console.log('Recovery attempted:', result.recovery.success);
  console.log('Recovery action:', result.recovery.action);
}
```

### Recovery Strategies

1. **Clear and Reinitialize**: Clear corrupted cache and reinitialize
2. **Fallback Mode**: Continue without cache
3. **Partial Recovery**: Recover what's possible, log failures

## Performance Considerations

### Cache Configuration

```javascript
const cache = new RelevanceCache({
  maxSize: 1000,              // Maximum number of entries
  defaultTTL: 60 * 60 * 1000, // 1 hour default TTL
  memoryThreshold: 50 * 1024 * 1024, // 50MB memory limit
  cleanupInterval: 5 * 60 * 1000,     // 5 minutes cleanup interval
  enableMetrics: true,         // Enable performance metrics
  enableMemoryMonitoring: true // Enable memory monitoring
});
```

### Best Practices

1. **Regular Maintenance**: Schedule regular cache maintenance
2. **Monitor Health**: Check cache health regularly
3. **Appropriate TTL**: Set TTL based on data update frequency
4. **Memory Limits**: Configure appropriate memory thresholds
5. **Error Handling**: Always handle cache operation errors
6. **Event Listeners**: Use event-driven invalidation for real-time updates

### Performance Metrics

- **Hit Rate**: Percentage of cache hits vs. misses
- **Memory Usage**: Current memory consumption
- **Access Time**: Average time for cache operations
- **Eviction Rate**: Frequency of cache evictions
- **Error Rate**: Frequency of cache errors

## Integration Examples

### Basic Integration

```javascript
import { RelevanceEngine } from './services/RelevanceEngine.js';
import { RelevanceCache } from './services/RelevanceCache.js';
import { DatabaseUpdateService } from './services/DatabaseUpdateService.js';

// Initialize
const cache = new RelevanceCache({ maxSize: 1000 });
const engine = new RelevanceEngine(programs, cache);
const dbService = new DatabaseUpdateService(engine);

// Use in application
const updateResult = await dbService.updateProgram(program);
const health = dbService.getCacheHealth();
```

### Advanced Integration with Events

```javascript
import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();
const engine = new RelevanceEngine(programs, cache);
engine.initializeEventListeners(eventEmitter);

// Set up monitoring
eventEmitter.on('relevance_cache_invalidated', (data) => {
  // Log to monitoring system
  console.log('Cache invalidated:', data);
});

// Set up health monitoring
setInterval(() => {
  const health = engine.getCacheHealthStatus();
  if (health.status !== 'healthy') {
    console.warn('Cache health issue:', health);
  }
}, 60000); // Check every minute
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce cache size
   - Increase cleanup frequency
   - Check for memory leaks

2. **Low Hit Rate**
   - Increase TTL values
   - Pre-warm cache with frequent queries
   - Check invalidation frequency

3. **Frequent Evictions**
   - Increase cache size
   - Optimize TTL values
   - Review access patterns

4. **Cache Inconsistency**
   - Run consistency validation
   - Check event listener setup
   - Verify invalidation logic

### Debugging

Enable detailed logging:

```javascript
const cache = new RelevanceCache({
  enableMetrics: true,
  enableMemoryMonitoring: true
});

// Check detailed stats
const stats = cache.getStats();
console.log('Detailed cache stats:', stats);

// Check health with recommendations
const health = engine.getCacheHealthStatus();
console.log('Health recommendations:', health.recommendations);
```

## API Reference

### RelevanceEngine Methods

- `invalidateCache(programNames?, options?)`: Main invalidation method
- `invalidateByCriteria(criteria)`: Criteria-based invalidation
- `performCacheMaintenance(options)`: Cache maintenance
- `getCacheHealthStatus()`: Get health status
- `scheduleInvalidation(schedule)`: Schedule automatic invalidation
- `stopScheduledInvalidation()`: Stop scheduled invalidation
- `onProgramsUpdated(programs, context)`: Program update hook
- `onProgramCreated(program, context)`: Program creation hook
- `onProgramDeleted(programName, context)`: Program deletion hook
- `onBulkOperation(type, programs, context)`: Bulk operation hook

### DatabaseUpdateService Methods

- `updateProgram(program, options)`: Update single program
- `updateProgramsBulk(programs, options)`: Bulk update
- `createProgram(program, options)`: Create program
- `deleteProgram(programName, options)`: Delete program
- `invalidateCache(criteria)`: Manual invalidation
- `refreshCache(programNames?, options?)`: Manual refresh
- `getCacheHealth()`: Get health status
- `performCacheMaintenance(options)`: Maintenance
- `scheduleMaintenanceTask(schedule)`: Schedule maintenance
- `stopMaintenanceTask()`: Stop maintenance
- `getServiceStatus()`: Get service status

This comprehensive cache invalidation system ensures optimal performance and data consistency for the RelevanceEngine while providing robust error handling and monitoring capabilities.