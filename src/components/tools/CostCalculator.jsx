import React, { useState } from 'react';

const costData = {
  playground: {
    small: { min: 25000, max: 50000, label: 'Klein (bis 200m²)' },
    medium: { min: 50000, max: 120000, label: 'Mittel (200-500m²)' },
    large: { min: 120000, max: 300000, label: 'Groß (über 500m²)' },
  },
  fitness: {
    small: { min: 15000, max: 35000, label: 'Klein (3-5 Geräte)' },
    medium: { min: 35000, max: 80000, label: 'Mittel (6-10 Geräte)' },
    large: { min: 80000, max: 180000, label: 'Groß (über 10 Geräte)' },
  },
  extras: [
    { id: 'fallprotection', name: 'Fallschutz (Gummi/Sand)', cost: 80, unit: 'pro m²' },
    { id: 'fencing', name: 'Einzäunung', cost: 120, unit: 'pro lfd. Meter' },
    { id: 'benches', name: 'Sitzbänke', cost: 800, unit: 'pro Stück' },
    { id: 'shade', name: 'Sonnenschutz/Pergola', cost: 5000, unit: 'pro Stück' },
    { id: 'lighting', name: 'Beleuchtung', cost: 3000, unit: 'pauschal' },
    { id: 'accessibility', name: 'Barrierefreie Gestaltung', cost: 8000, unit: 'pauschal' },
  ]
};

const CostCalculator = ({ projectData, onBack }) => {
  const [projectType, setProjectType] = useState(projectData?.projectType || 'playground');
  const [size, setSize] = useState('medium');
  const [extras, setExtras] = useState({});
  const [extraQuantities, setExtraQuantities] = useState({});

  const toggleExtra = (id) => {
    setExtras(prev => ({ ...prev, [id]: !prev[id] }));
    if (!extraQuantities[id]) {
      setExtraQuantities(prev => ({ ...prev, [id]: 1 }));
    }
  };

  const calculateTotal = () => {
    const type = projectType === 'combination' ? 'playground' : projectType;
    const base = costData[type]?.[size] || costData.playground[size];
    
    let extrasCost = 0;
    costData.extras.forEach(extra => {
      if (extras[extra.id]) {
        const qty = extraQuantities[extra.id] || 1;
        extrasCost += extra.cost * qty;
      }
    });

    const planningCost = (base.max * 0.15); // 15% Planungskosten
    
    return {
      baseMin: base.min,
      baseMax: base.max,
      extras: extrasCost,
      planning: planningCost,
      totalMin: base.min + extrasCost + planningCost * 0.5,
      totalMax: base.max + extrasCost + planningCost,
    };
  };

  const costs = calculateTotal();
  const formatCurrency = (num) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="tool-view">
      <button onClick={onBack} className="btn-back">← Zurück</button>
      
      <div className="tool-header">
        <span className="tool-header-icon">🧮</span>
        <div>
          <h2>Kosten-Kalkulator</h2>
          <p>Schätzen Sie die Kosten für Ihr Projekt</p>
        </div>
      </div>

      <div className="calculator-grid">
        <div className="calc-section">
          <h3>Projektart</h3>
          <div className="radio-group">
            {[
              { id: 'playground', label: '🎠 Spielplatz' },
              { id: 'fitness', label: '💪 Fitness-Anlage' },
              { id: 'combination', label: '🎯 Kombination' },
            ].map(opt => (
              <label key={opt.id} className={`radio-card ${projectType === opt.id ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="projectType"
                  value={opt.id}
                  checked={projectType === opt.id}
                  onChange={(e) => setProjectType(e.target.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="calc-section">
          <h3>Größe</h3>
          <div className="radio-group">
            {Object.entries(costData.playground).map(([key, val]) => (
              <label key={key} className={`radio-card ${size === key ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="size"
                  value={key}
                  checked={size === key}
                  onChange={(e) => setSize(e.target.value)}
                />
                {val.label}
              </label>
            ))}
          </div>
        </div>

        <div className="calc-section">
          <h3>Zusatzausstattung</h3>
          <div className="extras-list">
            {costData.extras.map(extra => (
              <div key={extra.id} className={`extra-item ${extras[extra.id] ? 'active' : ''}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={extras[extra.id] || false}
                    onChange={() => toggleExtra(extra.id)}
                  />
                  <span>{extra.name}</span>
                  <small>{formatCurrency(extra.cost)} {extra.unit}</small>
                </label>
                {extras[extra.id] && extra.unit !== 'pauschal' && (
                  <input
                    type="number"
                    min="1"
                    value={extraQuantities[extra.id] || 1}
                    onChange={(e) => setExtraQuantities(prev => ({ ...prev, [extra.id]: parseInt(e.target.value) || 1 }))}
                    className="qty-input"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cost-result">
        <h3>Geschätzte Gesamtkosten</h3>
        <div className="cost-breakdown">
          <div className="cost-row">
            <span>Grundausstattung</span>
            <span>{formatCurrency(costs.baseMin)} - {formatCurrency(costs.baseMax)}</span>
          </div>
          <div className="cost-row">
            <span>Zusatzausstattung</span>
            <span>{formatCurrency(costs.extras)}</span>
          </div>
          <div className="cost-row">
            <span>Planung & Nebenkosten (ca. 15%)</span>
            <span>ca. {formatCurrency(costs.planning)}</span>
          </div>
          <div className="cost-row total">
            <span>Gesamtkosten (geschätzt)</span>
            <span>{formatCurrency(costs.totalMin)} - {formatCurrency(costs.totalMax)}</span>
          </div>
        </div>
        <p className="cost-disclaimer">
          * Dies ist eine grobe Schätzung. Die tatsächlichen Kosten hängen von vielen Faktoren ab. 
          Kontaktieren Sie uns für eine detaillierte Kalkulation.
        </p>
      </div>
    </div>
  );
};

export default CostCalculator;
