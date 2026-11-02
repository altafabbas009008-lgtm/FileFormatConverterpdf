#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

/// Registers "Open with PDFLite" into the Windows Explorer context menu for PDF files.
#[tauri::command]
pub fn register_windows_context_menu() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = exe_path.to_str().ok_or("Failed to get executable path")?;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = r"Software\Classes\SystemFileAssociations\.pdf\shell\PDFLite";
        let (key, _) = hkcu
            .create_subkey(path)
            .map_err(|e| format!("Failed to create registry key: {}", e))?;

        key.set_value("", &"Open in PDFLite")
            .map_err(|e| e.to_string())?;
        key.set_value("Icon", &format!("\"{}\",0", exe_str))
            .map_err(|e| e.to_string())?;

        let (cmd_key, _) = key
            .create_subkey("command")
            .map_err(|e| e.to_string())?;

        cmd_key
            .set_value("", &format!("\"{}\" \"%1\"", exe_str))
            .map_err(|e| e.to_string())?;

        Ok("PDFLite successfully added to Windows PDF right-click context menu!".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok("Windows context menu registration is only active on Windows operating systems.".to_string())
    }
}

/// Removes PDFLite entries from the Windows Explorer context menu.
#[tauri::command]
pub fn unregister_windows_context_menu() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let path = r"Software\Classes\SystemFileAssociations\.pdf\shell\PDFLite";
        let _ = hkcu.delete_subkey_all(path);
        Ok("PDFLite removed from Windows context menu.".to_string())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok("Windows context menu is only active on Windows operating systems.".to_string())
    }
}
