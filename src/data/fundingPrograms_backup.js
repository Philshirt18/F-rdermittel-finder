/**
 * Helper function to add enhanced metadata to funding programs
 * This function populates the new fields required for the optimized funding logic
 */
function addEnhancedMetadata(program) {
  // Determine relevance level based on program characteristics
  let relevanceLevel = 3; // Default to National (Level 3)
  let isFederalStateSpecific = false;
  let playgroundFundingHistory = false;
  let programOrigin = 'federal';
  let implementationLevel = 'national';
  let successRate = 50; // Default success rate

  // Determine if program is federal state specific
  if (program.federalStates && program.federalStates.length === 1 && program.federalStates[0] !== 'all') {
    isFederalStateSpecific = true;
    relevanceLevel = 1; // Core Programs (Level 1)
    programOrigin = 'state';
    implementationLevel = 'state';
    successRate = 75; // Higher success rate for state-specific programs
  } else if (program.federalStates && program.federalStates.includes('all')) {
    // Check if it's a state-implemented federal/EU program
    if (program.name.includes('LEADER') || program.name.includes('GAK') || 
        program.name.includes('Städtebauförderung') || program.name.includes('Dorferneuerung')) {
      relevanceLevel = 2; // Supplementary Programs (Level 2)
      programOrigin = program.name.includes('LEADER') ? 'eu' : 'federal';
      implementationLevel = 'state';
      successRate = 65;
    } else {
      relevanceLevel = 3; // National Programs (Level 3)
      successRate = 50;
    }
  }

  // Determine playground funding history
  if (program.type && program.type.includes('playground')) {
    playgroundFundingHistory = true;
    successRate += 10; // Bonus for playground-specific programs
  }

  // Special handling for specific program types
  if (program.name.includes('Spielplatz') || program.name.includes('Kinderhilfswerk') || 
      program.name.includes('Spielraum')) {
    playgroundFundingHistory = true;
    relevanceLevel = Math.min(relevanceLevel, 2); // Boost relevance for playground-specific
    successRate += 15;
  }

  // Handle stiftungen and special programs
  if (program.name.includes('Stiftung') || program.name.includes('LOTTO') || 
      program.name.includes('Aktion Mensch')) {
    programOrigin = 'mixed';
    implementationLevel = 'national';
    if (program.type && program.type.includes('playground')) {
      relevanceLevel = 2; // Supplementary for playground-relevant foundations
    }
  }

  // Exclude clearly irrelevant programs (Level 4)
  if (program.name.includes('Sportstätten') && !program.type.includes('playground') && 
      !program.type.includes('combination')) {
    relevanceLevel = 4; // Excluded Programs
    successRate = 20;
  }

  // Cap success rate at 90%
  successRate = Math.min(successRate, 90);

  return {
    ...program,
    // New metadata fields for optimized logic
    relevanceLevel,
    isFederalStateSpecific,
    playgroundFundingHistory,
    programOrigin,
    implementationLevel,
    successRate,
    lastRelevanceUpdate: new Date().toISOString()
  };
}

