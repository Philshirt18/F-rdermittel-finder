/**
 * Simple integration test to verify RelevanceEngine integration
 */

import { RelevanceEngine } from './src/services/RelevanceEngine.js';
import { RelevanceCache } from './src/services/RelevanceCache.js';
import { fundingPrograms } from './src/data/fundingPrograms.js';
import { preFilterPrograms } from './src/services/preFilterService.js';
import { strictFilterProgramsWithRelevance } from './src/services/strictFilterService.js';
import { sortAndLimitByRelevance } from './src/services/sortService.js';

console.log('🧪 Testing RelevanceEngine Integration...\n');

try {
  // Initialize RelevanceEngine
  console.log('1️⃣ Initializing RelevanceEngine...');
  const cache = new RelevanceCache({
    maxSize: 1000,
    defaultTTL: 60 * 60 * 1000,
    enableMetrics: true
  });
  
  const engine = new RelevanceEngine(fundingPrograms, cache);
  console.log(`✅ RelevanceEngine initialized with ${fundingPrograms.length} programs`);
  
  // Test classification
  console.log('\n2️⃣ Testing program classification...');
  const classifiedPrograms = engine.classifyPrograms();
  const stats = engine.getClassificationStats();
  console.log(`✅ Classified ${classifiedPrograms.length} programs`);
  console.log('📊 Classification stats:', stats);
  
  // Test enhanced filtering flow
  console.log('\n3️⃣ Testing enhanced filtering flow...');
  const testProjectData = {
    federalState: 'BY',
    projectType: 'playground',
    einsatzbereich: 'oeffentlich-kommunal',
    foerderschwerpunkt: ['allgemeine-foerderung', 'kinder-jugend'],
    measures: ['newBuild']
  };
  
  // Step 1: Pre-filter
  const preFilterResult = preFilterPrograms(
    {
      federalState: testProjectData.federalState,
      projectType: testProjectData.projectType,
      measures: testProjectData.measures
    },
    fundingPrograms,
    engine
  );
  console.log(`✅ Pre-filter: ${preFilterResult.programs.length} programs (excluded Level 4)`);
  
  // Step 2: Strict filter with relevance
  const strictFiltered = strictFilterProgramsWithRelevance(
    testProjectData.einsatzbereich,
    testProjectData.federalState,
    preFilterResult.programs,
    engine,
    {
      foerderschwerpunkt: testProjectData.foerderschwerpunkt,
      measures: testProjectData.measures
    }
  );
  console.log(`✅ Strict filter with relevance: ${strictFiltered.length} programs`);
  
  // Step 3: Sort and limit
  const finalResults = sortAndLimitByRelevance(
    strictFiltered,
    testProjectData.federalState,
    15
  );
  console.log(`✅ Final sorted and limited: ${finalResults.length} programs`);
  
  // Display top 3 results
  console.log('\n4️⃣ Top 3 results:');
  finalResults.slice(0, 3).forEach((program, index) => {
    console.log(`${index + 1}. ${program.name}`);
    console.log(`   Relevance Level: ${program.relevanceLevel || 'N/A'}`);
    console.log(`   Federal State Specific: ${program.isFederalStateSpecific || false}`);
    console.log(`   Playground History: ${program.playgroundFundingHistory || false}`);
    console.log(`   Relevance Score: ${program.relevanceScore || 'N/A'}`);
    console.log('');
  });
  
  // Test cache performance
  console.log('5️⃣ Testing cache performance...');
  const cacheStats = cache.getStats();
  console.log('📈 Cache stats:', {
    size: cacheStats.size,
    hitRate: cacheStats.hitRate,
    totalHits: cacheStats.totalHits,
    totalMisses: cacheStats.totalMisses
  });
  
  console.log('\n🎉 Integration test completed successfully!');
  
} catch (error) {
  console.error('❌ Integration test failed:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}