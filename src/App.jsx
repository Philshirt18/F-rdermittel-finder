import React, { useState, useEffect } from 'react';
import ProjectForm from './components/ProjectForm';
import Results from './components/Results';
import ToolsSidebar from './components/ToolsSidebar';
import { analyzeProject } from './services/geminiService';
import { RelevanceEngine } from './services/RelevanceEngine';
import { RelevanceCache } from './services/RelevanceCache';
import { fundingPrograms } from './data/fundingPrograms';

const loadingMessages = [
  '🔍 Analysiere Ihr Projekt...',
  '🏗️ Bei Spiel-Bau finden Sie Spielplätze für jeden Ort',
  '🎯 Durchsuche über 120 Förderprogramme...',
  '🌳 Spielplätze, die Kinder begeistern',
  '💡 Finde die besten Fördermöglichkeiten...',
  '🏛️ Prüfe Bundes- und Landesprogramme...',
  '⚡ Calisthenics & Outdoor Fitness Anlagen',
  '📋 Erstelle personalisierte Empfehlungen...'
];

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [projectData, setProjectData] = useState(null);
  const [relevanceEngine, setRelevanceEngine] = useState(null);

  // Initialize RelevanceEngine on component mount
  useEffect(() => {
    const initializeRelevanceEngine = async () => {
      try {
        const cache = new RelevanceCache({
          maxSize: 1000,
          defaultTTL: 60 * 60 * 1000, // 1 hour
          enableMetrics: true
        });
        
        const engine = new RelevanceEngine(fundingPrograms, cache);
        
        // Pre-classify programs to populate cache
        const classifiedPrograms = engine.classifyPrograms();
        
        setRelevanceEngine(engine);
        
        console.log('✅ RelevanceEngine initialized successfully');
        console.log(`📊 Processed ${fundingPrograms.length} programs`);
        console.log(`📈 Classification stats:`, engine.getClassificationStats());
        console.log(`🎯 Enhanced programs:`, classifiedPrograms.length);
      } catch (error) {
        console.error('❌ Failed to initialize RelevanceEngine:', error);
        console.warn('🔄 Continuing with legacy filtering for backward compatibility');
        // Continue without RelevanceEngine for backward compatibility
        setRelevanceEngine(null);
      }
    };

    initializeRelevanceEngine();
  }, []);

  useEffect(() => {
    if (loading) {
      let index = 0;
      const interval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[index]);
      }, 2500);
      
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleSubmit = async (data) => {
    setProjectData(data);
    setLoading(true);
    setError(null);
    setLoadingMessage(loadingMessages[0]);
    try {
      // Pass RelevanceEngine to the analysis service
      const analysis = await analyzeProject(data, relevanceEngine);
      setResults({ projectData: data, analysis });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <img 
            src="/logo.png" 
            alt="SPIEL-BAU Logo" 
            className="header-logo"
          />
          <div className="header-text">
            <h1>Fördermittel-Finder</h1>
            <p>Finden Sie die passende Förderung für Ihr Projekt</p>
          </div>
        </div>
      </header>
      
      <div className="container">
        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Fehler:</strong> {error}
          </div>
        )}

        {!results && !loading && <ProjectForm onSubmit={handleSubmit} relevanceEngine={relevanceEngine} />}
        
        {loading && (
          <div className="loading">
            <div style={{ fontSize: '1.3rem', fontWeight: '500' }}>{loadingMessage}</div>
          </div>
        )}
        
        {results && <Results results={results} onReset={handleReset} />}

        {/* Tools always visible at bottom */}
        <ToolsSidebar 
          projectData={projectData || results?.projectData} 
          selectedProgram={results?.analysis?.programs?.[0]}
        />
      </div>
      
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Spiel Bau GmbH</h3>
            <p>Wir unterstützen Sie gerne bei der professionellen Planung Ihres Spielplatzes.</p>
            <p><strong>Website:</strong> <a href="https://www.spiel-bau.de" target="_blank" rel="noopener noreferrer">www.spiel-bau.de</a></p>
          </div>
          <div className="footer-section">
            <h3>Kontakt</h3>
            <p><strong>Tel:</strong> <a href="tel:033812614-0">03381-2614-0</a></p>
            <p><strong>Fax:</strong> 03381-2614-18</p>
            <p><strong>Mail:</strong> <a href="mailto:info@spiel-bau.de">info@spiel-bau.de</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