export const fundingPrograms = [
  // ========== BUNDESWEITE PROGRAMME ==========
  
  // Städtebauförderung Bund
  addEnhancedMetadata({
    name: "Städtebauförderung - Lebendige Zentren",
    type: ["playground", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-90%",
    source: "https://www.staedtebaufoerderung.info/DE/Programme/LebedigeZentren/lebendige_zentren_node.html",
    description: "Förderung zur Stärkung von Innenstädten und Ortsteilzentren"
  }),
  addEnhancedMetadata({
    name: "Soziale Stadt - Zusammenhalt im Quartier",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://www.staedtebaufoerderung.info/DE/Programme/SozialeStadt/soziale_stadt_node.html",
    description: "Förderung benachteiligter Stadtquartiere"
  }),
  addEnhancedMetadata({
    name: "Wachstum und nachhaltige Erneuerung",
    type: ["playground", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.staedtebaufoerderung.info/DE/Programme/WachstumNachhaltigeErneuerung/wachstum_nachhaltige_erneuerung_node.html",
    description: "Strukturwandel und Anpassung an demografische Veränderungen"
  }),
  addEnhancedMetadata({
    name: "BMWSB - Nationale Projekte des Städtebaus",
    type: ["playground", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 90%",
    source: "https://www.bmwsb.bund.de/Webs/BMWSB/DE/themen/stadt-wohnen/staedtebau/staedtebaufoerderung/nationale-projekte/nationale-projekte-node.html",
    description: "Förderung modellhafter Städtebauprojekte von nationaler Bedeutung"
  }),
  
  // Ländliche Entwicklung Bund
  addEnhancedMetadata({
    name: "GAK - Förderung der Dorfentwicklung",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-75%",
    source: "https://www.bmel.de/DE/themen/laendliche-regionen/foerderung-des-laendlichen-raumes/gemeinschaftsaufgabe-agrarstruktur-kuestenschutz/gak.html",
    description: "Gemeinschaftsaufgabe Agrarstruktur und Küstenschutz - Dorfentwicklung"
  }),
  addEnhancedMetadata({
    name: "LEADER - EU-Förderung für ländliche Regionen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.eler.niedersachsen.de/startseite/leader/",
    description: "EU-Förderprogramm für lokale Entwicklungsstrategien im ländlichen Raum"
  }),
  addEnhancedMetadata({
    name: "BULEplus - Bundesprogramm Ländliche Entwicklung",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 80%",
    source: "https://www.ble.de/DE/Projektfoerderung/Foerderungen-Auftraege/BULEplus/buleplus_node.html",
    description: "Förderung regionaler Wertschöpfung und Infrastruktur im ländlichen Raum"
  }),
  addEnhancedMetadata({
    name: "BULEplus - Soziale Dorfentwicklung",
    type: ["playground", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 80%",
    source: "https://www.bmel.de/DE/themen/laendliche-regionen/foerderung-des-laendlichen-raumes/bundesprogramm-laendliche-entwicklung.html",
    description: "Förderung sozialer Infrastruktur in Dörfern"
  }),
  
  // KfW & Bundesförderung
  {
    name: "Bundesprogramm Sanierung kommunaler Einrichtungen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["renovation", "accessibility"],
    fundingRate: "bis 90%",
    source: "https://www.kfw.de/inlandsfoerderung/Öffentliche-Einrichtungen/Kommunen/Förderprodukte/Sanierung-kommunaler-Einrichtungen-in-den-Bereichen-Sport-Jugend-und-Kultur-(2023)/",
    description: "Sanierung von Sport-, Jugend- und Kultureinrichtungen"
  },
  {
    name: "Klimaanpassung in sozialen Einrichtungen (AnpaSo)",
    type: ["playground", "combination"],
    federalStates: ["all"],
    measures: ["greening", "renovation"],
    fundingRate: "bis 80%",
    source: "https://www.z-u-g.org/aufgaben/klimaanpassung-in-sozialen-einrichtungen/",
    description: "Förderung von Klimaanpassungsmaßnahmen"
  },

  
  // Stiftungen & Kinderhilfswerke
  {
    name: "Deutsches Kinderhilfswerk - Themenfonds Spielraum",
    type: ["playground", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 10.000 EUR",
    source: "https://www.dkhw.de/foerderung/themenfonds-spielraum/",
    description: "Förderung von Spiel- und Bewegungsräumen für Kinder"
  },
  {
    name: "Deutsches Kinderhilfswerk - Spielplatz-Initiative",
    type: ["playground"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 5.000 EUR",
    source: "https://www.dkhw.de/foerderung/foerderantrag-stellen/",
    description: "Schnelle Förderung für Spielplatzprojekte"
  },
  {
    name: "Aktion Mensch - Barrierefreiheit",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["accessibility", "renovation"],
    fundingRate: "bis 300.000 EUR",
    source: "https://www.aktion-mensch.de/foerderung/foerderprogramme",
    description: "Förderung inklusiver Projekte"
  },
  {
    name: "Deutsche Fernsehlotterie - Fördermittel",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 300.000 EUR",
    source: "https://www.fernsehlotterie.de/foerderung",
    description: "Förderung sozialer Projekte und Begegnungsstätten"
  },
  {
    name: "Deutsche Stiftung für Engagement und Ehrenamt",
    type: ["playground", "calisthenics"],
    federalStates: ["all"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 50.000 EUR",
    source: "https://www.deutsche-stiftung-engagement-und-ehrenamt.de/foerderung/",
    description: "Förderung für Vereine und ehrenamtliche Projekte"
  },

  
  // ========== BADEN-WÜRTTEMBERG ==========
  {
    name: "Städtebauförderung Baden-Württemberg",
    type: ["playground", "combination"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://wm.baden-wuerttemberg.de/de/bauen/staedtebau/staedtebaufoerderung/",
    description: "Landesprogramm für städtebauliche Erneuerung und Entwicklung"
  },
  {
    name: "Investitionspakt BW - Soziale Integration im Quartier",
    type: ["playground", "combination"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 75%",
    source: "https://wm.baden-wuerttemberg.de/de/bauen/staedtebau/staedtebaufoerderung/",
    description: "Landesförderprogramm für soziale Integration"
  },
  {
    name: "Entwicklungsprogramm Ländlicher Raum (ELR) BW",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://mlr.baden-wuerttemberg.de/de/unsere-themen/laendlicher-raum/foerderung/elr/",
    description: "Förderung ländlicher Infrastruktur in Baden-Württemberg"
  },
  {
    name: "LEADER Baden-Württemberg",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-75%",
    source: "https://mlr.baden-wuerttemberg.de/de/unsere-themen/laendlicher-raum/leader/",
    description: "EU-Förderung für ländliche Regionen in BW"
  },
  {
    name: "Regionalbudget Baden-Württemberg",
    type: ["playground", "calisthenics"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 80%, max 20.000 EUR",
    source: "https://mlr.baden-wuerttemberg.de/de/unsere-themen/laendlicher-raum/leader/",
    description: "Kleinprojekte im ländlichen Raum"
  },
  {
    name: "Ausgleichstock Baden-Württemberg",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://rp.baden-wuerttemberg.de/",
    description: "Landesförderung für kommunale Infrastruktur"
  },
  {
    name: "Baden-Württemberg Sportstättenförderung",
    type: ["calisthenics", "combination"],
    federalStates: ["BW"],
    measures: ["newBuild", "renovation"],
    fundingRate: "30-40%",
    source: "https://www.km-bw.de/,Lde/startseite/sport/sportstättenförderung",
    description: "Landesförderung für Sportstätten"
  },
  
  // ========== BAYERN ==========
  {
    name: "Städtebauförderung Bayern",
    type: ["playground", "combination"],
    federalStates: ["BY"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.stmb.bayern.de/buw/staedtebaufoerderung/",
    description: "Bayerisches Städtebauförderprogramm"
  },
  {
    name: "Dorferneuerung Bayern",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BY"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.stmelf.bayern.de/landentwicklung/dorferneuerung/",
    description: "Förderung der Dorfentwicklung in Bayern"
  },
  {
    name: "LEADER Bayern 2023-2027",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BY"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.stmelf.bayern.de/agrarpolitik/foerderung/leader/",
    description: "EU-Förderung für ländliche Regionen in Bayern"
  },
  {
    name: "Regionalbudget Bayern",
    type: ["playground", "calisthenics"],
    federalStates: ["BY"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 80%, max 20.000 EUR",
    source: "https://www.stmelf.bayern.de/agrarpolitik/foerderung/leader/",
    description: "Kleinprojekte im ländlichen Raum Bayern"
  },
  {
    name: "Kita- und Spielplatzsanierungsprogramm Bayern (KSSP)",
    type: ["playground"],
    federalStates: ["BY"],
    measures: ["renovation", "accessibility"],
    fundingRate: "bis 90%",
    source: "https://www.stmas.bayern.de/",
    description: "Spezielle Förderung für Spielplatzsanierung"
  },
  {
    name: "Landesförderprogramm Sport Bayern",
    type: ["calisthenics", "combination"],
    federalStates: ["BY"],
    measures: ["newBuild", "renovation"],
    fundingRate: "30-50%",
    source: "https://www.stmwi.bayern.de/foerderungen/sportstättenförderung/",
    description: "Bayerische Sportstättenförderung"
  },

  
  // ========== BERLIN ==========
  {
    name: "Städtebauförderung Berlin - Lebendige Zentren",
    type: ["playground", "combination"],
    federalStates: ["BE"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.stadtentwicklung.berlin.de/staedtebau/foerderprogramme/lebendige_zentren/",
    description: "Förderung von Zentren und Quartieren in Berlin"
  },
  {
    name: "Sozialer Zusammenhalt Berlin / Quartiersmanagement",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BE"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://www.stadtentwicklung.berlin.de/staedtebau/foerderprogramme/soziale_stadt/",
    description: "Quartiersförderung in Berlin"
  },
  {
    name: "Grünflächen und Spielplätze in der Nachbarschaft (Berlin)",
    type: ["playground", "combination"],
    federalStates: ["BE"],
    measures: ["newBuild", "renovation", "greening"],
    fundingRate: "variabel",
    source: "https://www.berlin.de/",
    description: "Berliner Programm für Grünflächen und Spielplätze"
  },
  {
    name: "Freiwilliges Engagement In Nachbarschaften (FEIN)",
    type: ["playground", "combination"],
    federalStates: ["BE"],
    measures: ["newBuild", "renovation"],
    fundingRate: "variabel",
    source: "https://www.berlin.de/",
    description: "Förderung ehrenamtlicher Nachbarschaftsprojekte"
  },
  {
    name: "LOTTO-Stiftung Berlin",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BE"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.lotto-stiftung-berlin.de/",
    description: "Projektförderung aus Lottomitteln"
  },
  
  // ========== BRANDENBURG ==========
  {
    name: "Städtebauförderung Brandenburg",
    type: ["playground", "combination"],
    federalStates: ["BB"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://mil.brandenburg.de/mil/de/themen/staedtebau/staedtebaufoerderung/",
    description: "Städtebauförderung des Landes Brandenburg"
  },
  {
    name: "LEADER Brandenburg",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BB"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://mluk.brandenburg.de/mluk/de/landwirtschaft/foerderung/leader/",
    description: "EU-Förderung für ländliche Regionen in Brandenburg"
  },
  {
    name: "Integrierte ländliche Entwicklung Brandenburg (ILE)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BB"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 75%",
    source: "https://mluk.brandenburg.de/",
    description: "Förderung ländlicher Infrastruktur"
  },
  {
    name: "ILB - Zusammenhalt in kleinen Gemeinden",
    type: ["playground", "combination"],
    federalStates: ["BB"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 80%",
    source: "https://www.ilb.de/",
    description: "Förderung kleiner Gemeinden und Ortsteile"
  },
  {
    name: "Brandenburg-Kredit für Kommunen (KIP)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BB"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "Zinsgünstiges Darlehen",
    source: "https://www.ilb.de/",
    description: "Kommunales Investitionsprogramm 2025-2029"
  },
  {
    name: "Lottomittel Brandenburg (MIL)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["BB"],
    measures: ["newBuild", "renovation"],
    fundingRate: "variabel",
    source: "https://mil.brandenburg.de/",
    description: "Projektförderung aus Lottomitteln"
  },
  
  // ========== BREMEN ==========
  {
    name: "Spielraumförderung Bremen",
    type: ["playground"],
    federalStates: ["HB"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.soziales.bremen.de/",
    description: "Bremer Spielplatzförderung"
  },
  {
    name: "Länderfonds Bremen - SpielRäume schaffen (DKHW)",
    type: ["playground"],
    federalStates: ["HB"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 10.000 EUR",
    source: "https://www.dkhw.de/",
    description: "Deutsches Kinderhilfswerk Länderfonds Bremen"
  },
  {
    name: "Wohnen in Nachbarschaften (WiN) Bremen",
    type: ["playground", "combination"],
    federalStates: ["HB"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.bauumwelt.bremen.de/",
    description: "Quartiersförderung in Bremen"
  },
  {
    name: "Städtebauförderung Bremerhaven",
    type: ["playground", "combination"],
    federalStates: ["HB"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://www.bremerhaven.de/",
    description: "Städtebauförderung für Bremerhaven"
  },
  {
    name: "Landesprogramm Lebendige Quartiere Bremerhaven",
    type: ["playground", "combination"],
    federalStates: ["HB"],
    measures: ["newBuild", "renovation", "greening"],
    fundingRate: "variabel",
    source: "https://www.bremerhaven.de/",
    description: "Quartiersförderung Bremerhaven"
  },

  
  // ========== HAMBURG ==========
  {
    name: "RISE - Rahmenprogramm Integrierte Stadtteilentwicklung",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["HH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "variabel",
    source: "https://www.hamburg.de/rise/",
    description: "Hamburger Stadtteilentwicklungsprogramm"
  },
  {
    name: "Stadtentwicklungsfonds Lebendige Quartiere Hamburg",
    type: ["playground", "combination"],
    federalStates: ["HH"],
    measures: ["newBuild", "renovation", "greening"],
    fundingRate: "variabel",
    source: "https://www.hamburg.de/",
    description: "Förderung lebendiger Quartiere"
  },
  {
    name: "Investitionspakt Soziale Integration im Quartier (Hamburg)",
    type: ["playground", "combination"],
    federalStates: ["HH"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 75%",
    source: "https://www.hamburg.de/",
    description: "Soziale Integration in Hamburger Quartieren"
  },
  {
    name: "Gemeinschaftsfonds Hamburger Spielräume",
    type: ["playground"],
    federalStates: ["HH"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.buergerstiftung-hamburg.de/",
    description: "BürgerStiftung Hamburg Spielraumförderung"
  },
  {
    name: "Quartiersfonds Hamburg",
    type: ["playground", "combination"],
    federalStates: ["HH"],
    measures: ["newBuild", "renovation"],
    fundingRate: "variabel",
    source: "https://www.hamburg.de/",
    description: "Bezirkliche Quartiersförderung"
  },
  
  // ========== HESSEN ==========
  {
    name: "RiLiSE - Nachhaltige Stadtentwicklung Hessen",
    type: ["playground", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://wirtschaft.hessen.de/staedte-und-regionen/staedtebaufoerderung",
    description: "Hessische Städtebauförderung"
  },
  {
    name: "Lebendige Zentren Hessen",
    type: ["playground", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://wirtschaft.hessen.de/",
    description: "Förderung von Zentren in Hessen"
  },
  {
    name: "Sozialer Zusammenhalt Hessen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://wirtschaft.hessen.de/",
    description: "Quartiersförderung in Hessen"
  },
  {
    name: "Dorfentwicklung Hessen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://umwelt.hessen.de/",
    description: "Förderung ländlicher Infrastruktur in Hessen"
  },
  {
    name: "STARKES DORF+ Hessen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 80%",
    source: "https://staatskanzlei.hessen.de/",
    description: "Hessisches Dorfentwicklungsprogramm"
  },
  {
    name: "Zukunft Innenstadt Hessen",
    type: ["playground", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "greening"],
    fundingRate: "variabel",
    source: "https://wirtschaft.hessen.de/",
    description: "Innenstadtförderung Hessen"
  },
  {
    name: "Sportstättenbau Hessen",
    type: ["calisthenics", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "30-50%",
    source: "https://www.hessen.de/",
    description: "Hessische Sportstättenförderung"
  },
  {
    name: "LOTTO hilft Hessen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["HE"],
    measures: ["newBuild", "renovation"],
    fundingRate: "variabel",
    source: "https://www.lotto-hessen.de/lotto-hilft",
    description: "Projektförderung aus Lottomitteln"
  },
  
  // ========== MECKLENBURG-VORPOMMERN ==========
  {
    name: "Spielplatzförderung Mecklenburg-Vorpommern",
    type: ["playground"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 90%",
    source: "https://www.regierung-mv.de/",
    description: "Zuschuss für kommunale Kinderspielplätze"
  },
  {
    name: "Städtebauförderung Mecklenburg-Vorpommern",
    type: ["playground", "combination"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.lfi-mv.de/foerderungen/staedtebaufoerderung/",
    description: "Städtebauförderung in M-V"
  },
  {
    name: "LEADER Mecklenburg-Vorpommern",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.lfi-mv.de/",
    description: "EU-Förderung für ländliche Regionen in M-V"
  },
  {
    name: "Integrierte ländliche Entwicklung M-V (ILERL)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 75%",
    source: "https://www.lfi-mv.de/",
    description: "Dorfentwicklung in Mecklenburg-Vorpommern"
  },
  {
    name: "GAK-Regionalbudget Mecklenburg-Vorpommern",
    type: ["playground", "calisthenics"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 80%, max 20.000 EUR",
    source: "https://www.lfi-mv.de/",
    description: "Kleinprojekte im ländlichen Raum"
  },
  {
    name: "Bürgerfonds Mecklenburg-Vorpommern - Spielplätze",
    type: ["playground"],
    federalStates: ["MV"],
    measures: ["newBuild", "renovation"],
    fundingRate: "variabel",
    source: "https://www.buergerfonds-mv.de/",
    description: "Bürgerschaftliche Spielplatzprojekte"
  },

  
  // ========== NIEDERSACHSEN ==========
  {
    name: "Städtebauförderung Niedersachsen - Lebendige Zentren",
    type: ["playground", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.nbank.de/Privatpersonen/Wohnen-Leben/Städtebauförderung/index.jsp",
    description: "Förderung lebendiger Zentren in Niedersachsen"
  },
  {
    name: "Städtebauförderung Niedersachsen - Sozialer Zusammenhalt",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://www.nbank.de/",
    description: "Quartiersförderung in Niedersachsen"
  },
  {
    name: "Städtebauförderung Niedersachsen - Wachstum und nachhaltige Erneuerung",
    type: ["playground", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.nbank.de/",
    description: "Nachhaltige Stadtentwicklung in Niedersachsen"
  },
  {
    name: "Kleinere Städte und Gemeinden - Niedersachsen",
    type: ["playground", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-75%",
    source: "https://www.nbank.de/",
    description: "Förderung überörtlicher Zusammenarbeit"
  },
  {
    name: "ZILE - Dorfentwicklung Niedersachsen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.ml.niedersachsen.de/",
    description: "Zuwendungen zur integrierten ländlichen Entwicklung"
  },
  {
    name: "ZILE - Basisdienstleistungen Niedersachsen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 65%",
    source: "https://www.ml.niedersachsen.de/",
    description: "Förderung von Basisdienstleistungen im ländlichen Raum"
  },
  {
    name: "LEADER Niedersachsen (KLARA)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.eler.niedersachsen.de/startseite/leader/",
    description: "EU-Förderung für ländliche Regionen in Niedersachsen"
  },
  {
    name: "Sportstättenbauförderung Niedersachsen",
    type: ["calisthenics", "combination"],
    federalStates: ["NI"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "30-50%",
    source: "https://www.lsb-niedersachsen.de/",
    description: "Landessportbund Niedersachsen Förderung"
  },
  
  // ========== NORDRHEIN-WESTFALEN ==========
  {
    name: "Städtebauförderung Nordrhein-Westfalen",
    type: ["playground", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.mhkbd.nrw/themen/bau/staedtebau/staedtebaufoerderung",
    description: "NRW Städtebauförderung (MHKBD)"
  },
  {
    name: "Struktur- und Dorfentwicklung NRW",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.umwelt.nrw.de/",
    description: "Strukturentwicklung des ländlichen Raums"
  },
  {
    name: "Regionalbudget für Kleinprojekte NRW",
    type: ["playground", "calisthenics"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 80%, max 20.000 EUR",
    source: "https://www.umwelt.nrw.de/",
    description: "GAK-Regionalbudget für Kleinprojekte"
  },
  {
    name: "LEADER Nordrhein-Westfalen 2023-2027",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.umwelt.nrw.de/landwirtschaft/foerderung/leader",
    description: "EU-Förderung für ländliche Regionen in NRW"
  },
  {
    name: "Heimat-Scheck NRW",
    type: ["playground", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 2.000 EUR",
    source: "https://www.mhkbd.nrw/themen/heimat/heimat-foerderung/heimat-scheck",
    description: "Schnelle Förderung für kleine Heimatprojekte"
  },
  {
    name: "Heimat-Fonds NRW",
    type: ["playground", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 100.000 EUR",
    source: "https://www.mhkbd.nrw/themen/heimat/heimat-foerderung/heimat-fonds",
    description: "Förderung größerer Heimatprojekte"
  },
  {
    name: "Heimat-Förderung NRW.BANK",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.nrwbank.de/",
    description: "Heimat-Förderprogramm über NRW.BANK"
  },
  {
    name: "NRW Sportstättenförderung",
    type: ["calisthenics", "combination"],
    federalStates: ["NW"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 50%",
    source: "https://www.land.nrw/de/tags/sportstättenförderung",
    description: "Förderung von Sportstätten in NRW"
  },
  
  // ========== RHEINLAND-PFALZ ==========
  {
    name: "Städtebauliche Erneuerung Rheinland-Pfalz (RL-StEE)",
    type: ["playground", "combination"],
    federalStates: ["RP"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://mwvlw.rlp.de/de/themen/bauen-und-wohnen/staedtebau/staedtebaufoerderung/",
    description: "Förderung der Städtebaulichen Erneuerung und Entwicklung"
  },
  {
    name: "Dorferneuerung Rheinland-Pfalz (kommunal)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["RP"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.eler-eulle.rlp.de/",
    description: "Kommunale Dorferneuerung in RLP"
  },
  {
    name: "LEADER Rheinland-Pfalz",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["RP"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://mwvlw.rlp.de/de/themen/laendlicher-raum/leader/",
    description: "EU-Förderung für ländliche Regionen in RLP"
  },
  {
    name: "Regionalbudget (GAK) Rheinland-Pfalz",
    type: ["playground", "calisthenics"],
    federalStates: ["RP"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 80%, max 20.000 EUR",
    source: "https://www.eler-eulle.rlp.de/",
    description: "Kleinprojekte im ländlichen Raum"
  },
  {
    name: "LOTTO Rheinland-Pfalz Stiftung",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["RP"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.lotto-rlp.de/stiftung",
    description: "Projektförderung aus Lottomitteln"
  },
  {
    name: "Sportstättenförderprogramm Land in Bewegung (RLP)",
    type: ["calisthenics", "combination"],
    federalStates: ["RP"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "30-50%",
    source: "https://mffki.rlp.de/",
    description: "Sportstättenförderung in Rheinland-Pfalz"
  },
  
  // ========== SAARLAND ==========
  {
    name: "Lebendige Zentren Saarland",
    type: ["playground", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.saarland.de/",
    description: "Förderung von Stadt- und Ortskernen"
  },
  {
    name: "Sozialer Zusammenhalt Saarland",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://www.saarland.de/",
    description: "Quartiersförderung im Saarland"
  },
  {
    name: "Wachstum und nachhaltige Erneuerung Saarland",
    type: ["playground", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.saarland.de/",
    description: "Nachhaltige Stadtentwicklung"
  },
  {
    name: "Investitionspakt Soziale Integration im Quartier (Saarland)",
    type: ["playground", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 75%",
    source: "https://www.saarland.de/",
    description: "Soziale Integration in Quartieren"
  },
  {
    name: "Öffentliche Dorferneuerung Saarland (ELER 2023-2027)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.saarland.de/",
    description: "Dorfentwicklung im Saarland"
  },
  {
    name: "LEADER Saarland 2023-2027",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.saarland.de/",
    description: "EU-Förderung für ländliche Regionen"
  },
  {
    name: "Totomittel Saarland-Sporttoto",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation"],
    fundingRate: "variabel",
    source: "https://www.saartoto.de/",
    description: "Sportförderung aus Totomitteln"
  },
  {
    name: "Glück für das Saarland (Saartoto)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SL"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.saartoto.de/",
    description: "Projektförderung aus Lottomitteln"
  },
  
  // ========== SACHSEN ==========
  {
    name: "Lebendige Zentren Sachsen (LZP)",
    type: ["playground", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.sab.sachsen.de/",
    description: "Erhalt und Entwicklung der Stadt- und Ortskerne"
  },
  {
    name: "Sozialer Zusammenhalt Sachsen (SZP)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "60-80%",
    source: "https://www.sab.sachsen.de/",
    description: "Zusammenleben im Quartier"
  },
  {
    name: "Wachstum und nachhaltige Erneuerung Sachsen (WEP)",
    type: ["playground", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.sab.sachsen.de/",
    description: "Lebendige Quartiere gestalten"
  },
  {
    name: "Investitionspakt Sportstätten Sachsen (IVP-Sport)",
    type: ["calisthenics", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "bis 75%",
    source: "https://www.sab.sachsen.de/",
    description: "Förderung von Sportstätten"
  },
  {
    name: "Vitale Dorfkerne und Ortszentren Sachsen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 75%",
    source: "https://www.sab.sachsen.de/",
    description: "Dorfkernentwicklung im ländlichen Raum"
  },
  {
    name: "Regionalbudgets Sachsen",
    type: ["playground", "calisthenics"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation"],
    fundingRate: "bis 80%, max 20.000 EUR",
    source: "https://www.sab.sachsen.de/",
    description: "Kleinprojekte im ländlichen Raum"
  },
  {
    name: "LEADER Sachsen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.leader.sachsen.de/",
    description: "EU-Förderung für ländliche Regionen"
  },
  {
    name: "Förderrichtlinie Ländliche Entwicklung Sachsen (FRL LE/2025)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SN"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 75%",
    source: "https://www.sab.sachsen.de/",
    description: "Ländliche Entwicklung in Sachsen"
  },
  {
    name: "Sachsen barrierefrei 2030",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SN"],
    measures: ["accessibility", "renovation"],
    fundingRate: "variabel",
    source: "https://www.sab.sachsen.de/",
    description: "Förderung barrierefreier Maßnahmen"
  },
  
  // ========== SACHSEN-ANHALT ==========
  {
    name: "Städtebauförderung Sachsen-Anhalt (MID)",
    type: ["playground", "combination"],
    federalStates: ["ST"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://mid.sachsen-anhalt.de/",
    description: "Städtebauförderung in Sachsen-Anhalt"
  },
  {
    name: "LEADER Sachsen-Anhalt",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["ST"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://mw.sachsen-anhalt.de/",
    description: "EU-Förderung für ländliche Regionen"
  },
  {
    name: "Dorfentwicklung und ländlicher Wegebau Sachsen-Anhalt",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["ST"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.ib-sachsen-anhalt.de/",
    description: "Dorferneuerung und -entwicklung (ELER)"
  },
  {
    name: "LOTTO Sachsen-Anhalt Projektförderung",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["ST"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.lotto-sachsen-anhalt.de/",
    description: "LOTTO fördert - Projektförderung"
  },
  
  // ========== SCHLESWIG-HOLSTEIN ==========
  {
    name: "Städtebauförderung Schleswig-Holstein (LZ/SZ/WuNE)",
    type: ["playground", "combination"],
    federalStates: ["SH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://www.schleswig-holstein.de/",
    description: "Lebendige Zentren, Sozialer Zusammenhalt, Wachstum und nachhaltige Erneuerung"
  },
  {
    name: "GAK-Ortskernentwicklung Schleswig-Holstein",
    type: ["playground", "combination"],
    federalStates: ["SH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 75%",
    source: "https://www.schleswig-holstein.de/",
    description: "Ortskernentwicklung im ländlichen Raum"
  },
  {
    name: "Förderung des ländlichen Raums SH 2023-2027 (ELER/GAP)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.schleswig-holstein.de/",
    description: "ELER-Förderung für ländliche Entwicklung"
  },
  {
    name: "LEADER 2023-2027 Schleswig-Holstein (AktivRegionen)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://www.schleswig-holstein.de/",
    description: "EU-Förderung für ländliche Regionen"
  },
  {
    name: "Integrierte ländliche Entwicklung (ILE) Schleswig-Holstein",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["SH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://www.schleswig-holstein.de/",
    description: "ILE-Richtlinie 2023-2027"
  },
  {
    name: "Lotterie Umwelt und Entwicklung Schleswig-Holstein",
    type: ["playground", "combination"],
    federalStates: ["SH"],
    measures: ["newBuild", "renovation", "greening"],
    fundingRate: "variabel",
    source: "https://www.schleswig-holstein.de/",
    description: "Förderung aus Lottomitteln"
  },
  
  // ========== THÜRINGEN ==========
  {
    name: "Städtebauförderung Thüringen",
    type: ["playground", "combination"],
    federalStates: ["TH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "60-80%",
    source: "https://infrastruktur-landwirtschaft.thueringen.de/",
    description: "Städtebauförderung in Thüringen"
  },
  {
    name: "Dorferneuerung und -entwicklung Thüringen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["TH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 70%",
    source: "https://infrastruktur-landwirtschaft.thueringen.de/",
    description: "Dorfentwicklung in Thüringen"
  },
  {
    name: "LEADER Thüringen (PORTIA)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["TH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "50-80%",
    source: "https://infrastruktur-landwirtschaft.thueringen.de/",
    description: "EU-Förderung für ländliche Regionen - Online-Antragstellung"
  },
  {
    name: "Integrierte Ländliche Entwicklung (ILE) Thüringen",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["TH"],
    measures: ["newBuild", "renovation", "accessibility", "greening"],
    fundingRate: "bis 75%",
    source: "https://infrastruktur-landwirtschaft.thueringen.de/",
    description: "ILE-Programmübersicht"
  },
  {
    name: "Landesprogramm Solidarisches Zusammenleben der Generationen (LSZ)",
    type: ["playground", "combination"],
    federalStates: ["TH"],
    measures: ["newBuild", "renovation", "accessibility"],
    fundingRate: "variabel",
    source: "https://www.thueringen.de/",
    description: "Förderung generationenübergreifender Projekte"
  },
  {
    name: "Thüringer Barrierefreiheitsförderprogramm (ThüBaFF)",
    type: ["playground", "calisthenics", "combination"],
    federalStates: ["TH"],
    measures: ["accessibility", "renovation"],
    fundingRate: "bis 80%",
    source: "https://www.thueringen.de/",
    description: "Förderung barrierefreier Maßnahmen in Thüringen"
  }
];