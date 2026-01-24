import { jsPDF } from 'jspdf';

export const exportToPDF = (results) => {
  const { projectData, analysis } = results;
  const doc = new jsPDF();
  
  let y = 20;
  
  // Title
  doc.setFontSize(20);
  doc.text('Fördermittel-Empfehlungen', 20, y);
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
  
  // Add Spiel Bau GmbH contact info at the bottom
  if (y > 200) {
    doc.addPage();
    y = 20;
  } else {
    y += 20; // Add some space before contact info
  }
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Spiel Bau GmbH unterstützt Sie gerne bei der professionellen Planung Ihres Spielplatzes.', 20, y);
  y += 10;
  
  doc.setFont(undefined, 'normal');
  doc.text('Besuchen Sie uns auf www.spiel-bau.de', 20, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.text('Kontakt:', 20, y);
  y += 7;
  doc.text('Tel: 03381-2614-0', 20, y);
  y += 5;
  doc.text('Fax: 03381-2614-18', 20, y);
  y += 5;
  doc.text('Mail: info@spiel-bau.de', 20, y);
  
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
