import React, { useState } from 'react';
import { generateCoverLetter } from '../../services/toolsService';

const CoverLetterGenerator = ({ projectData, program, onBack }) => {
  const [formData, setFormData] = useState({
    municipality: '',
    contactPerson: '',
    position: '',
    projectName: projectData?.description?.slice(0, 50) || 'Spielplatzprojekt',
  });
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateCoverLetter({ ...formData, projectData, program });
      setLetter(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    alert('Text in Zwischenablage kopiert!');
  };

  return (
    <div className="tool-view">
      <button onClick={onBack} className="btn-back">← Zurück</button>
      
      <div className="tool-header">
        <span className="tool-header-icon">✉️</span>
        <div>
          <h2>Anschreiben-Generator</h2>
          <p>Erstellen Sie ein professionelles Anschreiben für Ihren Förderantrag</p>
        </div>
      </div>

      {!letter ? (
        <div className="tool-form">
          <div className="form-group">
            <label>Name der Kommune/Organisation *</label>
            <input
              type="text"
              value={formData.municipality}
              onChange={(e) => setFormData({...formData, municipality: e.target.value})}
              placeholder="z.B. Stadt Musterstadt"
            />
          </div>

          <div className="form-group">
            <label>Ansprechpartner *</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
              placeholder="z.B. Max Mustermann"
            />
          </div>

          <div className="form-group">
            <label>Position/Funktion</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              placeholder="z.B. Bürgermeister, Amtsleiter"
            />
          </div>

          <div className="form-group">
            <label>Projektbezeichnung</label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
              placeholder="z.B. Neugestaltung Spielplatz Stadtpark"
            />
          </div>

          {program && (
            <div className="selected-program-hint">
              <strong>Ausgewähltes Förderprogramm:</strong> {program.name}
            </div>
          )}

          <button 
            onClick={handleGenerate} 
            className="btn"
            disabled={!formData.municipality || !formData.contactPerson || loading}
          >
            {loading ? '⏳ Generiere...' : '✨ Anschreiben generieren'}
          </button>
        </div>
      ) : (
        <div className="tool-result">
          <div className="letter-preview">
            <pre>{letter}</pre>
          </div>
          <div className="result-actions">
            <button onClick={handleCopy} className="btn">📋 Kopieren</button>
            <button onClick={() => setLetter('')} className="btn btn-secondary">🔄 Neu erstellen</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverLetterGenerator;
