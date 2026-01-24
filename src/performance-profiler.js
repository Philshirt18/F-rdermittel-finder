/**
 * Performance Profiler for Optimized Funding Logic
 * 
 * This script profiles the complete filtering pipeline to identify
 * performance bottlenecks and ensure 500ms requirement is met.
 */

import { RelevanceEngine } from './services/RelevanceEngine.js';
import { RelevanceCache } from './services/RelevanceCache.js';
import { preFilterPrograms } from './services/preFilterService.js';
import { strictFilterProgramsWithRelevance } from './services/strictFilterService.js';
import { sortAndLimitByRelevance } from './services/sortService.js';
import { fundingPrograms } from './data/fundingPrograms.js';

class PerformanceProfiler {
  constructor() {
    this.results = [];
    this.cache = new RelevanceCache({
      maxSize: 2000,
      defaultTTL: 600000, // 10 minutes
      enableMetrics: true
    });
    this.relevanceEngine = new RelevanceEngine(fundingPrograms, this.cache);
  }

  /**
   * Profile a single operation
   */
  profileOperation(name, operation) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const result = operation();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const profile = {
      name,
      duration: endTime - startTime,
      memoryDelta: {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      },
      resultSize: Array.isArray(result) ? result.length : (result?.programs?.length || 0)
    };
    
