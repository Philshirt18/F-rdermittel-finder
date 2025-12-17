import React, { useState } from 'react';

const defaultChecklist = [
  { id: 1, category: 'Grundlagen', item: 'Projektskizze / Konzept (2-5 Seiten)', checked: false },
  { id: 2, category: 'Grundlagen', item: 'Lageplan mit Standort', checked: false },
  { id: 3, category: 'Grundlagen', item: 'Fotos vom aktuellen Zustand', checked: false },
  { id: 4, category: 'Finanzen', item: 'Detaillierte Kostenschätzung', checked: false },
  { id: 5, category: 'Finanzen', item: 'Finanzierungsplan (Eigen-/Fremdmittel)', checked: false },
  { id: 6, category: 'Finanzen', item: 'Nachweis Eigenmittel', checked: false },
  { id: 7, category: 'Genehmigungen', item: 'Gemeinderatsbeschluss', checked: false },
  { id: 8, category: 'Genehmigungen', item: 'Grundstücksnachweis / Nutzungsrecht', checked: false },
  { id: 9, category: 'Genehmigungen', item: 'Baugenehmigung (falls erforderlich)', checked: false },
  { id: 10, category: 'Antrag', item: 'Ausgefülltes Antragsformular', checked: false },
  { id: 11, category: 'Antrag', item: 'Anschreiben / Begleitbrief', checked: false },
  { id: 12, category: 'Antrag', item: 'Zeitplan / Meilensteine', checked: false },
];

const ChecklistExport = ({ projectData, program, onBack }) => {
  const [checklist, setChecklist] = useState(defaultChecklist);
  const [customItems, setCustomItems] = useState([]);
  const [newItem, setNewItem] = useState('');

  const toggleItem = (id) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const addCustomItem = () => {
    if (newItem.trim()) {
      setCustomItems(prev => [...prev, { id: Date.now(), item: newItem, checked: false }]);
      setNewItem('');
    }
  };

  const toggleCustomItem = (id) => {
    setCustomItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const exportAsPDF = () => {
    // Simple text export for now
    const allItems = [...checklist, ...customItems.map(c => ({ ...c, category: 'Eigene' }))];
    const text = `CHECKLISTE FÖRDERANTRAG
${program ? `Programm: ${program.name}` : ''}
${projectData?.description ? `Projekt: ${projectData.description}` : ''}
Erstellt am: ${new Date().toLocaleDateString('de-DE')}

${['Grundlagen', 'Finanzen', 'Genehmigungen', 'Antrag', 'Eigene'].map(cat => {
  const items = allItems.filter(i => i.category === cat);
  if (items.length === 0) return '';
  return `\n${cat.toUpperCase()}\n${items.map(i => `[${i.checked ? 'X' : ' '}] ${i.item}`).join('\n')}`;
}).join('')}

---
Erstellt mit SPIEL-BAU Fördermittel-Finder
`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foerderantrag-checkliste.txt';
    a.click();
  };

  const progress = [...checklist, ...customItems].filter(i => i.checked).length;
  const total = checklist.length + customItems.length;

  const categories = ['Grundlagen', 'Finanzen', 'Genehmigungen', 'Antrag'];

  return (
    <div className="tool-view">
      <button onClick={onBack} className="btn-back">← Zurück</button>
      
      <div className="tool-header">
        <span className="tool-header-icon">✅</span>
        <div>
          <h2>Unterlagen-Checkliste</h2>
          <p>Behalten Sie den Überblick über alle benötigten Dokumente</p>
        </div>
      </div>

      {program && (
        <div className="selected-program-hint">
          <strong>Für:</strong> {program.name}
        </div>
      )}

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(progress / total) * 100}%` }} />
        </div>
        <span className="progress-text">{progress} von {total} erledigt</span>
      </div>

      <div className="checklist-container">
        {categories.map(category => (
          <div key={category} className="checklist-category">
            <h4>{category}</h4>
            {checklist.filter(item => item.category === category).map(item => (
              <label key={item.id} className={`checklist-item ${item.checked ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                />
                <span>{item.item}</span>
              </label>
            ))}
          </div>
        ))}

        {customItems.length > 0 && (
          <div className="checklist-category">
            <h4>Eigene Einträge</h4>
            {customItems.map(item => (
              <label key={item.id} className={`checklist-item ${item.checked ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleCustomItem(item.id)}
                />
                <span>{item.item}</span>
              </label>
            ))}
          </div>
        )}

        <div className="add-item-row">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Eigenen Eintrag hinzufügen..."
            onKeyPress={(e) => e.key === 'Enter' && addCustomItem()}
          />
          <button onClick={addCustomItem} className="btn-add">+</button>
        </div>
      </div>

      <button onClick={exportAsPDF} className="btn" style={{ width: '100%', marginTop: '20px' }}>
        📥 Checkliste exportieren
      </button>
    </div>
  );
};

export default ChecklistExport;
