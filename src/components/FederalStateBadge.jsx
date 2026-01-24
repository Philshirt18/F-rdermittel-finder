import React from 'react';

const FederalStateBadge = ({ federalStates, isFederalStateSpecific, className = '' }) => {
  // Federal state abbreviations mapping
  const stateAbbreviations = {
    'Baden-Württemberg': 'BW',
    'Bayern': 'BY',
    'Berlin': 'BE',
    'Brandenburg': 'BB',
    'Bremen': 'HB',
    'Hamburg': 'HH',
    'Hessen': 'HE',
    'Mecklenburg-Vorpommern': 'MV',
    'Niedersachsen': 'NI',
    'Nordrhein-Westfalen': 'NW',
    'Rheinland-Pfalz': 'RP',
    'Saarland': 'SL',
    'Sachsen': 'SN',
    'Sachsen-Anhalt': 'ST',
    'Schleswig-Holstein': 'SH',
    'Thüringen': 'TH'
  };

  // Don't render if not federal state specific or no states provided
  if (!isFederalStateSpecific || !federalStates || federalStates.length === 0 || federalStates.includes('all')) {
    return null;
  }

  // Get abbreviations for the states
  const stateAbbrevs = federalStates
    .filter(state => state !== 'all')
    .map(state => stateAbbreviations[state] || state.substring(0, 2).toUpperCase())
    .slice(0, 3); // Limit to 3 states for display

  if (stateAbbrevs.length === 0) {
    return null;
  }

  return (
    <div 
      className={`federal-state-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.375rem',
        backgroundColor: '#e0f2fe',
        border: '1px solid #0284c7',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#0284c7'
      }}
      title={`Bundeslandspezifisch: ${federalStates.filter(s => s !== 'all').join(', ')}`}
    >
      <span className="state-icon">🏛️</span>
      <span className="state-abbreviations">
        {stateAbbrevs.join(', ')}
        {federalStates.length > 3 && ` +${federalStates.length - 3}`}
      </span>
    </div>
  );
};

export default FederalStateBadge;