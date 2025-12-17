import React, { useState } from 'react';

const ContactRequest = ({ projectData, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
    preferredContact: 'email',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, this would send to a backend
    console.log('Contact request:', { ...formData, projectData });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="tool-view">
        <div className="success-message">
          <span className="success-icon">✅</span>
          <h2>Vielen Dank!</h2>
          <p>Ihre Anfrage wurde erfolgreich übermittelt.</p>
          <p>Ein SPIEL-BAU Experte wird sich innerhalb von 24 Stunden bei Ihnen melden.</p>
          <button onClick={onBack} className="btn" style={{ marginTop: '20px' }}>
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-view">
      <button onClick={onBack} className="btn-back">← Zurück</button>
      
      <div className="tool-header">
        <span className="tool-header-icon">💬</span>
        <div>
          <h2>Kostenlose Beratung</h2>
          <p>Unsere Experten unterstützen Sie bei Ihrem Projekt</p>
        </div>
      </div>

      <div className="contact-benefits">
        <div className="benefit-item">
          <span>🎯</span>
          <div>
            <strong>Individuelle Beratung</strong>
            <p>Persönliche Analyse Ihrer Fördermöglichkeiten</p>
          </div>
        </div>
        <div className="benefit-item">
          <span>📋</span>
          <div>
            <strong>Antragsunterstützung</strong>
            <p>Hilfe bei der Zusammenstellung der Unterlagen</p>
          </div>
        </div>
        <div className="benefit-item">
          <span>💰</span>
          <div>
            <strong>Kostenlos & unverbindlich</strong>
            <p>Keine versteckten Kosten</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ihr Name"
            />
          </div>
          <div className="form-group">
            <label>Organisation</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({...formData, organization: e.target.value})}
              placeholder="Kommune / Verein / Firma"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>E-Mail *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="ihre@email.de"
            />
          </div>
          <div className="form-group">
            <label>Telefon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+49 123 456789"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Wie können wir Ihnen helfen?</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            placeholder="Beschreiben Sie kurz Ihr Projekt und Ihre Fragen..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>Bevorzugte Kontaktart</label>
          <div className="radio-inline">
            <label>
              <input
                type="radio"
                name="preferredContact"
                value="email"
                checked={formData.preferredContact === 'email'}
                onChange={(e) => setFormData({...formData, preferredContact: e.target.value})}
              />
              E-Mail
            </label>
            <label>
              <input
                type="radio"
                name="preferredContact"
                value="phone"
                checked={formData.preferredContact === 'phone'}
                onChange={(e) => setFormData({...formData, preferredContact: e.target.value})}
              />
              Telefon
            </label>
          </div>
        </div>

        <button type="submit" className="btn" style={{ width: '100%' }}>
          📨 Beratung anfragen
        </button>

        <p className="privacy-note">
          Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten gemäß unserer Datenschutzerklärung zu.
        </p>
      </form>
    </div>
  );
};

export default ContactRequest;
