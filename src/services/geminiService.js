import { GoogleGenerativeAI } from '@google/generative-ai';
import { fundingPrograms } from '../data/fundingPrograms';

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

export const analyzeProject = async (projectData) => {
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
      return getMockAnalysis(projectData);
    }
    
    console.log('Using REAL AI analysis with Gemini');

    console.log('Total programs in database:', fundingPrograms.length);
    
    // Filter relevant programs with priority
    const relevantPrograms = fundingPrograms
      .filter(program => {
        // Check if program matches federal state
        const stateMatch = program.federalStates.includes('all') || 
                           program.federalStates.includes(projectData.federalState);
        
        // Check if program matches project type
        const typeMatch = program.type.includes(projectData.projectType);
        
        return stateMatch && typeMatch;
      })
      .sort((a, b) => {
        // Prioritize state-specific programs over "all"
        const aIsStateSpecific = a.federalStates.includes(projectData.federalState) && !a.federalStates.includes('all');
        const bIsStateSpecific = b.federalStates.includes(projectData.federalState) && !b.federalStates.includes('all');
        
        if (aIsStateSpecific && !bIsStateSpecific) return -1;
        if (!aIsStateSpecific && bIsStateSpecific) return 1;
        return 0;
      });

    console.log(`Filtered ${relevantPrograms.length} relevant programs from ${fundingPrograms.length} total`);
    console.log('Relevant programs:', relevantPrograms.map(p => p.name));

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Use available model

    // Create a simplified list for AI with indices
    const programList = relevantPrograms.map((p, idx) => ({
    index: idx,
    name: p.name,
    description: p.description,
    fundingRate: p.fundingRate,
    measures: p.measures
  }));

    const prompt = `
Du bist ein Experte für Fördermittel in Deutschland.

PROJEKTDATEN:
- Bundesland: ${projectData.federalState}
- Projekttyp: ${projectData.projectType}
- Beschreibung: ${projectData.description}
- Maßnahmen: ${projectData.measures.join(', ') || 'keine'}
- Budget: ${projectData.budget || 'nicht angegeben'}

VERFÜGBARE PROGRAMME:
${JSON.stringify(programList, null, 2)}

AUFGABE:
Analysiere KRITISCH welche Programme WIRKLICH passen. Wähle nur 5-8 Programme aus, die einen FitScore von mindestens 65% haben.

WICHTIG - Nur Programme empfehlen wenn:
- Der Projekttyp explizit gefördert wird
- Das Bundesland passt (Landes-Programme nur für das spezifische Land)
- Die Maßnahmen zum Programm passen
- Das Budget realistisch ist

Für jedes ausgewählte Programm gib zurück:
- index: Die Nummer aus der Liste (WICHTIG!)
- fitScore: Passung 0-100
- eligibility: "Förderfähig" / "Nicht förderfähig" / "Unklar"
- whyItFits: 3-5 Gründe als Array
- nextSteps: 5-8 Schritte als Array
- risks: 2-4 Risiken als Array
- missingInfo: Fehlende Infos als Array

Antworte NUR mit JSON:
{
  "programs": [
    {
      "index": 0,
      "fitScore": 85,
      "eligibility": "Förderfähig",
      "whyItFits": ["..."],
      "nextSteps": ["..."],
      "risks": ["..."],
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
      analysis.programs = analysis.programs
        .map(aiProgram => {
          const dbProgram = relevantPrograms[aiProgram.index];
          
          if (!dbProgram) {
            console.warn(`Invalid index: ${aiProgram.index}`);
            return null;
          }
          
          return {
            name: dbProgram.name,
            source: dbProgram.source,
            fundingRate: dbProgram.fundingRate,
            description: dbProgram.description,
            fitScore: aiProgram.fitScore,
            eligibility: aiProgram.eligibility,
            whyItFits: aiProgram.whyItFits,
            nextSteps: aiProgram.nextSteps,
            risks: aiProgram.risks,
            missingInfo: aiProgram.missingInfo
          };
        })
        .filter(p => p !== null)
        .filter(p => p.fitScore >= 60) // Nur Programme mit mindestens 60% Fit
        .sort((a, b) => b.fitScore - a.fitScore); // Sortiere nach Fit-Score
      
      console.log('Final programs with sources:', analysis.programs.map(p => ({ name: p.name, score: p.fitScore, source: p.source })));
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
const getMockAnalysis = (projectData) => {
  return {
    programs: [
      {
        name: "Städtebauförderung - Lebendige Zentren",
        fitScore: 85,
        eligibility: "Förderfähig",
        whyItFits: [
          "Ihr Projekt passt zur Aufwertung öffentlicher Räume",
          "Spielplätze sind förderfähige Maßnahmen",
          "Barrierefreiheit wird besonders gefördert",
          "Bundesweites Programm verfügbar"
        ],
        nextSteps: [
          "Projektskizze erstellen (2-3 Seiten)",
          "Kostenschätzung durch Fachplaner",
          "Gemeinderatsbeschluss einholen",
          "Antrag bei zuständiger Bewilligungsstelle einreichen",
          "Förderzusage abwarten (ca. 3-6 Monate)",
          "Erst nach Bewilligung mit Baumaßnahmen beginnen"
        ],
        risks: [
          "Nicht vor Bewilligung mit Bau beginnen - sonst keine Förderung",
          "Fristen für Mittelabruf beachten",
          "Dokumentationspflichten während der Bauphase"
        ],
        missingInfo: [
          "Genaue Lage im Stadtgebiet (Fördergebiet?)",
          "Ist das Gebiet bereits als Fördergebiet ausgewiesen?"
        ],
        source: "https://www.staedtebaufoerderung.info"
      },
      {
        name: "Soziale Stadt - Zusammenhalt im Quartier",
        fitScore: 78,
        eligibility: "Förderfähig",
        whyItFits: [
          "Spielplätze fördern soziale Integration",
          "Quartiersaufwertung ist Programmziel",
          "Hohe Förderquote möglich (bis 80%)"
        ],
        nextSteps: [
          "Prüfen ob Ihr Quartier Fördergebiet ist",
          "Kontakt zum Quartiersmanagement aufnehmen",
          "Bürgerbeteiligung durchführen",
          "Antrag über Quartiersmanagement stellen"
        ],
        risks: [
          "Nur in ausgewiesenen Fördergebieten möglich",
          "Bürgerbeteiligung ist Pflicht"
        ],
        missingInfo: [
          "Liegt das Projekt in einem Fördergebiet 'Soziale Stadt'?"
        ],
        source: "https://www.staedtebaufoerderung.info"
      }
    ],
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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
Du bist ein Experte für Fördermittelanträge in Deutschland.

PROGRAMM:
${JSON.stringify(program, null, 2)}

PROJEKT:
${JSON.stringify(projectData, null, 2)}

AUFGABE:
Erstelle eine detaillierte Anleitung für die Beantragung dieses Förderprogramms.

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
        where: "Architekt, Landschaftsplaner oder Fachplaner"
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
        url: program.source,
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
        details: "Angebote von Planern/Architekten einholen, Kostenplan erstellen",
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
        website: program.source
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
