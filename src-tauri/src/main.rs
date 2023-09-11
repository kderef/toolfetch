#![allow(non_snake_case)]
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // no console

use tauri::Manager;

mod buttons;
mod systeminfo;

// export
/// used in `process::Command` for no cmd window
pub const NO_WINDOW: u32 = 0x08000000;

// export
/// instead of `map_err(|e| e.to_string())`
pub fn estr<E>(e: E) -> String
where
    E: ToString,
{
    e.to_string()
}

#[tauri::command(async)]
fn emit_gateway() {}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();

            app.listen_global("gateway-loaded", move |event| {
                let _ = handle
                    .get_window("Ping-options")
                    .unwrap()
                    .emit("gateway-loaded", event.payload());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            systeminfo::ram,
            systeminfo::cpu_model,
            systeminfo::cpu_stats,
            systeminfo::disk,
            systeminfo::os_version,
            systeminfo::username,
            systeminfo::external_ipv4,
            systeminfo::external_ipv6,
            systeminfo::gateway_and_mac,
            systeminfo::local_ipv4_and_mask,
            systeminfo::local_ipv6,
            buttons::button_save,
            buttons::button_open,
            buttons::button_copy,
            emit_gateway
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    std::env::remove_var(systeminfo::ENV_GATEWAY);
}
