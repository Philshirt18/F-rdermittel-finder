import React, { useState } from 'react';
import { exportToPDF } from '../services/exportService';
import ProgramDetail from './ProgramDetail';
import RelevanceIndicator from './RelevanceIndicator';
import FederalStateBadge from './FederalStateBadge';
import ResultsSummary from './ResultsSummary';

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

  if (selectedProgram) {
    return (
      <ProgramDetail 
        program={selectedProgram} 
        projectData={projectData}
        onBack={() => setSelectedProgram(null)} 
      />
    );
  }

  // Handle empty results case
  if (!analysis.programs || analysis.programs.length === 0) {
    return (
      <div className="results">
        <div className="empty-results">
          <div className="empty-icon">🔍</div>
          <h2>Keine passenden Programme gefunden</h2>
          <p>
            Für Ihre Kriterien konnten keine passenden Förderprogramme gefunden werden. 
            Versuchen Sie es mit anderen Einstellungen oder kontaktieren Sie uns für eine persönliche Beratung.
          </p>
          <button onClick={onReset} className="btn">
            🔄 Neue Suche starten
          </button>
        </div>
      </div>
    );
  }

  const topProgram = analysis.programs?.[0];

  return (
    <div className="results">
      {/* Enhanced Summary */}
      <ResultsSummary 
        programs={analysis.programs} 
        topProgram={topProgram}
      />

      <h2>Empfohlene Förderprogramme</h2>

      {/* Group programs by category */}
      {(() => {
        const corePrograms = analysis.programs.filter(p => p.category === 'core');
        const conditionalPrograms = analysis.programs.filter(p => p.category === 'conditional');
        
        // Simple debug output
        console.log('Results Debug - Federal State:', projectData.federalState);
        console.log('Results Debug - Core programs:', corePrograms.map(p => `${p.name} (${p.federalStates?.join(',')})`));
        console.log('Results Debug - Conditional programs:', conditionalPrograms.map(p => `${p.name} (${p.federalStates?.join(',')})`));
        
        return (
          <>
            {/* Core Programs Section */}
            {corePrograms.length > 0 && (
              <div className="program-section">
                <div className="section-header core-section" style={{
                  backgroundColor: '#d4edda',
                  border: '2px solid #28a745',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🟢</span>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      color: '#155724', 
                      fontSize: '1.25rem',
                      fontWeight: '600'
                    }}>
                      Der Spielplatz/Calisthenics ist das Hauptprojekt
                    </h3>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      color: '#155724', 
                      fontSize: '0.9rem',
                      opacity: 0.8
                    }}>
                      Direkte Förderung für einzelne Spielplatz- und Bewegungsanlagen
                    </p>
                  </div>
                </div>
                
                {corePrograms.map((program, index) => {
                  const isExpanded = expandedCards[`core-${index}`];
                  const isStateSpecific = program.federalStates && 
                    program.federalStates.includes(projectData.federalState) && 
                    !program.federalStates.includes('all');
                  
                  return (
                    <div key={`core-${index}`} className={`program-card compact ${isExpanded ? 'expanded' : ''}`}>
                      {/* State-specific indicator */}
                      {isStateSpecific && (
                        <div className="state-specific-indicator" style={{
                          backgroundColor: '#e3f2fd',
                          border: '1px solid #2196f3',
                          borderRadius: '0.375rem 0.375rem 0 0',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          color: '#1565c0',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span>🏛️</span>
                          Bundeslandspezifisch für {projectData.federalState} - Höhere Förderchancen
                        </div>
                      )}
                      
                      {/* Card Header */}
                      <div className="card-header" onClick={() => toggleCard(`core-${index}`)}>
                        <div className="card-main-info">
                          <div className="card-title-row">
                            <h3 className="program-title">{program.name}</h3>
                            <div className="program-badges" style={{
                              display: 'flex',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                              alignItems: 'center'
                            }}>
                              {/* Category Badge */}
                              <span className="category-badge core" style={{
                                backgroundColor: '#d4edda',
                                color: '#155724',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                🟢 Einzelförderung
                              </span>
                              
                              {/* State Badge */}
                              {isStateSpecific ? (
                                <span className="state-badge state-specific" style={{
                                  backgroundColor: '#e3f2fd',
                                  color: '#1565c0',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  🏛️ {projectData.federalState}
                                </span>
                              ) : (
                                <span className="state-badge bundesweit" style={{
                                  backgroundColor: '#f3e5f5',
                                  color: '#7b1fa2',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  🇩🇪 Bundesweit
                                </span>
                              )}
                              
                              <span className={`eligibility ${program.eligibility.toLowerCase().replace(' ', '-')}`}>
                                {program.eligibility}
                              </span>
                            </div>
                          </div>
                          <div className="card-meta">
                            {program.fundingRate && (
                              <span className="funding-badge">💰 {program.fundingRate}</span>
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
                                {program.whyItFits.slice(0, 2).map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="detail-section">
                              <h4>📋 Nächste Schritte</h4>
                              <ul>
                                {program.nextSteps.slice(0, 2).map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                              <div className="planning-support" style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '0.5rem',
                                border: '1px solid #e9ecef'
                              }}>
                                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#495057' }}>
                                  <strong>Spiel Bau GmbH</strong> unterstützt Sie gerne bei der professionellen Planung Ihres Spielplatzes.
                                </p>
                                <button 
                                  onClick={() => window.open('https://spielbau-experten.de/termin', '_blank')}
                                  className="btn btn-cta"
                                  style={{
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    display: 'inline-block'
                                  }}
                                >
                                  📞 Jetzt Termin vereinbaren
                                </button>
                              </div>
                            </div>
                          </div>

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
              </div>
            )}

            {/* Conditional Programs Section */}
            {conditionalPrograms.length > 0 && (
              <div className="program-section">
                <div className="section-header conditional-section" style={{
                  backgroundColor: '#fff3cd',
                  border: '2px solid #ffc107',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  marginTop: corePrograms.length > 0 ? '2rem' : '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🟡</span>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      color: '#856404', 
                      fontSize: '1.25rem',
                      fontWeight: '600'
                    }}>
                      Ihr Spielplatz ist Teil eines größeren Projekts
                    </h3>
                    <p style={{ 
                      margin: '0.25rem 0 0 0', 
                      color: '#856404', 
                      fontSize: '0.9rem',
                      opacity: 0.8
                    }}>
                      Städtebauförderung - Spielplatz als Teil von Quartiersentwicklung oder Sanierungsgebieten
                    </p>
                  </div>
                </div>
                
                {conditionalPrograms.map((program, index) => {
                  const isExpanded = expandedCards[`conditional-${index}`];
                  const isStateSpecific = program.federalStates && 
                    program.federalStates.includes(projectData.federalState) && 
                    !program.federalStates.includes('all');
                  
                  return (
                    <div key={`conditional-${index}`} className={`program-card compact ${isExpanded ? 'expanded' : ''} conditional-program`}>
                      {/* State-specific indicator */}
                      {isStateSpecific && (
                        <div className="state-specific-indicator" style={{
                          backgroundColor: '#e3f2fd',
                          border: '1px solid #2196f3',
                          borderRadius: '0.375rem 0.375rem 0 0',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          color: '#1565c0',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span>🏛️</span>
                          Bundeslandspezifisch für {projectData.federalState} - Höhere Förderchancen
                        </div>
                      )}
                      
                      {/* Card Header */}
                      <div className="card-header" onClick={() => toggleCard(`conditional-${index}`)}>
                        <div className="card-main-info">
                          <div className="card-title-row">
                            <h3 className="program-title">{program.name}</h3>
                            <div className="program-badges" style={{
                              display: 'flex',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                              alignItems: 'center'
                            }}>
                              {/* Category Badge */}
                              <span className="category-badge conditional" style={{
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                🟡 Städtebauförderung
                              </span>
                              
                              {/* State Badge */}
                              {isStateSpecific ? (
                                <span className="state-badge state-specific" style={{
                                  backgroundColor: '#e3f2fd',
                                  color: '#1565c0',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  🏛️ {projectData.federalState}
                                </span>
                              ) : (
                                <span className="state-badge bundesweit" style={{
                                  backgroundColor: '#f3e5f5',
                                  color: '#7b1fa2',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  🇩🇪 Bundesweit
                                </span>
                              )}
                              
                              <span className={`eligibility ${program.eligibility.toLowerCase().replace(' ', '-')}`}>
                                {program.eligibility}
                              </span>
                            </div>
                          </div>
                          <div className="card-meta">
                            {program.fundingRate && (
                              <span className="funding-badge">💰 {program.fundingRate}</span>
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
                                {program.whyItFits.slice(0, 2).map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="detail-section">
                              <h4>📋 Nächste Schritte</h4>
                              <ul>
                                {program.nextSteps.slice(0, 2).map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                              <div className="planning-support" style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '0.5rem',
                                border: '1px solid #e9ecef'
                              }}>
                                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#495057' }}>
                                  <strong>Spiel Bau GmbH</strong> unterstützt Sie gerne bei der professionellen Planung Ihres Spielplatzes.
                                </p>
                                <button 
                                  onClick={() => window.open('https://spielbau-experten.de/termin', '_blank')}
                                  className="btn btn-cta"
                                  style={{
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    display: 'inline-block'
                                  }}
                                >
                                  📞 Jetzt Termin vereinbaren
                                </button>
                              </div>
                            </div>
                          </div>

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
              </div>
            )}
          </>
        );
      })()}

      {analysis.combinationAdvice && (
        <div className="combination-hint">
          <span className="hint-icon">💡</span>
          <p>{analysis.combinationAdvice}</p>
        </div>
      )}

      <div className="export-buttons">
        <button onClick={handleExportPDF} className="btn">📄 PDF Export</button>
        <button onClick={onReset} className="btn btn-secondary">🔄 Neue Suche</button>
      </div>

      <div className="disclaimer">
        <strong>Hinweis:</strong> Diese Empfehlungen dienen als Orientierung und stellen keine Rechtsberatung dar.
      </div>
    </div>
  );
};

export default Results;