import React, { useState } from 'react';
import { generateProjectDescription } from '../../services/toolsService';

const ProjectDescriptionAssistant = ({ projectData, program, onBack }) => {
  const [formData, setFormData] = useState({
    currentState: '',
    targetGroups: '',
    goals: '',
    specialFeatures: '',
  });
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateProjectDescription({ ...formData, projectData, program });
      setDescription(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(description);
    alert('Text in Zwischenablage kopiert!');
  };

  return (
    <div className="tool-view">
      <button onClick={onBack} className="btn-back">← Zurück</button>
      
      <div className="tool-header">
        <span className="tool-header-icon">📝</span>
        <div>
          <h2>Projektbeschreibungs-Assistent</h2>
          <p>Erstellen Sie eine professionelle Projektbeschreibung für Ihren Antrag</p>
        </div>
      </div>

      {!description ? (
        <div className="tool-form">
          <div className="form-group">
            <label>Aktuelle Situation / Ausgangslage *</label>
            <textarea
              value={formData.currentState}
              onChange={(e) => setFormData({...formData, currentState: e.target.value})}
              placeholder="Beschreiben Sie den aktuellen Zustand (z.B. alter Spielplatz, kein Spielplatz vorhanden, Sanierungsbedarf...)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Zielgruppen *</label>
            <textarea
              value={formData.targetGroups}
              onChange={(e) => setFormData({...formData, targetGroups: e.target.value})}
              placeholder="Wer soll den Spielplatz nutzen? (z.B. Kinder 3-12 Jahre, Familien, Senioren, Menschen mit Behinderung...)"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Projektziele *</label>
            <textarea
              value={formData.goals}
              onChange={(e) => setFormData({...formData, goals: e.target.value})}
              placeholder="Was soll erreicht werden? (z.B. Bewegungsförderung, soziale Begegnung, Aufwertung des Quartiers...)"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Besonderheiten (optional)</label>
            <textarea
              value={formData.specialFeatures}
              onChange={(e) => setFormData({...formData, specialFeatures: e.target.value})}
              placeholder="Gibt es besondere Aspekte? (z.B. Inklusion, Naturmaterialien, Bürgerbeteiligung, Nachhaltigkeit...)"
              rows={2}
            />
          </div>

          <button 
            onClick={handleGenerate} 
            className="btn"
            disabled={!formData.currentState || !formData.targetGroups || !formData.goals || loading}
          >
            {loading ? '⏳ Generiere...' : '✨ Projektbeschreibung erstellen'}
          </button>
        </div>
      ) : (
        <div className="tool-result">
          <div className="description-preview">
            <div dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br/>') }} />
          </div>
          <div className="result-actions">
            <button onClick={handleCopy} className="btn">📋 Kopieren</button>
            <button onClick={() => setDescription('')} className="btn btn-secondary">🔄 Neu erstellen</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDescriptionAssistant;
