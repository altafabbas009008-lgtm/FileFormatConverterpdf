import '@/utils/polyfills';
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker source using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface RenderPageOptions {
  scale?: number;
  rotation?: number;
}

export class PdfRenderService {
  /**
   * Loads a PDF document proxy safely from a Uint8Array.
   */
  static async loadDocument(data: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
    // CRITICAL: PDF.js transfers the underlying ArrayBuffer to its Web Worker.
    // In JavaScript, transferring an ArrayBuffer detaches it in the main thread,
    // leaving data.byteLength === 0!
    // We clone the byte array into a fresh ArrayBuffer before passing it to PDF.js.
    const dataClone = new Uint8Array(data.byteLength);
    dataClone.set(data);

    const loadingTask = pdfjsLib.getDocument({
      data: dataClone,
      useSystemFonts: true,
    });
    return await loadingTask.promise;
  }

  /**
   * FR-7: Renders a fast, low-memory thumbnail for a specific page.
   * Uses low scale (e.g., width ~180px) to keep memory footprint minimal.
   */
  static async renderThumbnail(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    targetWidth = 180
  ): Promise<string> {
    const page = await pdfDoc.getPage(pageNumber);
    const initialViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / initialViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not obtain canvas 2D rendering context');

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Free canvas dimensions immediately to aid GC
    canvas.width = 0;
    canvas.height = 0;

    return dataUrl;
  }

  /**
   * FR-8: Converts a specific PDF page to a high-quality Image Blob (JPEG or PNG).
   */
  static async exportPageToImage(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    format: 'image/jpeg' | 'image/png' = 'image/png',
    dpiScale = 2.0 // 2.0 = ~150 DPI, 4.0 = ~300 DPI
  ): Promise<Blob> {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: dpiScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not obtain canvas 2D rendering context');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          // Clean up canvas
          canvas.width = 0;
          canvas.height = 0;
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to image blob'));
          }
        },
        format,
        format === 'image/jpeg' ? 0.92 : undefined
      );
    });
  }
}
