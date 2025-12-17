import React, { useState } from 'react';
import CoverLetterGenerator from './tools/CoverLetterGenerator';
import ProjectDescriptionAssistant from './tools/ProjectDescriptionAssistant';
import CostCalculator from './tools/CostCalculator';
import ChecklistExport from './tools/ChecklistExport';
import ContactRequest from './tools/ContactRequest';
import ProjectGallery from './tools/ProjectGallery';

const tools = [
  { id: 'letter', icon: '✉️', name: 'Anschreiben', desc: 'Förderantrag-Anschreiben generieren' },
  { id: 'description', icon: '📝', name: 'Projektbeschreibung', desc: 'Professionelle Beschreibung erstellen' },
  { id: 'calculator', icon: '🧮', name: 'Kosten-Kalkulator', desc: 'Projektkosten schätzen' },
  { id: 'checklist', icon: '✅', name: 'Checkliste', desc: 'Unterlagen-Checkliste exportieren' },
  { id: 'contact', icon: '💬', name: 'Beratung', desc: 'Kostenlose Expertenberatung' },
  { id: 'gallery', icon: '🖼️', name: 'Inspiration', desc: 'Projekt-Galerie & Referenzen' },
];

const ToolsSidebar = ({ projectData, selectedProgram }) => {
  const [activeTool, setActiveTool] = useState(null);

  const renderToolContent = () => {
    const commonProps = {
      projectData,
      program: selectedProgram,
      onBack: () => setActiveTool(null),
    };

    switch (activeTool) {
      case 'letter':
        return <CoverLetterGenerator {...commonProps} />;
      case 'description':
        return <ProjectDescriptionAssistant {...commonProps} />;
      case 'calculator':
        return <CostCalculator {...commonProps} />;
      case 'checklist':
        return <ChecklistExport {...commonProps} />;
      case 'contact':
        return <ContactRequest {...commonProps} />;
      case 'gallery':
        return <ProjectGallery projectType={projectData?.projectType} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Inline Tools Section */}
      <div className="tools-section">
        <div className="tools-section-header">
          <h3>🛠️ Hilfreiche Tools</h3>
          <p>Diese Tools unterstützen Sie bei Ihrem Förderantrag</p>
        </div>
        
        <div className="tools-grid-inline">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-card-inline ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
            >
              <span className="tool-card-icon">{tool.icon}</span>
              <span className="tool-card-name">{tool.name}</span>
              <span className="tool-card-desc">{tool.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tool Modal/Panel */}
      {activeTool && (
        <div className="tool-modal-overlay" onClick={() => setActiveTool(null)}>
          <div className="tool-modal" onClick={(e) => e.stopPropagation()}>
            <button className="tool-modal-close" onClick={() => setActiveTool(null)}>×</button>
            {renderToolContent()}
          </div>
        </div>
      )}
    </>
  );
};

export default ToolsSidebar;
