import { open, save } from '@tauri-apps/plugin-dialog';
import { isTauriEnvironment } from './fsService';

export class DialogService {
  /**
   * Opens native file selector for picking PDF or Image files.
   */
  static async pickPdfFiles(multiple = true): Promise<string[] | null> {
    if (isTauriEnvironment()) {
      const selected = await open({
        multiple,
        filters: [
          {
            name: 'PDF Files',
            extensions: ['pdf'],
          },
        ],
      });

      if (!selected) return null;
      return Array.isArray(selected) ? selected : [selected];
    }

    // In web fallback, handled via input elements
    return null;
  }
/**
 * Selects a folder for saving split PDF files.
 */
static async selectFolderLocation(): Promise<string | null> {
  if (isTauriEnvironment()) {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select folder for split PDF files',
    });

    return typeof selected === 'string' ? selected : null;
  }

  // Browser does not support selecting a folder this way.
  return null;
}
  /**
   * Prompts user for a save destination file path.
   */
  static async selectSaveLocation(
    defaultFilename: string,
    extension?: string
  ): Promise<string | null> {
    const rawExt = extension || defaultFilename.split('.').pop() || 'pdf';
    const cleanExt = rawExt.replace(/^\./, '').toLowerCase();

    if (isTauriEnvironment()) {
      return await save({
        defaultPath: defaultFilename,
        filters: [
          {
            name: `${cleanExt.toUpperCase()} Document`,
            extensions: [cleanExt],
          },
          {
            name: 'All Files (*.*)',
            extensions: ['*'],
          },
        ],
      });
    }

    // Web fallback returns the default file name
    return defaultFilename;
  }
}
