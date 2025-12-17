import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const generateCoverLetter = async (data) => {
  if (!genAI) {
    return getMockCoverLetter(data);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
Erstelle ein professionelles Anschreiben für einen Förderantrag.

DATEN:
- Kommune/Organisation: ${data.municipality}
- Ansprechpartner: ${data.contactPerson}
- Position: ${data.position || 'nicht angegeben'}
- Projektname: ${data.projectName}
- Bundesland: ${data.projectData?.federalState || 'nicht angegeben'}
- Projekttyp: ${data.projectData?.projectType || 'Spielplatz'}
- Projektbeschreibung: ${data.projectData?.description || 'nicht angegeben'}
${data.program ? `- Förderprogramm: ${data.program.name}` : ''}

AUFGABE:
Schreibe ein formelles, aber freundliches Anschreiben (ca. 250-350 Wörter) für den Förderantrag.
Das Anschreiben soll:
- Professionell und überzeugend sein
- Den Bedarf und die Ziele des Projekts kurz darstellen
- Auf die Passung zum Förderprogramm eingehen (falls angegeben)
- Mit einer höflichen Bitte um Prüfung enden

Format: Reiner Text, kein Markdown. Beginne mit Datum und Betreff.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating cover letter:', error);
    return getMockCoverLetter(data);
  }
};

export const generateProjectDescription = async (data) => {
  if (!genAI) {
    return getMockProjectDescription(data);
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
Erstelle eine professionelle Projektbeschreibung für einen Förderantrag.

EINGABEN:
- Aktuelle Situation: ${data.currentState}
- Zielgruppen: ${data.targetGroups}
- Projektziele: ${data.goals}
- Besonderheiten: ${data.specialFeatures || 'keine'}
- Projekttyp: ${data.projectData?.projectType || 'Spielplatz'}
- Bundesland: ${data.projectData?.federalState || 'nicht angegeben'}
${data.program ? `- Förderprogramm: ${data.program.name}` : ''}

AUFGABE:
Schreibe eine strukturierte Projektbeschreibung (ca. 400-600 Wörter) mit folgenden Abschnitten:

1. AUSGANGSLAGE UND BEDARF
2. PROJEKTZIELE
3. ZIELGRUPPEN UND NUTZEN
4. GEPLANTE MASSNAHMEN
5. NACHHALTIGKEIT UND PFLEGE

Die Beschreibung soll:
- Professionell und überzeugend formuliert sein
- Den Bedarf klar herausstellen
- Konkrete Ziele und Maßnahmen benennen
- Auf Förderfähigkeit und gesellschaftlichen Nutzen eingehen

Format: Reiner Text mit Abschnittsüberschriften. Kein Markdown.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating project description:', error);
    return getMockProjectDescription(data);
  }
};

// Mock functions for when API is not available
const getMockCoverLetter = (data) => {
  const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
  return `${data.municipality}
${data.contactPerson}
${data.position || ''}

${date}

Betreff: Förderantrag für ${data.projectName}

Sehr geehrte Damen und Herren,

im Namen der ${data.municipality} beantragen wir hiermit Fördermittel für das Projekt "${data.projectName}".

${data.projectData?.description || 'Das geplante Vorhaben soll die Lebensqualität in unserer Gemeinde nachhaltig verbessern und einen wichtigen Beitrag zur sozialen Infrastruktur leisten.'}

Das Projekt richtet sich an Familien, Kinder und alle Bürgerinnen und Bürger unserer Gemeinde. Durch die Realisierung erwarten wir eine deutliche Aufwertung des öffentlichen Raums sowie eine Stärkung des sozialen Zusammenhalts.

Die Gesamtkosten des Projekts wurden sorgfältig kalkuliert. Die erforderlichen Eigenmittel sind im Haushalt eingeplant und durch entsprechenden Gemeinderatsbeschluss gesichert.

Wir sind überzeugt, dass unser Vorhaben die Förderkriterien erfüllt und einen nachhaltigen Mehrwert für unsere Gemeinde schafft.

Für Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen

${data.contactPerson}
${data.position || ''}
${data.municipality}`;
};

const getMockProjectDescription = (data) => {
  return `PROJEKTBESCHREIBUNG

1. AUSGANGSLAGE UND BEDARF

${data.currentState || 'Die aktuelle Situation erfordert dringend eine Verbesserung der vorhandenen Infrastruktur.'}

Der Bedarf an qualitativ hochwertigen Spiel- und Bewegungsangeboten ist in unserer Gemeinde deutlich gestiegen. Die vorhandenen Einrichtungen entsprechen nicht mehr den aktuellen Anforderungen und Sicherheitsstandards.

2. PROJEKTZIELE

${data.goals || 'Ziel des Projekts ist die Schaffung eines attraktiven und sicheren Bewegungsangebots für alle Altersgruppen.'}

Konkret sollen folgende Ziele erreicht werden:
- Verbesserung der Bewegungsmöglichkeiten
- Förderung der sozialen Begegnung
- Aufwertung des öffentlichen Raums
- Steigerung der Lebensqualität

3. ZIELGRUPPEN UND NUTZEN

${data.targetGroups || 'Das Projekt richtet sich an Kinder, Jugendliche, Familien und Senioren.'}

Der gesellschaftliche Nutzen umfasst:
- Förderung der körperlichen Aktivität
- Stärkung des sozialen Zusammenhalts
- Schaffung von Begegnungsräumen
- Beitrag zur Gesundheitsförderung

4. GEPLANTE MASSNAHMEN

Die Umsetzung erfolgt in enger Abstimmung mit allen Beteiligten. Geplant sind moderne, sichere und barrierefreie Anlagen, die den aktuellen Normen entsprechen.

${data.specialFeatures ? `Besondere Merkmale: ${data.specialFeatures}` : ''}

5. NACHHALTIGKEIT UND PFLEGE

Die langfristige Pflege und Instandhaltung wird durch die Gemeinde sichergestellt. Ein entsprechendes Pflegekonzept liegt vor. Die Anlage wird regelmäßig gewartet und auf Sicherheit geprüft.`;
};
