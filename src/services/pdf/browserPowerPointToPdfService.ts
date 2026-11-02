
import {
  WorkerBrowserConverter,
  createWasmPaths,
} from '@matbee/libreoffice-converter/browser';

let converter: WorkerBrowserConverter | null = null;
let initializationPromise: Promise<void> | null = null;

export const BrowserPowerPointToPdfService = {
  async convertToPdf(file: File): Promise<Uint8Array> {
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      throw new Error('Please select a PowerPoint .pptx file.');
    }

    if (!converter) {
      const defaultBase = import.meta.env.PROD
        ? 'https://dcw4rt9n02zbr.cloudfront.net/wasm/'
        : '/wasm/';
      const wasmBase = (import.meta.env.VITE_WASM_CDN_URL || defaultBase).replace(/\/?$/, '/');

      converter = new WorkerBrowserConverter({
        ...createWasmPaths(wasmBase),
        browserWorkerJs: '/dist/browser.worker.global.js',
      });
    }

    if (!converter.isReady()) {
      if (!initializationPromise) {
        initializationPromise = converter.initialize().catch((error) => {
          initializationPromise = null;
          converter = null;
          throw error;
        });
      }

      await initializationPromise;
    }

    if (!converter.isReady()) {
      throw new Error('LibreOffice browser engine is not ready.');
    }

    console.log('[PPT-PDF] LibreOffice initialization completed.');

    const startTime = Date.now();

    console.log('[PPT-PDF] Starting conversion:', file.name);
    console.log('[PPT-PDF] File size:', file.size, 'bytes');

    try {
      const result = await converter.convertFile(file, {
        inputFormat: 'pptx',
        outputFormat: 'pdf',
      });

      console.log('[PPT-PDF] Conversion returned successfully');
      console.log('[PPT-PDF] PDF size:', result.data.length, 'bytes');

      if (!result.data || result.data.length === 0) {
        throw new Error('Conversion returned an empty PDF.');
      }

      console.log(
        '[PPT-PDF] Conversion finished in',
        Math.round((Date.now() - startTime) / 1000),
        'seconds'
      );

      return result.data;
    } catch (error) {
      console.error('[PPT-PDF] Conversion failed:', error);
      throw error;
    }
  },
};
