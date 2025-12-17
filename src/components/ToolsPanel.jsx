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

const ToolsPanel = ({ projectData, selectedProgram }) => {
  const [activeTool, setActiveTool] = useState(null);

  const renderTool = () => {
    switch (activeTool) {
      case 'letter':
        return <CoverLetterGenerator projectData={projectData} program={selectedProgram} onBack={() => setActiveTool(null)} />;
      case 'description':
        return <ProjectDescriptionAssistant projectData={projectData} program={selectedProgram} onBack={() => setActiveTool(null)} />;
      case 'calculator':
        return <CostCalculator projectData={projectData} onBack={() => setActiveTool(null)} />;
      case 'checklist':
        return <ChecklistExport projectData={projectData} program={selectedProgram} onBack={() => setActiveTool(null)} />;
      case 'contact':
        return <ContactRequest projectData={projectData} onBack={() => setActiveTool(null)} />;
      case 'gallery':
        return <ProjectGallery projectType={projectData?.projectType} onBack={() => setActiveTool(null)} />;
      default:
        return null;
    }
  };

  if (activeTool) {
    return renderTool();
  }

  return (
    <div className="tools-panel">
      <h2>🛠️ Hilfreiche Tools</h2>
      <p className="tools-intro">Diese Tools unterstützen Sie bei Ihrem Förderantrag</p>
      
      <div className="tools-grid">
        {tools.map(tool => (
          <button
            key={tool.id}
            className="tool-card"
            onClick={() => setActiveTool(tool.id)}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-name">{tool.name}</span>
            <span className="tool-desc">{tool.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToolsPanel;
