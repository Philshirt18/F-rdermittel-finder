import React, { useState } from 'react';

const ProjectForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    applicant: '',
    federalState: '',
    projectType: '',
    description: '',
    measures: [],
    budget: '',
    timeline: '',
    requirements: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (measure) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.includes(measure)
        ? prev.measures.filter(m => m !== measure)
        : [...prev.measures, measure]
    }));
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
          <label htmlFor="description">Beschreiben Sie Ihr Projekt *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="z.B. Neuer Spielplatz im Stadtzentrum mit inklusiven Spielgeräten"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="applicant">Wer beantragt? *</label>
          <select
            id="applicant"
            name="applicant"
            value={formData.applicant}
            onChange={handleChange}
            required
          >
            <option value="">Bitte wählen</option>
            <option value="city">Stadt</option>
            <option value="municipality">Gemeinde</option>
            <option value="district">Landkreis</option>
            <option value="association">Verein (über Gemeinde)</option>
          </select>
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
            <option value="combination">Kombination (Spielplatz + Fitness)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Was wird gemacht?</label>
          <div className="checkbox-group">
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="newBuild"
                checked={formData.measures.includes('newBuild')}
                onChange={() => handleCheckbox('newBuild')}
              />
              <label htmlFor="newBuild">Neubau</label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="renovation"
                checked={formData.measures.includes('renovation')}
                onChange={() => handleCheckbox('renovation')}
              />
              <label htmlFor="renovation">Sanierung</label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="accessibility"
                checked={formData.measures.includes('accessibility')}
                onChange={() => handleCheckbox('accessibility')}
              />
              <label htmlFor="accessibility">Barrierefreiheit</label>
            </div>
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="greening"
                checked={formData.measures.includes('greening')}
                onChange={() => handleCheckbox('greening')}
              />
              <label htmlFor="greening">Begrünung</label>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="budget">Budget (optional)</label>
          <input
            type="text"
            id="budget"
            name="budget"
            value={formData.budget}
            onChange={handleChange}
            placeholder="z.B. 50.000 - 100.000 EUR"
          />
        </div>

        <div className="form-group">
          <label htmlFor="timeline">Zeitplan (optional)</label>
          <input
            type="text"
            id="timeline"
            name="timeline"
            value={formData.timeline}
            onChange={handleChange}
            placeholder="z.B. Start 2026, Fertigstellung 2027"
          />
        </div>

        <div className="form-group">
          <label htmlFor="requirements">Besondere Anforderungen (optional)</label>
          <textarea
            id="requirements"
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            placeholder="z.B. Mindestfördersatz 70%, kombinierbar mit Landesförderung"
          />
        </div>
      </div>

      <button type="submit" className="btn">
        Fördermittel finden
      </button>
    </form>
  );
};

export default ProjectForm;
