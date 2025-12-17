import React, { useState } from 'react';
import { exportToPDF, exportToJSON } from '../services/exportService';
import ProgramDetail from './ProgramDetail';

const Results = ({ results, onReset }) => {
  const { projectData, analysis } = results;
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  const toggleCard = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#f59e0b'; // yellow/orange
    return '#ef4444'; // red
  };

  const handleExportPDF = () => exportToPDF(results);
  const handleExportJSON = () => exportToJSON(results);

  if (selectedProgram) {
    return (
      <ProgramDetail 
        program={selectedProgram} 
        projectData={projectData}
        onBack={() => setSelectedProgram(null)} 
      />
    );
  }

  const topProgram = analysis.programs?.[0];

  return (
    <div className="results">
      {/* Summary Banner */}
      <div className="results-summary">
        <div className="summary-count">
          <span className="count-number">{analysis.programs?.length || 0}</span>
          <span className="count-label">passende Programme gefunden</span>
        </div>
        {topProgram && (
          <div className="best-match">
            <span className="best-label">🏆 Beste Empfehlung:</span>
            <span className="best-name">{topProgram.name}</span>
            <span className="best-score" style={{ color: getScoreColor(topProgram.fitScore) }}>
              {topProgram.fitScore}%
            </span>
          </div>
        )}
      </div>

      <h2>Empfohlene Förderprogramme</h2>

      {/* Program Cards */}
      {analysis.programs && analysis.programs.map((program, index) => {
        const isExpanded = expandedCards[index];
        
        return (
          <div key={index} className={`program-card compact ${isExpanded ? 'expanded' : ''}`}>
            {/* Always visible header */}
            <div className="card-header" onClick={() => toggleCard(index)}>
              <div className="card-main-info">
                <div className="card-title-row">
                  <h3 className="program-title">{program.name}</h3>
                  <span className={`eligibility ${program.eligibility.toLowerCase().replace(' ', '-')}`}>
                    {program.eligibility}
                  </span>
                </div>
                <div className="card-meta">
                  {program.fundingRate && (
                    <span className="funding-badge">💰 {program.fundingRate}</span>
                  )}
                  {program.source && (
                    <a 
                      href={program.source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="source-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🔗 Zur Quelle
                    </a>
                  )}
                </div>
              </div>
              <div className="card-score-section">
                <div 
                  className="fit-score-circle" 
                  style={{ borderColor: getScoreColor(program.fitScore) }}
                >
                  <span className="score-value" style={{ color: getScoreColor(program.fitScore) }}>
                    {program.fitScore}%
                  </span>
                  <span className="score-label">Match</span>
                </div>
                <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expandable content */}
            {isExpanded && (
              <div className="card-details">
                <div className="details-grid">
                  <div className="detail-section">
                    <h4>✅ Warum passt das?</h4>
                    <ul>
                      {program.whyItFits.slice(0, 3).map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="detail-section">
                    <h4>📋 Nächste Schritte</h4>
                    <ul>
                      {program.nextSteps.slice(0, 3).map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {program.risks && program.risks.length > 0 && (
                  <div className="detail-section warning">
                    <h4>⚠️ Risiken</h4>
                    <ul>
                      {program.risks.slice(0, 2).map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedProgram(program)} 
                  className="btn btn-details"
                >
                  📋 Vollständige Antragsanleitung
                </button>
              </div>
            )}
          </div>
        );
      })}

      {analysis.combinationAdvice && (
        <div className="combination-hint">
          <span className="hint-icon">💡</span>
          <p>{analysis.combinationAdvice}</p>
        </div>
      )}

      <div className="export-buttons">
        <button onClick={handleExportPDF} className="btn">📄 PDF Export</button>
        <button onClick={handleExportJSON} className="btn btn-secondary">💾 JSON</button>
        <button onClick={onReset} className="btn btn-secondary">🔄 Neue Suche</button>
      </div>

      <div className="disclaimer">
        <strong>Hinweis:</strong> Diese Empfehlungen dienen als Orientierung und stellen keine Rechtsberatung dar.
      </div>
    </div>
  );
};

export default Results;