    this.results.push(profile);
    return result;
  }

  /**
   * Profile complete filtering pipeline
   */
  profileCompletePipeline(criteria) {
    console.log(`\n🔍 Profiling complete pipeline for: ${JSON.stringify(criteria)}`);
    
    // Step 1: Pre-filtering
    const preFiltered = this.profileOperation('Pre-filtering', () => {
      return preFilterPrograms(criteria, fundingPrograms, this.relevanceEngine);
    });

    // Step 2: Strict filtering with relevance
    const strictFiltered = this.profileOperation('Strict filtering', () => {
      return strictFilterProgramsWithRelevance(preFiltered.programs, criteria, this.relevanceEngine);
    });

    // Step 3: Sorting and limiting
    const sorted = this.profileOperation('Sorting and limiting', () => {
      return sortAndLimitByRelevance(strictFiltered, criteria.federalState, 15);
    });

    // Calculate total time
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\n📊 Pipeline Results:`);
    console.log(`   Input programs: ${fundingPrograms.length}`);
    console.log(`   Pre-filtered: ${preFiltered.programs.length}`);
    console.log(`   Strict filtered: ${strictFiltered.length}`);
    console.log(`   Final results: ${sorted.length}`);
    console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Performance target: ${totalTime < 500 ? '✅ PASS' : '❌ FAIL'} (< 500ms)`);

    return {
      totalTime,
      results: sorted,
      breakdown: this.results.slice()
    };
  }

  /**
   * Profile relevance engine operations
   */
  profileRelevanceEngine() {
    console.log(`\n🧠 Profiling RelevanceEngine operations:`);
    
    // Classification
    this.profileOperation('Program classification', () => {
      return this.relevanceEngine.classifyPrograms();
    });

    // Cache operations
    this.profileOperation('Cache stats', () => {
      return this.cache.getStats();
    });

    // Federal state filtering
    this.profileOperation('Federal state filtering', () => {
      return this.relevanceEngine.getProgramsByRelevance(1, 'BY');
    });
  }

  /**
   * Profile different scenarios
   */
  profileScenarios() {
    const scenarios = [
      {
        name: 'Playground project in Bayern',
        criteria: {
          projectType: 'playground',
          federalState: 'BY',
          measures: ['newBuild', 'renovation'],
          budget: 50000
        }
      },
      {
        name: 'Calisthenics project in NRW',
        criteria: {
          projectType: 'calisthenics',
          federalState: 'NW',
          measures: ['newBuild'],
          budget: 100000
        }
      },
      {
        name: 'Combination project in Berlin',
        criteria: {
          projectType: 'combination',
          federalState: 'BE',
          measures: ['newBuild', 'renovation', 'accessibility'],
          budget: 200000
        }
      },
      {
        name: 'Large budget project in Baden-Württemberg',
        criteria: {
          projectType: 'playground',
          federalState: 'BW',
          measures: ['newBuild', 'renovation', 'accessibility', 'greening'],
          budget: 500000
        }
      }
    ];

    const scenarioResults = [];

    scenarios.forEach(scenario => {
      this.results = []; // Reset for each scenario
      const result = this.profileCompletePipeline(scenario.criteria);
      scenarioResults.push({
        ...scenario,
        performance: result
      });
    });

    return scenarioResults;
  }

  /**
   * Profile cache performance
   */
  profileCachePerformance() {
    console.log(`\n💾 Profiling cache performance:`);
    
    const criteria = {
      projectType: 'playground',
      federalState: 'BY',
      measures: ['newBuild']
    };

    // Cold run (no cache)
    this.results = [];
    const coldRun = this.profileCompletePipeline(criteria);
    const coldTime = coldRun.totalTime;

    // Warm run (with cache)
    this.results = [];
    const warmRun = this.profileCompletePipeline(criteria);
    const warmTime = warmRun.totalTime;

    console.log(`\n🌡️  Cache Performance:`);
    console.log(`   Cold run: ${coldTime.toFixed(2)}ms`);
    console.log(`   Warm run: ${warmTime.toFixed(2)}ms`);
    console.log(`   Improvement: ${((coldTime - warmTime) / coldTime * 100).toFixed(1)}%`);

    const cacheStats = this.cache.getStats();
    console.log(`   Cache hits: ${cacheStats.totalHits}`);
    console.log(`   Cache misses: ${cacheStats.totalMisses}`);
    console.log(`   Hit rate: ${cacheStats.hitRate.toFixed(1)}%`);

    return { coldTime, warmTime, cacheStats };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log(`\n📈 PERFORMANCE PROFILING REPORT`);
    console.log(`=====================================`);
    console.log(`Dataset size: ${fundingPrograms.length} programs`);
    console.log(`Target performance: < 500ms per query`);
    
    // Profile relevance engine
    this.profileRelevanceEngine();
    
    // Profile different scenarios
    const scenarioResults = this.profileScenarios();
    
    // Profile cache performance
    const cacheResults = this.profileCachePerformance();
    
    // Summary
    console.log(`\n📋 SUMMARY:`);
    const allTimes = scenarioResults.map(s => s.performance.totalTime);
    const avgTime = allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
    const maxTime = Math.max(...allTimes);
    const minTime = Math.min(...allTimes);
    
    console.log(`   Average query time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Fastest query: ${minTime.toFixed(2)}ms`);
    console.log(`   Slowest query: ${maxTime.toFixed(2)}ms`);
    console.log(`   Performance target: ${maxTime < 500 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (maxTime > 500) {
      console.log(`   ⚠️  Performance target not met. Consider:`);
      console.log(`      - Optimizing relevance classification`);
      console.log(`      - Improving cache hit rates`);
      console.log(`      - Reducing program dataset size`);
    } else {
      console.log(`   ✅ Performance target met!`);
      console.log(`   🚀 Consider further optimizations:`);
      console.log(`      - Pre-compute relevance classifications`);
      console.log(`      - Implement result pagination`);
      console.log(`      - Add query result caching`);
    }

    return {
      scenarios: scenarioResults,
      cache: cacheResults,
      summary: { avgTime, maxTime, minTime, passesTarget: maxTime < 500 }
    };
  }

  /**
   * Print detailed breakdown
   */
  printBreakdown() {
    if (this.results.length === 0) return;
    
    console.log(`\n🔍 Detailed Breakdown:`);
    this.results.forEach(result => {
      console.log(`   ${result.name}:`);
      console.log(`     Time: ${result.duration.toFixed(2)}ms`);
      console.log(`     Memory: ${(result.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`     Results: ${result.resultSize}`);
    });
  }
}

// Run profiling if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const profiler = new PerformanceProfiler();
  const report = profiler.generateReport();
  
  // Export results for further analysis
  console.log(`\n💾 Performance data available in profiler.results`);
}

export { PerformanceProfiler };