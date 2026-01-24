import { GoogleGenerativeAI } from '@google/generative-ai';
import { fundingPrograms } from '../data/fundingPrograms';
import { preFilterPrograms } from './preFilterService';
import { strictFilterPrograms, getStrictProgramNames, strictFilterProgramsWithRelevance } from './strictFilterService';
import { sortResults, sortAndLimitByRelevance } from './sortService';
import { simpleFilterPrograms, getSimpleFilterProgramNames } from './simpleFilterService';
import { assignCategory } from './fundingLogic';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

console.log('🔑 MODULE LOADED - Key:', apiKey ? 'loaded from .env' : 'not found');

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Retry function for API calls
const retryApiCall = async (apiCall, maxRetries = 3, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.message.includes('503') || error.message.includes('overloaded')) {
        if (i === maxRetries - 1) throw error;
        console.log(`API overloaded, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
};

// Helper function to enhance nextSteps based on project data
const enhanceNextSteps = (nextSteps) => {
  // Always use the same standardized next steps
  const standardNextSteps = [
    "Detaillierte Planung des Spielplatzes unter Berücksichtigung der Förderrichtlinien",
    "Prüfung von Zuständigkeit, Einreichungsweg und formalen Anforderungen des Förderantrags"
  ];
  
  return standardNextSteps;
};

export const analyzeProject = async (projectData, relevanceEngine = null) => {
  try {
    console.log('=== ANALYZE PROJECT v2.0 ===');
    console.log('Project data:', projectData);
    
    // Fallback mock response if no API key
    console.log('API Key check:', { 
      hasGenAI: !!genAI, 
      hasApiKey: !!apiKey, 
      apiKeyValue: apiKey,
      isPlaceholder: apiKey === 'your_gemini_api_key_here'
    });
    
    if (!genAI || !apiKey || apiKey === 'your_gemini_api_key_here') {
      console.log('Using mock analysis - reason:', !genAI ? 'no genAI' : !apiKey ? 'no apiKey' : 'placeholder key');
      return getMockAnalysis(projectData, relevanceEngine);
    }
    
    console.log('Using REAL AI analysis with Gemini');

    console.log('Total programs in database:', fundingPrograms.length);
    
    // SIMPLE FILTERING: Apply new location-based filtering logic
    console.log('=== APPLYING SIMPLE FILTERING ===');
    
    let filteredPrograms;
    
    try {
      // Use the new simple filter service
      console.log('🎯 Using new simple filter service');
      filteredPrograms = simpleFilterPrograms(
        projectData.einsatzbereich,
        projectData.federalState,
        fundingPrograms
      );
      
      console.log(`Simple filter result: ${filteredPrograms.length} programs`);
      console.log('Simple filtered programs:', getSimpleFilterProgramNames(filteredPrograms));
      
    } catch (simpleFilterError) {
      console.error('❌ Simple filtering failed, falling back to legacy:', simpleFilterError);
      // Fallback to legacy filtering
      filteredPrograms = strictFilterProgramsWithRelevance(
        projectData.einsatzbereich,
        projectData.federalState,
        fundingPrograms,
        relevanceEngine
      );
    }
    
    // If no programs pass filtering, return empty result
    if (filteredPrograms.length === 0) {
      console.log('No programs pass filtering criteria');
      return {
        programs: [],
        message: 'Keine Programme entsprechen den Filterkriterien für diesen Einsatzbereich'
      };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Use filtered programs (no additional AI selection needed)
    const programsForAI = filteredPrograms;
    console.log(`Using ${programsForAI.length} filtered programs for AI evaluation`);

    // Create a simplified list for AI with indices
    const programList = programsForAI.map((p, idx) => ({
    index: idx,
    name: p.name,
    description: p.description,
    fundingRate: p.fundingRate,
    measures: p.measures
  }));

    const prompt = `
Du bist ein Experte für Fördermittel in Deutschland.

WICHTIG: Die Programme wurden bereits durch ein strenges fachliches Filter-System vorgefiltert.
Alle Programme sind rechtlich und praktisch für den angegebenen Einsatzbereich geeignet.
Deine Aufgabe ist NUR die Bewertung und Erklärung - NICHT das Filtern.

PROJEKTDATEN:
- Bundesland: ${projectData.federalState}
- Projekttyp: ${projectData.projectType}
- Einsatzbereich: ${projectData.einsatzbereich || 'nicht angegeben'}
- Maßnahmen: ${(projectData.measures || []).join(', ') || 'keine'}

VORGEFILTERTE PROGRAMME (alle fachlich geeignet):
${JSON.stringify(programList, null, 2)}

AUFGABE:
Bewerte ALLE ${programList.length} Programme. Alle sind bereits fachlich geprüft und geeignet.
Vergib realistische Bewertungen basierend auf:

1. **Einsatzbereich-Match**: Wie gut passt das Programm zum gewählten Einsatzbereich?
2. **Praktische Anwendbarkeit**: Wie realistisch ist eine erfolgreiche Antragstellung?
3. **Förderwahrscheinlichkeit**: Basierend auf Programmausrichtung und Projektdetails
4. **Landesspezifität**: Landesspezifische Programme oft passgenauer als bundesweite

BEWERTUNGSKRITERIEN:
- 85-95: Perfekte Passung zum Einsatzbereich, sehr hohe Erfolgswahrscheinlichkeit
- 75-84: Sehr gute Passung, gute Erfolgswahrscheinlichkeit  
- 65-74: Gute Passung, mittlere Erfolgswahrscheinlichkeit
- 55-64: Mäßige Passung, aber durchaus möglich
- 45-54: Schwächere Passung, aber grundsätzlich förderfähig

Für JEDES Programm gib zurück:
- index: Die Nummer aus der Liste (WICHTIG!)
- fitScore: Passung 45-95 (basierend auf obigen Kriterien)
- eligibility: "Förderfähig" (alle Programme sind bereits geprüft)
- whyItFits: 3-5 spezifische Gründe als Array
- nextSteps: 5-8 konkrete Schritte als Array (IMMER mit "Detaillierte Planung des Spielplatzes unter Berücksichtigung der Förderrichtlinien" als ersten Schritt)
- missingInfo: Fehlende Infos als Array
- relevanceReason: Kurze Erklärung der Bewertung (1-2 Sätze)

WICHTIG für nextSteps: 
- Erster Schritt ist IMMER: "Detaillierte Planung des Spielplatzes unter Berücksichtigung der Förderrichtlinien"
- Zweiter Schritt ist IMMER: "Prüfung von Zuständigkeit, Einreichungsweg und formalen Anforderungen des Förderantrags"
- Gib NUR diese zwei Schritte zurück, keine weiteren Schritte

Antworte NUR mit JSON:
{
  "programs": [
    {
      "index": 0,
      "fitScore": 85,
      "eligibility": "Förderfähig",
      "whyItFits": ["..."],
      "nextSteps": ["..."],
      "missingInfo": ["..."]
    }
  ]
}
`;

    const analysis = await retryApiCall(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Keine gültige JSON-Antwort erhalten');
      }
      
      return JSON.parse(jsonMatch[0]);
    });
    
    console.log('AI returned program indices:', analysis.programs?.map(p => p.index));
    
    // Map indices back to full program data
    if (analysis.programs) {
      const aiProgramsMap = new Map(analysis.programs.map(p => [p.index, p]));
      
      // Ensure ALL filtered programs are included
      analysis.programs = programsForAI.map((dbProgram, index) => {
        const aiProgram = aiProgramsMap.get(index);
        
        if (!aiProgram) {
          // If AI didn't return this program, add it with default values
          console.warn(`AI didn't return program at index ${index}, adding with defaults`);
          return {
            name: dbProgram.name,
            source: dbProgram.source,
            fundingRate: dbProgram.fundingRate,
            description: dbProgram.description,
            fitScore: 70, // Default score
            eligibility: "Unklar",
            whyItFits: ["Programm wurde vorgefiltert und erfüllt grundlegende Kriterien"],
            nextSteps: enhanceNextSteps(["Projektkonzept erstellen"]),
            missingInfo: ["Detaillierte Förderbedingungen"],
            // Add relevance metadata
            relevanceLevel: dbProgram.relevanceLevel || 3,
            isFederalStateSpecific: dbProgram.isFederalStateSpecific || false,
            playgroundFundingHistory: dbProgram.playgroundFundingHistory || false,
            federalStates: dbProgram.federalStates,
            category: assignCategory(dbProgram) // Use funding logic to assign category
          };
        }
        
        return {
          name: dbProgram.name,
          source: dbProgram.source,
          fundingRate: dbProgram.fundingRate,
          description: dbProgram.description,
          fitScore: aiProgram.fitScore,
          eligibility: aiProgram.eligibility,
          whyItFits: aiProgram.whyItFits,
          nextSteps: enhanceNextSteps(aiProgram.nextSteps),
          missingInfo: aiProgram.missingInfo,
          relevanceReason: aiProgram.relevanceReason || "Programm wurde vorgefiltert und erfüllt grundlegende Kriterien",
          isStateSpecific: dbProgram.isStateSpecific,
          // Add relevance metadata from RelevanceEngine
          relevanceLevel: dbProgram.relevanceLevel || 3,
          isFederalStateSpecific: dbProgram.isFederalStateSpecific || false,
          playgroundFundingHistory: dbProgram.playgroundFundingHistory || false,
          federalStates: dbProgram.federalStates,
          category: assignCategory(dbProgram) // Use funding logic to assign category
        };
      });
      
      console.log(`Ensured all ${programsForAI.length} programs are included in results`);
      
      // Programs are already sorted by the simple filter service
      console.log('Programs already sorted by priority: state-specific first, then federal');
      
      console.log('Final programs:', analysis.programs.map(p => ({ 
        name: p.name, 
        score: p.fitScore, 
        priority: p.priority || 'N/A',
        locationType: p.locationType || 'N/A'
      })));
    }
    
    // Add combination advice if needed
    if (projectData.projectType === 'combination') {
      analysis.combinationAdvice = "Bei Kombiprojekten empfehlen wir zu prüfen, ob eine getrennte Förderung (Spielplatz + Fitness) oder eine integrierte Förderung sinnvoller ist. Dies hängt von den lokalen Förderbedingungen ab.";
    }
    
    return analysis;
  } catch (error) {
    console.error('!!! ERROR IN ANALYZE PROJECT !!!');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
    throw new Error(`Fehler bei der Analyse: ${error.message}`);
  }
};


