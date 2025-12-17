import { fundingPrograms } from './src/data/fundingPrograms.js';

console.log(`Total programs: ${fundingPrograms.length}`);
console.log('\nPrograms by state:');

const byState = {};
fundingPrograms.forEach(p => {
  p.federalStates.forEach(state => {
    if (!byState[state]) byState[state] = [];
    byState[state].push(p.name);
  });
});

Object.keys(byState).sort().forEach(state => {
  console.log(`\n${state}: ${byState[state].length} programs`);
  byState[state].slice(0, 5).forEach(name => console.log(`  - ${name}`));
  if (byState[state].length > 5) {
    console.log(`  ... and ${byState[state].length - 5} more`);
  }
});

console.log('\n\nSample programs with sources:');
fundingPrograms.slice(0, 10).forEach(p => {
  console.log(`\n${p.name}`);
  console.log(`  Source: ${p.source}`);
  console.log(`  States: ${p.federalStates.join(', ')}`);
  console.log(`  Types: ${p.type.join(', ')}`);
});
