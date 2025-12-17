import React, { useState } from 'react';
import { analyzeProgramDetails } from '../services/geminiService';

const ProgramDetail = ({ program, projectData, onBack }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  React.useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const result = await analyzeProgramDetails(program, projectData);
        setDetails(result);
      } catch (error) {
        console.error('Error loading details:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [program, projectData]);

  if (loading) {
    return (
      <div className="loading">
        <div style={{ fontSize: '1.3rem', fontWeight: '500' }}>
          🔍 Lade Antragsdetails...
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="loading">
        <div>Lade Details...</div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="program-detail">
      <button onClick={onBack} className="btn-back">
        ← Zurück
      </button>

      {/* Header Card */}
      <div className="detail-header">
        <div className="detail-header-main">
          <h2>{program.name}</h2>
          <div className="detail-badges">
            <span className={`eligibility ${program.eligibility.toLowerCase().replace(' ', '-')}`}>
              {program.eligibility}
            </span>
            <span className="funding-badge">💰 {program.fundingRate}</span>
          </div>
        </div>
        <div 
          className="detail-score" 
          style={{ borderColor: getScoreColor(program.fitScore) }}
        >
          <span style={{ color: getScoreColor(program.fitScore) }}>{program.fitScore}%</span>
          <small>Match</small>
        </div>
      </div>

      {/* Quick Info */}
      <div className="quick-info">
        <p>{program.description}</p>
        {program.source && (
          <a href={program.source} target="_blank" rel="noopener noreferrer" className="source-btn">
            🔗 Offizielle Quelle öffnen
          </a>
        )}
      </div>

      {/* Collapsible Sections */}
      <div className="detail-sections">
        
        {/* Unterlagen - Collapsed by default */}
        <div className="detail-section-card">
          <div className="section-header" onClick={() => toggleSection('docs')}>
            <h3>📋 Benötigte Unterlagen ({details.requiredDocuments?.length || 0})</h3>
            <span className="toggle-icon">{expandedSections.docs ? '−' : '+'}</span>
          </div>
          {expandedSections.docs && (
            <div className="section-content">
              {details.requiredDocuments?.slice(0, 5).map((doc, i) => (
                <div key={i} className="doc-item">
                  <span className="doc-check">✓</span>
                  <div>
                    <strong>{doc.name}</strong>
                    {doc.where && <p className="doc-where">📍 {doc.where}</p>}
                  </div>
                </div>
              ))}
              {details.requiredDocuments?.length > 5 && (
                <p className="more-hint">+ {details.requiredDocuments.length - 5} weitere...</p>
              )}
            </div>
          )}
        </div>

        {/* Schritte - Show first 3 always */}
        <div className="detail-section-card">
          <div className="section-header" onClick={() => toggleSection('steps')}>
            <h3>🎯 Nächste Schritte ({details.stepByStep?.length || 0})</h3>
            <span className="toggle-icon">{expandedSections.steps ? '−' : '+'}</span>
          </div>
          {expandedSections.steps && (
            <div className="section-content">
              {details.stepByStep?.slice(0, 5).map((step, i) => (
                <div key={i} className="step-item">
                  <span className="step-number">{i + 1}</span>
                  <div>
                    <strong>{step.action}</strong>
                    {step.deadline && <p className="step-deadline">⏰ {step.deadline}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kontakte - nur mit verifizierter Quelle */}
        {details.contacts?.length > 0 && (
          <div className="detail-section-card">
            <div className="section-header" onClick={() => toggleSection('contacts')}>
              <h3>👥 Ansprechpartner</h3>
              <span className="toggle-icon">{expandedSections.contacts ? '−' : '+'}</span>
            </div>
            {expandedSections.contacts && (
              <div className="section-content">
                {details.contacts.slice(0, 3).map((contact, i) => (
                  <div key={i} className="contact-item">
                    <strong>{contact.role}</strong>
                    {contact.organization && <p>{contact.organization}</p>}
                  </div>
                ))}
                {program.source && (
                  <div className="contact-source-hint">
                    <p>📍 Kontaktdaten finden Sie auf der offiziellen Seite:</p>
                    <a href={program.source} target="_blank" rel="noopener noreferrer">
                      {program.source}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fristen */}
        {details.deadlines?.length > 0 && (
          <div className="detail-section-card warning">
            <div className="section-header" onClick={() => toggleSection('deadlines')}>
              <h3>⏰ Wichtige Fristen</h3>
              <span className="toggle-icon">{expandedSections.deadlines ? '−' : '+'}</span>
            </div>
            {expandedSections.deadlines && (
              <div className="section-content">
                {details.deadlines.map((d, i) => (
                  <div key={i} className="deadline-item">
                    <strong>{d.name}</strong>
                    <p>{d.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tipps */}
        {details.tips?.length > 0 && (
          <div className="detail-section-card tips">
            <div className="section-header" onClick={() => toggleSection('tips')}>
              <h3>💡 Tipps ({details.tips.length})</h3>
              <span className="toggle-icon">{expandedSections.tips ? '−' : '+'}</span>
            </div>
            {expandedSections.tips && (
              <div className="section-content">
                {details.tips.slice(0, 4).map((tip, i) => (
                  <p key={i} className="tip-item">💡 {tip}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={onBack} className="btn" style={{ marginTop: '20px', width: '100%' }}>
        ← Zurück zur Übersicht
      </button>
    </div>
  );
};

export default ProgramDetail;