// Mock analysis for testing without API key
const getMockAnalysis = (projectData, relevanceEngine = null) => {
  console.log('=== USING MOCK ANALYSIS ===');
  
  // Apply simple filtering even in mock mode
  let filteredPrograms;
  try {
    console.log('🎯 Mock: Using simple filter service');
    filteredPrograms = simpleFilterPrograms(
      projectData.einsatzbereich,
      projectData.federalState,
      fundingPrograms
    );
  } catch (error) {
    console.error('❌ Mock simple filtering failed, using legacy fallback:', error);
    filteredPrograms = strictFilterProgramsWithRelevance(
      projectData.einsatzbereich,
      projectData.federalState,
      fundingPrograms,
      null
    );
  }
  
  console.log(`Mock: Filter result: ${filteredPrograms.length} programs`);
  
  if (filteredPrograms.length === 0) {
    return {
      programs: [],
      message: 'Keine Programme entsprechen den Filterkriterien für diesen Einsatzbereich'
    };
  }
  
  // Create mock analysis for filtered programs
  const mockPrograms = filteredPrograms.slice(0, 10).map((program, index) => ({
    name: program.name,
    source: program.source,
    fundingRate: program.fundingRate,
    description: program.description,
    fitScore: 85 - (index * 5), // Decreasing scores
    eligibility: "Förderfähig",
    whyItFits: [
      `Programm ist fachlich geeignet für ${projectData.einsatzbereich}`,
      `Verfügbar in ${projectData.federalState}`,
      `Unterstützt Neubau von Spielplätzen`,
      "Wurde durch strenges Filter-System validiert"
    ],
    nextSteps: enhanceNextSteps([]),
    missingInfo: [
      "Genaue Projektkosten",
      "Detaillierte Standortplanung"
    ],
    relevanceReason: "Programm wurde durch erweiterte Relevanzlogik als geeignet eingestuft",
    isStateSpecific: program.federalStates && !program.federalStates.includes('all'),
    // Add relevance metadata
    relevanceLevel: program.relevanceLevel || 3,
    isFederalStateSpecific: program.isFederalStateSpecific || false,
    playgroundFundingHistory: program.playgroundFundingHistory || false,
    federalStates: program.federalStates,
    category: assignCategory(program) // Use funding logic to assign category
  }));

  return {
    programs: mockPrograms,
    combinationAdvice: projectData.projectType === 'combination' 
      ? "Bei Kombiprojekten empfehlen wir eine getrennte Förderung: Spielplatz über Städtebauförderung, Fitness-Bereich über Sportstättenförderung. So maximieren Sie die Fördersumme."
      : null
  };
};


