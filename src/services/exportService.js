import { jsPDF } from 'jspdf';

export const exportToPDF = (results) => {
  const { projectData, analysis } = results;
  const doc = new jsPDF();
  
  let y = 20;
  
  // Title
  doc.setFontSize(20);
  doc.text('Fördermittel-Empfehlungen', 20, y);
  y += 15;
  
  // Project info
  doc.setFontSize(12);
  doc.text(`Projekt: ${projectData.description}`, 20, y);
  y += 7;
  doc.text(`Typ: ${projectData.projectType}`, 20, y);
  y += 7;
  doc.text(`Bundesland: ${projectData.federalState}`, 20, y);
  y += 15;
  
  // Programs
  doc.setFontSize(16);
  doc.text('Empfohlene Programme:', 20, y);
  y += 10;
  
  analysis.programs.forEach((program, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.text(`${index + 1}. ${program.name}`, 20, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.text(`Match: ${program.fitScore}% | ${program.eligibility}`, 20, y);
    y += 10;
    
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });
  
  doc.save('foerdermittel-empfehlungen.pdf');
};

export const exportToJSON = (results) => {
  const dataStr = JSON.stringify(results, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'foerdermittel-analyse.json';
  link.click();
  URL.revokeObjectURL(url);
};
