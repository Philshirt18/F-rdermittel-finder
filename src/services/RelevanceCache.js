/**
 * RelevanceCache - Advanced in-memory cache for relevance classifications
 * 
 * Provides comprehensive caching functionality for RelevanceEngine to avoid repeated
 * classification calculations and improve performance. Features:
 * - LRU (Least Recently Used) eviction strategy
 * - Cache versioning for data consistency
 * - Configurable expiration times
 * - Memory usage monitoring
 * - Thread-safe operations
 * - Pattern-based invalidation
 * - Performance metrics tracking
 */

export class RelevanceCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.accessOrder = new Map(); // Track access order for LRU eviction
    this.version = options.version || '1.0.0';
    this.defaultTTL = options.defaultTTL || 60 * 60 * 1000; // 1 hour default
    this.enableMetrics = options.enableMetrics !== false; // Default to true
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      totalMemoryUsage: 0,
      averageAccessTime: 0,
      lastCleanup: Date.now()
    };
    
    // Memory monitoring
    this.memoryThreshold = options.memoryThreshold || 50 * 1024 * 1024; // 50MB default
    this.enableMemoryMonitoring = options.enableMemoryMonitoring !== false;
    
    // Auto-cleanup interval (every 5 minutes by default)
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000;
    this.startAutoCleanup();
  }

  /**
   * Get cached classification result
   * @param {string} key - Cache key
   * @returns {Object|null} Cached classification or null if not found
   */
  get(key) {
    const startTime = this.enableMetrics ? performance.now() : 0;
    
    if (!this.cache.has(key)) {
      if (this.enableMetrics) {
        this.metrics.misses++;
        this.updateAverageAccessTime(performance.now() - startTime);
      }
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, Date.now());
    
    const cached = this.cache.get(key);
    
    // Check if cache entry is still valid (not expired)
    if (this.isCacheEntryValid(cached)) {
      if (this.enableMetrics) {
        this.metrics.hits++;
        this.updateAverageAccessTime(performance.now() - startTime);
      }
      
      // Update access count
      cached.accessCount = (cached.accessCount || 0) + 1;
      cached.lastAccessed = new Date();
      
      return cached;
    }

    // Remove expired entry
    this.delete(key);
    
    if (this.enableMetrics) {
      this.metrics.misses++;
      this.updateAverageAccessTime(performance.now() - startTime);
    }
    
    return null;
  }

  /**
   * Set classification result in cache
   * @param {string} key - Cache key
   * @param {Object} value - Classification result to cache
   * @param {number} ttl - Optional time-to-live in milliseconds
   */
  set(key, value, ttl = null) {
    // Ensure we don't exceed max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    // Check memory usage if monitoring is enabled
    if (this.enableMemoryMonitoring) {
      const estimatedSize = this.estimateObjectSize(value);
      if (this.metrics.totalMemoryUsage + estimatedSize > this.memoryThreshold) {
        this.performMemoryCleanup();
      }
      this.metrics.totalMemoryUsage += estimatedSize;
    }

    // Add cache metadata
    const effectiveTTL = ttl || this.defaultTTL;
    const cacheEntry = {
      ...value,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + effectiveTTL),
      cacheVersion: this.version,
      accessCount: (this.cache.has(key) ? this.cache.get(key).accessCount || 0 : 0) + 1,
      lastAccessed: new Date(),
      ttl: effectiveTTL,
      estimatedSize: this.enableMemoryMonitoring ? this.estimateObjectSize(value) : 0
    };

    this.cache.set(key, cacheEntry);
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Check if cache has a key
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists in cache
   */
  has(key) {
    return this.cache.has(key) && this.isCacheEntryValid(this.cache.get(key));
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key to delete
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (entry && this.enableMemoryMonitoring) {
      this.metrics.totalMemoryUsage -= entry.estimatedSize || 0;
    }
    
    this.accessOrder.delete(key);
    const deleted = this.cache.delete(key);
    
    if (deleted && this.enableMetrics) {
      this.metrics.evictions++;
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    
    if (this.enableMetrics) {
      this.metrics.totalMemoryUsage = 0;
      this.metrics.evictions += this.cache.size;
    }
  }

  /**
   * Get cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      version: this.version,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      totalEvictions: this.metrics.evictions,
      totalInvalidations: this.metrics.invalidations,
      totalAccessCount: entries.reduce((sum, entry) => sum + (entry.accessCount || 0), 0),
      averageAccessTime: this.metrics.averageAccessTime,
      memoryUsage: this.metrics.totalMemoryUsage,
      memoryThreshold: this.memoryThreshold,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.cachedAt.getTime())) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.cachedAt.getTime())) : null,
      expiredEntries: entries.filter(e => now > e.expiresAt.getTime()).length,
      lastCleanup: new Date(this.metrics.lastCleanup).toISOString()
    };
  }

  /**
   * Check if cache entry is still valid
   * @param {Object} entry - Cache entry
   * @returns {boolean} True if entry is valid
   */
  isCacheEntryValid(entry) {
    if (!entry || !entry.cachedAt) {
      return false;
    }

    // Check version compatibility
    if (entry.cacheVersion !== this.version) {
      return false;
    }

    // Check expiration using explicit expiresAt if available
    if (entry.expiresAt) {
      return Date.now() < entry.expiresAt.getTime();
    }

    // Fallback to TTL-based expiration
    const ttl = entry.ttl || this.defaultTTL;
    const age = Date.now() - entry.cachedAt.getTime();
    
    return age < ttl;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.size === 0) {
      return;
    }

    // Find the least recently accessed key
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param {RegExp|string} pattern - Pattern to match keys for invalidation
   * @returns {number} Number of entries invalidated
   */
  invalidateByPattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    
    if (this.enableMetrics) {
      this.metrics.invalidations += keysToDelete.length;
    }
    
    return keysToDelete.length;
  }

  /**
   * Export cache data for persistence (if needed)
   * @returns {Object} Serializable cache data
   */
  export() {
    const data = {
      version: this.version,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        value: {
          ...value,
          cachedAt: value.cachedAt.toISOString() // Convert Date to string
        }
      })),
      accessOrder: Array.from(this.accessOrder.entries())
    };

    return data;
  }

  /**
   * Import cache data from persistence (if needed)
   * @param {Object} data - Cache data to import
   */
  import(data) {
    if (!data || data.version !== this.version) {
      return; // Skip import if version mismatch
    }

    this.clear();
    this.maxSize = data.maxSize || this.maxSize;

    if (data.entries) {
      data.entries.forEach(({ key, value }) => {
        // Convert string back to Date
        if (value.cachedAt) {
          value.cachedAt = new Date(value.cachedAt);
        }
        
        // Only import if entry is still valid
        if (this.isCacheEntryValid(value)) {
          this.cache.set(key, value);
        }
      });
    }

    if (data.accessOrder) {
      data.accessOrder.forEach(([key, time]) => {
        if (this.cache.has(key)) {
          this.accessOrder.set(key, time);
        }
      });
    }
  }

  /**
   * Update average access time metric
   * @param {number} accessTime - Time taken for the access operation
   */
  updateAverageAccessTime(accessTime) {
    const totalOperations = this.metrics.hits + this.metrics.misses;
    if (totalOperations === 1) {
      this.metrics.averageAccessTime = accessTime;
    } else {
      this.metrics.averageAccessTime = 
        (this.metrics.averageAccessTime * (totalOperations - 1) + accessTime) / totalOperations;
    }
  }

  /**
   * Estimate memory usage of an object (rough approximation)
   * @param {Object} obj - Object to estimate size for
   * @returns {number} Estimated size in bytes
   */
  estimateObjectSize(obj) {
    const jsonString = JSON.stringify(obj);
    return jsonString.length * 2; // Rough estimate: 2 bytes per character
  }

  /**
   * Perform memory cleanup by removing expired entries and LRU eviction
   */
  performMemoryCleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheEntryValid(entry)) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    expiredKeys.forEach(key => this.delete(key));
    
    // If still over memory threshold, perform LRU eviction
    while (this.metrics.totalMemoryUsage > this.memoryThreshold && this.cache.size > 0) {
      this.evictLRU();
    }
    
    this.metrics.lastCleanup = now;
  }

  /**
   * Start automatic cleanup process
   */
  startAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.performMemoryCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup process
   */
  stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Set cache configuration
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.maxSize !== undefined) {
      this.maxSize = config.maxSize;
    }
    if (config.defaultTTL !== undefined) {
      this.defaultTTL = config.defaultTTL;
    }
    if (config.memoryThreshold !== undefined) {
      this.memoryThreshold = config.memoryThreshold;
    }
    if (config.cleanupInterval !== undefined) {
      this.cleanupInterval = config.cleanupInterval;
      this.startAutoCleanup(); // Restart with new interval
    }
    if (config.enableMetrics !== undefined) {
      this.enableMetrics = config.enableMetrics;
    }
    if (config.enableMemoryMonitoring !== undefined) {
      this.enableMemoryMonitoring = config.enableMemoryMonitoring;
    }
  }

  /**
   * Get cache health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    const stats = this.getStats();
    const memoryUsagePercent = (stats.memoryUsage / this.memoryThreshold) * 100;
    const sizeUsagePercent = (stats.size / this.maxSize) * 100;
    
    let status = 'healthy';
    const issues = [];
    
    if (memoryUsagePercent > 90) {
      status = 'critical';
      issues.push('Memory usage above 90%');
    } else if (memoryUsagePercent > 75) {
      status = 'warning';
      issues.push('Memory usage above 75%');
    }
    
    if (sizeUsagePercent > 90) {
      status = 'critical';
      issues.push('Cache size above 90%');
    } else if (sizeUsagePercent > 75) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push('Cache size above 75%');
    }
    
    if (stats.hitRate < 50) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push('Hit rate below 50%');
    }
    
    if (stats.expiredEntries > stats.size * 0.1) {
      issues.push('High number of expired entries');
    }
    
    return {
      status,
      issues,
      memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
      sizeUsagePercent: Math.round(sizeUsagePercent * 100) / 100,
      hitRate: stats.hitRate,
      expiredEntries: stats.expiredEntries,
      lastCheck: new Date().toISOString()
    };
  }

  /**
   * Bulk set multiple cache entries
   * @param {Array} entries - Array of {key, value, ttl} objects
   */
  setBulk(entries) {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Bulk get multiple cache entries
   * @param {Array} keys - Array of cache keys
   * @returns {Map} Map of key -> value for found entries
   */
  getBulk(keys) {
    const results = new Map();
    keys.forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    });
    return results;
  }

  /**
   * Get cache entries by prefix
   * @param {string} prefix - Key prefix to search for
   * @returns {Map} Map of matching key -> value pairs
   */
  getByPrefix(prefix) {
    const results = new Map();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        const value = this.get(key);
        if (value !== null) {
          results.set(key, value);
        }
      }
    }
    return results;
  }

  /**
   * Invalidate cache entries by program IDs (specific to RelevanceEngine)
   * @param {Array} programIds - Array of program IDs to invalidate
   * @returns {number} Number of entries invalidated
   */
  invalidateByProgramIds(programIds) {
    let invalidated = 0;
    programIds.forEach(programId => {
      // Match keys that contain the program ID
      const pattern = new RegExp(`.*${programId}.*`);
      invalidated += this.invalidateByPattern(pattern);
    });
    return invalidated;
  }

  /**
   * Warm up cache with pre-computed values
   * @param {Array} precomputedEntries - Array of {key, value, ttl} objects
   */
  warmUp(precomputedEntries) {
    console.log(`Warming up cache with ${precomputedEntries.length} entries`);
    this.setBulk(precomputedEntries);
  }

  /**
   * Cleanup and destroy cache instance
   */
  destroy() {
    this.stopAutoCleanup();
    
    // Clear cache before nullifying references
    if (this.cache) {
      this.cache.clear();
    }
    if (this.accessOrder) {
      this.accessOrder.clear();
    }
    
    this.cache = null;
    this.accessOrder = null;
    this.metrics = null;
  }
}