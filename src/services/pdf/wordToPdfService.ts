
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';

export class WordToPdfService {
  static async convertToPdf(file: File): Promise<Blob> {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      throw new Error('Please select a .docx Word document.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result.value.trim()) {
      throw new Error('No readable content found in this Word document.');
    }

    const container = document.createElement('div');
    container.innerHTML = result.value;

    Object.assign(container.style, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12pt',
      color: '#000000',
      lineHeight: '1.5',
      padding: '20px',
      background: '#ffffff',
      width: '700px',
      boxSizing: 'border-box',
    });

    container.querySelectorAll('img').forEach((img) => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    });

    const options = {
      margin: 10,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: false },
      jsPDF: {
  unit: 'mm',
  format: 'a4',
  orientation: 'portrait' as const,
},
      pagebreak: { mode: ['css', 'legacy'] },
    };

    try {
      return await html2pdf()
        .set(options)
        .from(container)
        .outputPdf('blob');
    } finally {
      container.remove();
    }
  }
}
