use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get the main window and configure for kiosk use
            if let Some(window) = app.get_webview_window("main") {
                // Start maximized for wall display
                let _ = window.maximize();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running FamCal Kiosk");
}
