
import { invoke } from '@tauri-apps/api/core';
import { BrowserPowerPointToPdfService } from './browserPowerPointToPdfService';

export const PowerPointToPdfService = {
  async convertToPdf(file: File): Promise<Uint8Array> {
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      throw new Error('Please select a PowerPoint .pptx file.');
    }

    const isTauri =
      typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
      return BrowserPowerPointToPdfService.convertToPdf(file);
    }

    const bytes = Array.from(
      new Uint8Array(await file.arrayBuffer())
    );

    const result = await invoke<number[]>('powerpoint_to_pdf', {
      bytes,
      originalName: file.name,
    });

    return new Uint8Array(result);
  },
};
