import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from './fsService';

export class OsIntegrationService {
  /**
   * Registers "Open in PDFLite" into Windows Explorer context menu.
   */
  static async registerWindowsContextMenu(): Promise<{ success: boolean; message: string }> {
    if (!isTauriEnvironment()) {
      return { success: false, message: 'Only supported inside the desktop app.' };
    }

    try {
      const response = await invoke<string>('register_windows_context_menu');
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  /**
   * Removes context menu entries from Windows Explorer registry.
   */
  static async unregisterWindowsContextMenu(): Promise<{ success: boolean; message: string }> {
    if (!isTauriEnvironment()) {
      return { success: false, message: 'Only supported inside the desktop app.' };
    }

    try {
      const response = await invoke<string>('unregister_windows_context_menu');
      return { success: true, message: response };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }
}
