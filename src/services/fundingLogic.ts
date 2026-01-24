import config from "../data/foerderprogramme.json" with { type: "json" };

/*
Kiro Funding Engine
- löscht irrelevante Programme
- weist Kategorien zu
- sortiert automatisch
*/

const DELETE_LIST = config.delete;
const CORE = config.core;
const CONDITIONAL = config.conditional;


// ❌ komplett entfernen
export function removeDeleted(programs: any[]) {
  return programs.filter(
    p => !DELETE_LIST.some(d => d.name === p.name)
  );
}


// 🟢 / 🟡 Kategorie setzen
export function assignCategory(program: any) {
  if (CORE.some(p => p.name === program.name)) return "core";
  if (CONDITIONAL.some(p => p.name === program.name)) return "conditional";
  return "hidden";
}


// ✨ automatisch sortieren (core oben, conditional unten)
export function sortPrograms(programs: any[]) {
  const priority: Record<string, number> = {
    core: 1,        // 🟢 Kategorie A – Einzelförderung Spielplatz & Bewegungsanlagen
    conditional: 2, // 🟡 Kategorie B – Teil eines größeren Projekts (Städtebauförderung)
    hidden: 99      // Should not appear in results
  };

  return programs.sort((a, b) => {
    // Primary sort: category priority
    const categoryDiff = priority[a.category] - priority[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    
    // Secondary sort: state-specific programs first within same category
    const aIsStateSpecific = a.federalStates && a.federalStates.length === 1 && a.federalStates[0] !== 'all';
    const bIsStateSpecific = b.federalStates && b.federalStates.length === 1 && b.federalStates[0] !== 'all';
    
    if (aIsStateSpecific && !bIsStateSpecific) return -1;
    if (!aIsStateSpecific && bIsStateSpecific) return 1;
    
    // Tertiary sort: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}


// 🔥 alles in einem Schritt
export function processFundingPrograms(programs: any[]) {
  const cleaned = removeDeleted(programs);

  const categorized = cleaned.map(p => ({
    ...p,
    category: assignCategory(p)
  }));

  return sortPrograms(categorized);
}