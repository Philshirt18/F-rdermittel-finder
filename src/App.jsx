import React, { useState, useEffect } from 'react';
import ProjectForm from './components/ProjectForm';
import Results from './components/Results';
import ToolsSidebar from './components/ToolsSidebar';
import { analyzeProject } from './services/geminiService';

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
      const analysis = await analyzeProject(data);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
          <img 
            src="/logo.png" 
            alt="SPIEL-BAU Logo" 
            style={{ height: '80px', width: 'auto' }}
          />
          <h1 style={{ margin: 0 }}>Fördermittel-Finder</h1>
        </div>
        <p>Finden Sie die passende Förderung für Ihr Projekt</p>
      </header>
      
      <div className="container">
        {error && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Fehler:</strong> {error}
          </div>
        )}

        {!results && !loading && <ProjectForm onSubmit={handleSubmit} />}
        
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
    </div>
  );
}

export default App;