// Analyze program details for application
export const analyzeProgramDetails = async (program, projectData) => {
  if (!genAI || !apiKey || apiKey === 'your_gemini_api_key_here') {
    return getMockProgramDetails(program);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const prompt = `
Du bist ein Experte für Fördermittelanträge in Deutschland.

PROGRAMM:
${JSON.stringify(program, null, 2)}

PROJEKT:
${JSON.stringify(projectData, null, 2)}

AUFGABE:
Erstelle eine detaillierte Anleitung für die Beantragung dieses Förderprogramms.

WICHTIGE HINWEISE:
- Verwende KEINE Texte wie "Einholung von Vergleichsangeboten" oder ähnliche Formulierungen
- Verwende KEINE Emojis wie ⏰ in den Schritten
- Halte die Schritte klar und einfach
- Keine Links oder URLs in den Antworten

Gib zurück (als JSON):
{
  "requiredDocuments": [
    {
      "name": "Dokumentname",
      "description": "Was ist das und warum wird es benötigt",
      "where": "Wo bekommt man das (z.B. Gemeinde, Architekt, etc.)"
    }
  ],
  "applicationForms": [
    {
      "name": "Formularname",
      "description": "Beschreibung",
      "url": "URL zum Formular (wenn bekannt, sonst null)",
      "howToGet": "Wie/wo man das Formular bekommt"
    }
  ],
  "stepByStep": [
    {
      "action": "Was zu tun ist",
      "details": "Zusätzliche Details",
      "deadline": "Frist (falls relevant)"
    }
  ],
  "contacts": [
    {
      "role": "Rolle (z.B. Bewilligungsstelle)",
      "organization": "Organisation",
      "phone": "Telefon (falls bekannt)",
      "email": "E-Mail (falls bekannt)",
      "website": "Website"
    }
  ],
  "deadlines": [
    {
      "name": "Fristname",
      "description": "Beschreibung der Frist"
    }
  ],
  "tips": [
    "Tipp 1 für erfolgreichen Antrag",
    "Tipp 2",
    ...
  ]
}

Sei KONKRET und PRAKTISCH. Gib echte Informationen basierend auf dem Programm.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Keine gültige JSON-Antwort erhalten');
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error analyzing program details:', error);
    return getMockProgramDetails(program);
  }
};

const getMockProgramDetails = (program) => {
  return {
    requiredDocuments: [
      {
        name: "Projektskizze / Konzept",
        description: "Beschreibung des Vorhabens, Ziele, Zielgruppe, erwartete Wirkung (2-5 Seiten)",
        where: "Selbst erstellen oder mit Hilfe eines Planungsbüros"
      },
      {
        name: "Kostenschätzung / Kostenplan",
        description: "Detaillierte Aufstellung aller Kosten (Planung, Bau, Ausstattung)",
        where: "Spielbau GmbH oder andere Fachplaner"
      },
      {
        name: "Lageplan",
        description: "Übersichtsplan mit Standort des Projekts",
        where: "Katasteramt oder Vermessungsbüro"
      },
      {
        name: "Gemeinderatsbeschluss",
        description: "Beschluss über die Durchführung des Projekts und Beantragung der Förderung",
        where: "Gemeinderat / Stadtrat"
      },
      {
        name: "Finanzierungsplan",
        description: "Nachweis der Gesamtfinanzierung inkl. Eigenmittel",
        where: "Kämmerei / Finanzverwaltung"
      }
    ],
    applicationForms: [
      {
        name: "Förderantrag",
        description: "Offizielles Antragsformular des Förderprogramms",
        url: null,
        howToGet: "Download von der Programm-Website oder bei der Bewilligungsstelle anfordern"
      },
      {
        name: "Verwendungsnachweis (nach Abschluss)",
        description: "Nachweis über die zweckgemäße Verwendung der Fördermittel",
        url: null,
        howToGet: "Wird nach Bewilligung mit den Förderunterlagen zugeschickt"
      }
    ],
    stepByStep: [
      {
        action: "Informieren und Beratung einholen",
        details: "Kontakt zur Bewilligungsstelle aufnehmen, Förderbedingungen klären",
        deadline: null
      },
      {
        action: "Projektkonzept erstellen",
        details: "Detaillierte Projektbeschreibung mit Zielen, Maßnahmen und Zeitplan",
        deadline: null
      },
      {
        action: "Kostenschätzung einholen",
        details: "Spielplatz mithilfe von Spielbau GmbH planen und Angebot erhalten",
        deadline: null
      },
      {
        action: "Gemeinderatsbeschluss herbeiführen",
        details: "Projekt im Gemeinderat vorstellen und Beschluss zur Antragstellung erwirken",
        deadline: null
      },
      {
        action: "Förderantrag stellen",
        details: "Vollständigen Antrag mit allen Unterlagen bei der Bewilligungsstelle einreichen",
        deadline: "Vor Maßnahmenbeginn!"
      },
      {
        action: "Bewilligung abwarten",
        details: "Bearbeitungszeit ca. 3-6 Monate, bei Rückfragen zeitnah antworten",
        deadline: null
      },
      {
        action: "Maßnahme durchführen",
        details: "Erst nach Bewilligungsbescheid mit Baumaßnahmen beginnen",
        deadline: "Gemäß Bewilligungsbescheid"
      },
      {
        action: "Verwendungsnachweis einreichen",
        details: "Nachweis über zweckgemäße Mittelverwendung mit Belegen",
        deadline: "Meist 3-6 Monate nach Abschluss"
      }
    ],
    contacts: [
      {
        role: "Bewilligungsstelle",
        organization: "Zuständige Landesbehörde oder Förderbank",
        phone: null,
        email: null,
        website: null
      }
    ],
    deadlines: [
      {
        name: "Antragstellung vor Maßnahmenbeginn",
        description: "Der Antrag muss VOR Beginn der Baumaßnahmen gestellt werden. Vorzeitiger Maßnahmenbeginn führt zum Ausschluss!"
      },
      {
        name: "Mittelabruf",
        description: "Bewilligte Mittel müssen innerhalb der im Bescheid genannten Frist abgerufen werden"
      }
    ],
    tips: [
      "Frühzeitig Kontakt zur Bewilligungsstelle aufnehmen - oft gibt es Beratungstermine",
      "Alle Unterlagen vollständig einreichen - unvollständige Anträge verzögern die Bearbeitung",
      "Niemals vor der Bewilligung mit Baumaßnahmen beginnen!",
      "Bürgerbeteiligung dokumentieren - viele Programme setzen dies voraus",
      "Barrierefreiheit und Nachhaltigkeit betonen - das erhöht die Chancen",
      "Kofinanzierung sicherstellen - Eigenmittel müssen nachgewiesen werden"
    ]
  };
};
