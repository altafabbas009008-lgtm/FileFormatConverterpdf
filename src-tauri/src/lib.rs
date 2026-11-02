pub mod windows;

use windows::context_menu::{register_windows_context_menu, unregister_windows_context_menu};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
       .invoke_handler(tauri::generate_handler![
    powerpoint_to_pdf
])
        .run(tauri::generate_context!())
        .expect("error while running PDFLite application");
}

#[tauri::command]
async fn powerpoint_to_pdf(
    bytes: Vec<u8>,
    original_name: String,
) -> Result<Vec<u8>, String> {
    use std::fs;
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    let base_name = original_name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("presentation.pptx");

    if !base_name.to_lowercase().ends_with(".pptx") {
        return Err("Please select a .pptx PowerPoint file.".to_string());
    }

    let unique_id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();

    let work_dir = std::env::temp_dir()
        .join(format!("pdf_lite_ppt_{}_{}", std::process::id(), unique_id));

    fs::create_dir_all(&work_dir).map_err(|e| e.to_string())?;

    let input_path = work_dir.join(base_name);
    let output_path = work_dir.join(
        format!("{}.pdf", base_name.trim_end_matches(".pptx"))
    );

    fs::write(&input_path, bytes).map_err(|e| e.to_string())?;

    // Try the common Windows installation paths first.
    let candidates = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ];

    let mut command = None;

    for path in candidates {
        if std::path::Path::new(path).exists() {
            command = Some(Command::new(path));
            break;
        }
    }

    // If LibreOffice is available through PATH, try that too.
    if command.is_none() {
        command = Some(Command::new("soffice"));
    }

    let result = command
        .expect("LibreOffice command")
        .arg("--headless")
        .arg("--convert-to")
        .arg("pdf")
        .arg("--outdir")
        .arg(&work_dir)
        .arg(&input_path)
        .output();

    let result = match result {
        Ok(output) if output.status.success() => output,
        Ok(output) => {
            let _ = fs::remove_dir_all(&work_dir);
            return Err(format!(
                "LibreOffice conversion failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Err(e) => {
            let _ = fs::remove_dir_all(&work_dir);
            return Err(format!(
                "LibreOffice was not found. Install LibreOffice and try again. Details: {}",
                e
            ));
        }
    };

    let _ = result;

    if !output_path.exists() {
        let _ = fs::remove_dir_all(&work_dir);
        return Err("Conversion finished but the PDF file was not created.".to_string());
    }

    let pdf_bytes = fs::read(&output_path).map_err(|e| e.to_string())?;

    let _ = fs::remove_dir_all(&work_dir);

    Ok(pdf_bytes)
}
