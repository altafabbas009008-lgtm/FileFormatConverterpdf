import { writeFile, exists } from '@tauri-apps/plugin-fs';

/**
 * Checks if the application is running inside a Tauri desktop container.
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class FsService {
  /**
   * Safely saves a file to disk without ever overwriting an existing file.
   * If a file with the target name exists, it increments with suffix: e.g. "document (1).pdf".
   */
  static async saveFileSafe(
    targetPath: string,
    data: Uint8Array
  ): Promise<string> {
    if (isTauriEnvironment()) {
      let finalPath = targetPath;
      let counter = 1;

      // Extract path parts
      const dotIndex = targetPath.lastIndexOf('.');
      const basePath = dotIndex !== -1 ? targetPath.slice(0, dotIndex) : targetPath;
      const ext = dotIndex !== -1 ? targetPath.slice(dotIndex) : '';

      // Non-overwrite guard loop
      while (await exists(finalPath)) {
        finalPath = `${basePath} (${counter})${ext}`;
        counter++;
      }

      await writeFile(finalPath, data);
      return finalPath;
    } else {
      // Browser fallback: trigger safe download
      const fileName = targetPath.split(/[\\/]/).pop() || 'output.pdf';
      const ext = fileName.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
     if (ext === 'pptx') {
  mimeType =
    'application/vnd.openxmlformats-officedocument.presentationml.presentation';
} else if (ext === 'docx') {
  mimeType =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
} else if (ext === 'pdf') {
  mimeType = 'application/pdf';
        mimeType = 'application/pdf';
      } else if (ext === 'txt') {
        mimeType = 'text/plain;charset=utf-8';
      } else if (ext === 'md') {
        mimeType = 'text/markdown;charset=utf-8';
      } else if (ext === 'png') {
        mimeType = 'image/png';
      } else if (ext === 'jpg' || ext === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (ext === 'zip') {
        mimeType = 'application/zip';
      }

      const blob = new Blob([data as any], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
a.click();
document.body.removeChild(a);

// Delay cleanup so the browser can start the download.
window.setTimeout(() => {
  URL.revokeObjectURL(url);
}, 1000);

return fileName;
    }
  }

  /**
   * Reads raw bytes from a file path using Tauri FS.
   */
  static async readFile(filePath: string): Promise<Uint8Array> {
    if (isTauriEnvironment()) {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(filePath);
    }
    throw new Error('Direct file path reading is only available in Tauri desktop mode');
  }
}
