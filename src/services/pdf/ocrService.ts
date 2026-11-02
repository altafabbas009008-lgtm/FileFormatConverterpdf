
import { createWorker } from 'tesseract.js';
import { PdfRenderService } from './pdfRenderService';

export class OcrService {
  static async extractTextFromPdf(
    data: Uint8Array,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const pdf = await PdfRenderService.loadDocument(data);
    const worker = await createWorker('eng');

    const extractedPages: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext('2d', { alpha: false });

        if (!context) {
          throw new Error('Could not create canvas context.');
        }

        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        try {
          await page.render({
            canvasContext: context,
            viewport,
            canvas,
          }).promise;

          const result = await worker.recognize(canvas);

          extractedPages.push(
            `--- Page ${pageNumber} ---\n${result.data.text.trim()}`
          );
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }

        onProgress?.(pageNumber / pdf.numPages);
      }

      return extractedPages.join('\n\n');
    } finally {
      await worker.terminate();
      pdf.cleanup();
    }
  }
}
