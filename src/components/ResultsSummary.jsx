import React from 'react';
import RelevanceIndicator from './RelevanceIndicator';

const ResultsSummary = ({ programs, topProgram }) => {
  // Calculate detailed relevance breakdown
  const getDetailedBreakdown = (programs) => {
    if (!programs || programs.length === 0) return null;
    
    const breakdown = {
      total: programs.length,
      byRelevance: {},
      byStateSpecificity: {
        federalState: 0,
        national: 0
      }
    };
    
    programs.forEach(program => {
      const level = program.relevanceLevel || 3;
      breakdown.byRelevance[level] = (breakdown.byRelevance[level] || 0) + 1;
      
      if (program.isFederalStateSpecific) {
        breakdown.byStateSpecificity.federalState++;
      } else {
        breakdown.byStateSpecificity.national++;
      }
    });
    
    return breakdown;
  };

  const breakdown = getDetailedBreakdown(programs);

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#f59e0b'; // yellow/orange
    return '#ef4444'; // red
  };

  const getRelevanceLevelConfig = (level) => {
    switch (level) {
      case 1:
        return { label: 'Kernprogramme', icon: '🎯', color: '#22c55e' };
      case 2:
        return { label: 'Ergänzende', icon: '⭐', color: '#f59e0b' };
      case 3:
        return { label: 'Bundesweite', icon: '🌐', color: '#3b82f6' };
      default:
        return { label: 'Sonstige', icon: '❓', color: '#6b7280' };
    }
  };

  if (!breakdown) {
    return null;
  }

  return (
    <div className="results-summary-enhanced" style={{
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    }}>
      {/* Main Count Display */}
      <div className="summary-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div className="count-section">
          <div className="main-count" style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1e293b',
            lineHeight: '1'
          }}>
            {breakdown.total}
          </div>
          <div className="count-label" style={{
            fontSize: '0.875rem',
            color: '#64748b',
            fontWeight: '500'
          }}>
            passende Programme gefunden
          </div>
        </div>

        {/* Best Match Display */}
        {topProgram && (
          <div className="best-match" style={{
            textAlign: 'right',
            minWidth: '200px'
          }}>
            <div className="best-label" style={{
              fontSize: '0.75rem',
              color: '#64748b',
              marginBottom: '0.25rem'
            }}>
              🏆 Beste Empfehlung
            </div>
            <div className="best-name" style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: '0.25rem'
            }}>
              {topProgram.name}
            </div>
            <div 
              className="best-score" 
              style={{ 
                color: getScoreColor(topProgram.fitScore),
                fontSize: '1.25rem',
                fontWeight: '700'
              }}
            >
              {topProgram.fitScore}% Match
            </div>
          </div>
        )}
      </div>

      {/* Relevance Level Breakdown */}
      <div className="relevance-breakdown" style={{
        marginBottom: '1rem'
      }}>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '0.75rem',
          margin: '0 0 0.75rem 0'
        }}>
          📊 Verteilung nach Relevanz
        </h4>
        
        <div className="breakdown-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem'
        }}>
          {[1, 2, 3].map(level => {
            const count = breakdown.byRelevance[level] || 0;
            const config = getRelevanceLevelConfig(level);
            const percentage = breakdown.total > 0 ? Math.round((count / breakdown.total) * 100) : 0;
            
            return (
              <div 
                key={level}
                className="breakdown-item"
                style={{
                  backgroundColor: 'white',
                  border: `1px solid ${config.color}20`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: config.color,
                  marginBottom: '0.25rem'
                }}>
                  {count}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  marginBottom: '0.25rem'
                }}>
                  <span>{config.icon}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: config.color
                  }}>
                    {config.label}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.625rem',
                  color: '#64748b'
                }}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Federal State vs National Distribution */}
      <div className="state-distribution" style={{
        borderTop: '1px solid #e2e8f0',
        paddingTop: '1rem'
      }}>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '0.75rem',
          margin: '0 0 0.75rem 0'
        }}>
          🏛️ Bundesland vs. Bundesweit
        </h4>
        
        <div className="distribution-bars" style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {/* Federal State Programs */}
          <div className="distribution-item" style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.25rem'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#0284c7'
              }}>
                🏛️ Bundeslandspezifisch
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#0284c7'
              }}>
                {breakdown.byStateSpecificity.federalState}
              </span>
            </div>
            <div style={{
              height: '0.5rem',
              backgroundColor: '#e0f2fe',
              borderRadius: '0.25rem',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#0284c7',
                width: `${breakdown.total > 0 ? (breakdown.byStateSpecificity.federalState / breakdown.total) * 100 : 0}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* National Programs */}
          <div className="distribution-item" style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.25rem'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#7c3aed'
              }}>
                🌐 Bundesweit
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#7c3aed'
              }}>
                {breakdown.byStateSpecificity.national}
              </span>
            </div>
            <div style={{
              height: '0.5rem',
              backgroundColor: '#f3e8ff',
              borderRadius: '0.25rem',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#7c3aed',
                width: `${breakdown.total > 0 ? (breakdown.byStateSpecificity.national / breakdown.total) * 100 : 0}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quality Indicator */}
      {breakdown.total > 0 && (
        <div className="quality-indicator" style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: breakdown.byRelevance[1] > 0 ? '#dcfce7' : '#fef3c7',
          border: `1px solid ${breakdown.byRelevance[1] > 0 ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '0.5rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: breakdown.byRelevance[1] > 0 ? '#15803d' : '#d97706'
          }}>
            {breakdown.byRelevance[1] > 0 
              ? `✅ Ausgezeichnet! ${breakdown.byRelevance[1]} hochrelevante Kernprogramme gefunden`
              : breakdown.byRelevance[2] > 0
                ? `⭐ Gut! ${breakdown.byRelevance[2]} ergänzende Programme verfügbar`
                : `🌐 ${breakdown.byRelevance[3] || 0} bundesweite Programme gefunden`
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsSummary;