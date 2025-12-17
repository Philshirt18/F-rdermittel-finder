# 🎯 Fördermittel-Finder

Ein intelligentes Tool zur Suche nach passenden Förderprogrammen für Spielplatz- und Outdoor-Fitness-Projekte in Deutschland.

![SPIEL-BAU Logo](public/logo.png)

## ✨ Features

### 🔍 Intelligente Fördersuche
- Durchsucht über **120 Förderprogramme** (Bund, Länder, Stiftungen)
- **KI-gestützte Analyse** mit Google Gemini
- **Match-Score** zeigt Passung zum Projekt (0-100%)
- Filterung nach Bundesland, Projekttyp und Maßnahmen

### 📊 Übersichtliche Ergebnisse
- Kompakte Karten mit den wichtigsten Infos
- Aufklappbare Details (Warum passt es? Nächste Schritte, Risiken)
- Verifizierte Links zu offiziellen Quellen
- PDF & JSON Export

### 🛠️ Integrierte Tools

| Tool | Beschreibung |
|------|-------------|
| ✉️ **Anschreiben-Generator** | Erstellt professionelle Anschreiben für Förderanträge |
| 📝 **Projektbeschreibung** | Generiert strukturierte Projektbeschreibungen |
| 🧮 **Kosten-Kalkulator** | Schätzt Projektkosten nach Größe und Ausstattung |
| ✅ **Checkliste** | Interaktive Liste aller benötigten Unterlagen |
| 💬 **Beratung** | Kontaktformular für Expertenberatung |
| 🖼️ **Inspiration** | Galerie mit Referenzprojekten |

## 🚀 Quick Start

### Voraussetzungen
- Node.js 18+
- Google Gemini API Key ([hier erstellen](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Repository klonen
git clone https://github.com/Philshirt18/F-rdermittel-finder.git
cd F-rdermittel-finder

# Dependencies installieren
npm install

# Environment-Variablen konfigurieren
cp .env.example .env
# Dann .env bearbeiten und VITE_GEMINI_API_KEY eintragen

# Development Server starten
npm run dev
```

### Build für Production

```bash
npm run build
npm run preview
```

## ⚙️ Konfiguration

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
VITE_GEMINI_API_KEY=dein_gemini_api_key
```

## 🏗️ Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Vanilla CSS
- **KI:** Google Gemini 2.5 Flash
- **PDF Export:** jsPDF

## 📁 Projektstruktur

```
src/
├── components/
│   ├── ProjectForm.jsx      # Eingabeformular
│   ├── Results.jsx          # Ergebnisanzeige
│   ├── ProgramDetail.jsx    # Detailansicht
│   ├── ToolsSidebar.jsx     # Tools-Leiste
│   └── tools/               # Einzelne Tools
├── services/
│   ├── geminiService.js     # KI-Integration
│   ├── toolsService.js      # Tool-Funktionen
│   └── exportService.js     # PDF/JSON Export
├── data/
│   └── fundingPrograms.js   # Förderprogramm-Datenbank
└── App.jsx
```

## 🌐 Deployment (Vercel)

1. Repository mit Vercel verbinden
2. Environment Variable setzen:
   - `VITE_GEMINI_API_KEY` = dein API Key
3. Deploy!

## 📝 Förderprogramm-Datenbank

Die Datenbank in `src/data/fundingPrograms.js` enthält Programme wie:
- Städtebauförderung (Bund/Länder)
- Sportstättenförderung
- LEADER (EU)
- Aktion Mensch
- Deutsche Stiftung für Engagement und Ehrenamt
- Landesspezifische Programme

## 🤝 Entwickelt für

**SPIEL-BAU** - Spielplätze und Outdoor-Fitness-Anlagen

## 📄 Lizenz

MIT License

---

Made with ❤️ and AI
