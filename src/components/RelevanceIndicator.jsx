import React from 'react';

const RelevanceIndicator = ({ relevanceLevel, className = '' }) => {
  const getIndicatorConfig = (level) => {
    switch (level) {
      case 1:
        return {
          color: '#22c55e', // Green
          backgroundColor: '#dcfce7',
          label: 'Kernprogramm',
          icon: '🎯',
          description: 'Bundeslandspezifisches Programm mit höchster Erfolgswahrscheinlichkeit'
        };
      case 2:
        return {
          color: '#f59e0b', // Yellow/Orange
          backgroundColor: '#fef3c7',
          label: 'Ergänzend',
          icon: '⭐',
          description: 'Landesumgesetztes Bundes- oder EU-Programm'
        };
      case 3:
        return {
          color: '#3b82f6', // Blue
          backgroundColor: '#dbeafe',
          label: 'Bundesweit',
          icon: '🌐',
          description: 'Echtes bundesweites Programm'
        };
      default:
        return {
          color: '#6b7280', // Gray
          backgroundColor: '#f3f4f6',
          label: 'Unbekannt',
          icon: '❓',
          description: 'Relevanz nicht bestimmt'
        };
    }
  };

  const config = getIndicatorConfig(relevanceLevel);

  return (
    <div 
      className={`relevance-indicator ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.375rem',
        backgroundColor: config.backgroundColor,
        border: `1px solid ${config.color}`,
        fontSize: '0.75rem',
        fontWeight: '600',
        color: config.color
      }}
      title={config.description}
    >
      <span className="relevance-icon">{config.icon}</span>
      <span className="relevance-label">{config.label}</span>
    </div>
  );
};

export default RelevanceIndicator;