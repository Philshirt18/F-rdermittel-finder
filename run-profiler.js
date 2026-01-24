import { PerformanceProfiler } from './src/performance-profiler.js';

console.log('Starting performance profiling...');

const profiler = new PerformanceProfiler();
const report = profiler.generateReport();

console.log('\nProfiling complete!');