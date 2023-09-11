use std::fs::File;
use std::io::Write;

use crate::{estr, NO_WINDOW};
use std::os::windows::process::CommandExt;
use std::process;

use tauri::command;

type InfoMap = Vec<(String, String)>;

#[command(async)]
pub fn button_save(
    path: String,
    hardware_info: InfoMap,
    network_info: InfoMap,
) -> Result<(), String> {
    let mut file = File::create(path).map_err(estr)?;

    write!(file,
        "{info}", info = button_copy(network_info, hardware_info)
    ).map_err(estr)?;

    Ok(())
}

#[command(async)]
pub fn button_copy(network_info: InfoMap, hardware_info: InfoMap) -> String {
    let mut buf = String::from("### Hardware/Software information\n");

    for (k, v) in hardware_info {
        buf.push_str( &format!("   {k}{v}\n") );
    }

    buf.push_str("\n### Network information\n");

    for (k, v) in network_info {
        buf.push_str( &format!("   {k}{v}\n") );
    }

    return buf;
}

#[command(async)]
pub fn button_open(name: String, args: Vec<String>, no_window: bool) -> Result<(), String> {
    if no_window {
        process::Command::new(name)
            .creation_flags(NO_WINDOW)
            .args(args)
            .spawn()
    } else {
        process::Command::new(name).args(args).spawn()
    }
    .map_err(estr)?;

    Ok(())
}
