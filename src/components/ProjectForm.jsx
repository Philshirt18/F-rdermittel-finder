import React, { useState } from 'react';

const ProjectForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    federalState: '',
    projectType: '',
    einsatzbereich: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-section">
        <h2>Projektinformationen</h2>
        
        <div className="form-group">
          <label htmlFor="einsatzbereich">Einsatzbereich *</label>
          <select
            id="einsatzbereich"
            name="einsatzbereich"
            value={formData.einsatzbereich}
            onChange={handleChange}
            required
          >
            <option value="">Bitte wählen</option>
            <option value="stadt-quartier">🏙️ Stadt / Quartier</option>
            <option value="laendlicher-raum">🌾 Ländlicher Raum</option>
          </select>
          <p className="help-text">Wählen Sie den Standort aus, wo der Spielplatz neu gebaut wird. Diese Auswahl präzisiert die Fördermittelsuche.</p>
        </div>

        <div className="form-group">
          <label htmlFor="federalState">Bundesland *</label>
          <select
            id="federalState"
            name="federalState"
            value={formData.federalState}
            onChange={handleChange}
            required
          >
            <option value="">Bitte wählen</option>
            <option value="BW">Baden-Württemberg</option>
            <option value="BY">Bayern</option>
            <option value="BE">Berlin</option>
            <option value="BB">Brandenburg</option>
            <option value="HB">Bremen</option>
            <option value="HH">Hamburg</option>
            <option value="HE">Hessen</option>
            <option value="MV">Mecklenburg-Vorpommern</option>
            <option value="NI">Niedersachsen</option>
            <option value="NW">Nordrhein-Westfalen</option>
            <option value="RP">Rheinland-Pfalz</option>
            <option value="SL">Saarland</option>
            <option value="SN">Sachsen</option>
            <option value="ST">Sachsen-Anhalt</option>
            <option value="SH">Schleswig-Holstein</option>
            <option value="TH">Thüringen</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="projectType">Projekttyp *</label>
          <select
            id="projectType"
            name="projectType"
            value={formData.projectType}
            onChange={handleChange}
            required
          >
            <option value="">Bitte wählen</option>
            <option value="playground">Spielplatz</option>
            <option value="calisthenics">Calisthenics / Outdoor Fitness</option>
          </select>
        </div>


      </div>

      <button type="submit" className="btn">
        Fördermittel finden
      </button>
    </form>
  );
};

export default ProjectForm;
