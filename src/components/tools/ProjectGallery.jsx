import React, { useState } from 'react';

const projects = [
  {
    id: 1,
    type: 'playground',
    title: 'Naturspielplatz Waldkindergarten',
    location: 'Bayern',
    budget: '85.000 €',
    funding: 'Städtebauförderung (60%)',
    description: 'Naturnaher Spielplatz mit Holzgeräten, Wasserspiel und Kletterlandschaft',
    features: ['Robinienholz', 'Wasserspiel', 'Sandbereich', 'Nestschaukel'],
    image: '🌳',
  },
  {
    id: 2,
    type: 'playground',
    title: 'Inklusiver Spielplatz Stadtpark',
    location: 'NRW',
    budget: '220.000 €',
    funding: 'Aktion Mensch + Kommune',
    description: 'Barrierefreier Spielplatz für Kinder mit und ohne Behinderung',
    features: ['Rollstuhlgerecht', 'Bodentrampolin', 'Sensorik-Elemente', 'Karussell'],
    image: '♿',
  },
  {
    id: 3,
    type: 'fitness',
    title: 'Outdoor-Fitness Generationenpark',
    location: 'Baden-Württemberg',
    budget: '65.000 €',
    funding: 'Sportstättenförderung (50%)',
    description: 'Calisthenics-Anlage für alle Altersgruppen',
    features: ['Calisthenics', 'Senioren-Geräte', 'Laufstrecke', 'Dehnbereich'],
    image: '💪',
  },
  {
    id: 4,
    type: 'combination',
    title: 'Familien-Aktivpark',
    location: 'Hessen',
    budget: '180.000 €',
    funding: 'LEADER + Eigenmittel',
    description: 'Kombination aus Spielplatz und Fitness für die ganze Familie',
    features: ['Spielgeräte', 'Fitness-Parcours', 'Picknickbereich', 'Trinkbrunnen'],
    image: '👨‍👩‍👧‍👦',
  },
  {
    id: 5,
    type: 'playground',
    title: 'Schulhof-Neugestaltung',
    location: 'Niedersachsen',
    budget: '120.000 €',
    funding: 'Ganztagsschulprogramm',
    description: 'Bewegungsfreundlicher Schulhof mit verschiedenen Zonen',
    features: ['Klettergerüst', 'Ballspielfeld', 'Ruhezone', 'Balancierparcours'],
    image: '🏫',
  },
  {
    id: 6,
    type: 'fitness',
    title: 'Street Workout Park',
    location: 'Berlin',
    budget: '45.000 €',
    funding: 'Bezirksförderung',
    description: 'Moderne Calisthenics-Anlage für Jugendliche und Erwachsene',
    features: ['Pull-up Bars', 'Dip Station', 'Monkey Bars', 'Parkour-Elemente'],
    image: '🏋️',
  },
];

const ProjectGallery = ({ projectType, onBack }) => {
  const [filter, setFilter] = useState(projectType || 'all');
  const [selectedProject, setSelectedProject] = useState(null);

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.type === filter);

  if (selectedProject) {
    return (
      <div className="tool-view">
        <button onClick={() => setSelectedProject(null)} className="btn-back">← Zurück zur Galerie</button>
        
        <div className="project-detail-view">
          <div className="project-detail-header">
            <span className="project-emoji">{selectedProject.image}</span>
            <div>
              <h2>{selectedProject.title}</h2>
              <p className="project-location">📍 {selectedProject.location}</p>
            </div>
          </div>

          <div className="project-detail-info">
            <div className="info-card">
              <span className="info-label">Budget</span>
              <span className="info-value">{selectedProject.budget}</span>
            </div>
            <div className="info-card">
              <span className="info-label">Förderung</span>
              <span className="info-value">{selectedProject.funding}</span>
            </div>
          </div>

          <div className="project-description">
            <h3>Projektbeschreibung</h3>
            <p>{selectedProject.description}</p>
          </div>

          <div className="project-features">
            <h3>Ausstattung</h3>
            <div className="features-grid">
              {selectedProject.features.map((feature, i) => (
                <span key={i} className="feature-tag">✓ {feature}</span>
              ))}
            </div>
          </div>

          <div className="project-cta">
            <p>Gefällt Ihnen dieses Projekt?</p>
            <button onClick={onBack} className="btn">
              💬 Ähnliches Projekt anfragen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-view">
      <button onClick={onBack} className="btn-back">← Zurück</button>
      
      <div className="tool-header">
        <span className="tool-header-icon">🖼️</span>
        <div>
          <h2>Projekt-Galerie</h2>
          <p>Lassen Sie sich von realisierten Projekten inspirieren</p>
        </div>
      </div>

      <div className="gallery-filters">
        {[
          { id: 'all', label: 'Alle' },
          { id: 'playground', label: '🎠 Spielplätze' },
          { id: 'fitness', label: '💪 Fitness' },
          { id: 'combination', label: '🎯 Kombi' },
        ].map(f => (
          <button
            key={f.id}
            className={`filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="gallery-grid">
        {filteredProjects.map(project => (
          <div 
            key={project.id} 
            className="gallery-card"
            onClick={() => setSelectedProject(project)}
          >
            <div className="gallery-card-image">
              <span>{project.image}</span>
            </div>
            <div className="gallery-card-content">
              <h3>{project.title}</h3>
              <p className="gallery-location">📍 {project.location}</p>
              <p className="gallery-budget">💰 {project.budget}</p>
              <span className="gallery-funding">{project.funding}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectGallery;
