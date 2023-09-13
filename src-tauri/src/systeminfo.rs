use crate::estr;
use std::{env, net::IpAddr};

#[cfg(target_os = "windows")]
use {crate::NO_WINDOW, os::windows::process::CommandExt, std::process::Command};

const INVALID_IP_OCT: u16 = 224;
pub const ENV_GATEWAY: &str = "TOOLFETCH_TEMP_GATEWAY";

use tauri::command;

/* list of information:
- OS Version
- ram
- cpu name
- disk size (free / used %)
- internal IPv4/gateway/subnet
*/

#[derive(serde::Serialize)]
pub struct Disk {
    pub size: u64,
    pub free: u64,
    pub used: u64,
}

#[derive(serde::Serialize)]
pub struct Mem {
    pub total: u64,
    pub free: u64,
    pub avail: u64,
}

#[derive(serde::Serialize)]
pub struct DefaultInterface {
    pub ipv4: String,
    pub ipv6: String,
    pub subnet: String,
}

#[command(async)]
pub fn os_type() -> &'static str {
    return std::env::consts::OS;
}

#[command(async)]
pub fn os_version() -> String {
    let os_vers = os_info::get();
    let version = os_vers.version();

    os_vers
        .edition()
        .and_then(|v| Some(format!("{v} {version}")))
        .unwrap_or(format!("{} {version}", os_vers.os_type()))
}

#[command(async)]
pub fn ram() -> Result<Mem, String> {
    let mem = sys_info::mem_info().map_err(estr)?;
    Ok(Mem {
        total: mem.total,
        free: mem.free,
        avail: mem.avail,
    })
}

#[cfg(target_os = "windows")]
#[command(async)]
pub fn cpu_model() -> Result<String, String> {
    if let Ok(response) = Command::new("wmic.exe")
        .args(["cpu", "get", "name"])
        .creation_flags(NO_WINDOW)
        .output()
    {
        String::from_utf8_lossy(&response.stdout)
            .split('\n')
            .nth(1)
            .and_then(|v| Ok(v.trim().to_string()).into())
            .unwrap_or(Err("Failed to collect response from wmic.exe".into()))
    } else {
        const COMMAND: &str =
            "(Get-WmiObject -Class Win32_Processor | Select-Object -Property Name) | Format-Table -HideTableHeaders";

        Command::new("powershell.exe")
            .args(["-command", COMMAND])
            .creation_flags(NO_WINDOW)
            .output()
            .and_then(|o| Ok(Ok(String::from_utf8_lossy(&o.stdout).trim().into())))
            .map_err(estr)?
    }
}

#[cfg(target_os = "macos")]
#[command(async)]
pub fn cpu_model() -> Result<String, String> {
    let output = std::process::Command::new("sysctl")
        .args(["-n", "machdep.cpu.brand_string"])
        .output()
        .map_err(estr)?
        .stdout;

    Ok(String::from_utf8_lossy(&output).trim().to_string())
}

#[command(async)]
pub fn cpu_stats() -> Result<(u32, u64), String> /*(cores, clock speed)*/ {
    if cfg!(target_os = "macos") {
        let cores_str = std::process::Command::new("sysctl")
            .args(["-n", "hw.ncpu"])
            .output()
            .map_err(estr)?;

        let freq_str = std::process::Command::new("sysctl")
            .args(["-n", "hw.cpufrequency"])
            .output();

        println!("ANSANJODSABINSIAONJNDASASDJNODSADSJNOSDJNO SADJNOASDJNODASSDASDSDOSADOIODOIUSNDIOUSOSNDNSS: {freq_str:?}");

        let cores: u32 = String::from_utf8_lossy(&cores_str.stdout)
            .parse()
            .map_err(estr)?;

        let freq: u64 = if freq_str.is_err() {
            0
        } else {
            let as_str = String::from_utf8_lossy(&freq_str.as_ref().unwrap().stdout);

            if as_str.is_empty() { 0 }
            else {
                String::from_utf8_lossy(&freq_str.unwrap().stdout)
                .trim()
                .parse()
                .map_err(estr)?
            }
        };

        Ok((cores, freq))
    } else {
        Ok((
            sys_info::cpu_num().map_err(estr)? / 2,
            sys_info::cpu_speed().map_err(estr)?,
        ))
    }
}

#[command(async)]
pub fn disk() -> Result<(u64, u64), String> {
    #[cfg(target_os = "windows")]
    {
        sys_info::disk_info()
            .and_then(|di| Ok(Ok((di.total, di.total - di.free))))
            .map_err(estr)?
    }
    #[cfg(target_os = "macos")]
    {
        sys_info::disk_info()
            .and_then(|di| Ok(Ok((di.total / 10, (di.total - di.free) / 10))))
            .map_err(estr)?
    }
}

#[command(async)]
pub fn username() -> Result<String, String> {
    #[cfg(not(target_os = "macos"))]
    {
        const USERNAME_KEY: &str = if cfg!(target_os = "windows") {
            "USERNAME"
        } else {
            todo!()
        };

        const HOSTNAME_KEY: &str = if cfg!(target_os = "windows") {
            "COMPUTERNAME"
        } else if cfg!(target_os = "macos") {
            "HOSTNAME"
        } else {
            todo!()
        };

        Ok(format!(
            "{} \\ {}",
            env::var(HOSTNAME_KEY).map_err(estr)?,
            env::var(USERNAME_KEY).map_err(estr)?
        ))
    }
    #[cfg(target_os = "macos")]
    {
        let hostname = String::from_utf8(
            std::process::Command::new("/bin/hostname")
                .arg("-s")
                .output()
                .map_err(estr)?
                .stdout,
        )
        .map_err(estr)?
        .trim()
        .to_string();

        let username = env::var("USER").map_err(estr)?;

        Ok(format!("{hostname} \\ {username}"))
    }
}

#[command(async)]
pub async fn external_ipv4() -> Result<String, String> {
    public_ip::addr_v4()
        .await
        .and_then(|ip| Ok(ip.to_string()).into())
        .unwrap_or(Err("failed to resolve external IPv4".into()))
}

#[command(async)]
pub async fn external_ipv6() -> Result<String, String> {
    public_ip::addr_v6()
        .await
        .and_then(|ip| Ok(ip.to_string()).into())
        .unwrap_or(Err("failed to resolve external IPv6".into()))
}

#[command(async)]
pub fn gateway_and_mac() -> Result<(String, String), String> {
    default_net::get_default_gateway()
        .and_then(|g| {
            env::set_var(ENV_GATEWAY, g.ip_addr.to_string());
            Ok(Ok((g.ip_addr.to_string(), g.mac_addr.to_string())))
        })
        .map_err(estr)?
}

fn calc_subnet(oct: u16) -> String {
    match oct {
        224..=u16::MAX => "invalid subnet prefix",
        192..=223 => "255.255.255.0",
        128..=191 => "255.255.0.0",
        0..=127 => "255.0.0.0",
    }
    .to_string()
}

#[inline]
fn netmask(ipv4: IpAddr) -> String {
    ipv4.to_string()
        .split(".")
        .nth(0)
        .and_then(|o| Some(calc_subnet(o.parse::<u16>().unwrap_or(INVALID_IP_OCT))))
        .unwrap_or("No subnet: invalid ip".into())
}

#[command(async)]
pub fn local_ipv4_and_mask() -> Result<(String, String), String> /* (ip, mask), error */ {
    local_ip_address::local_ip()
        .and_then(|i| Ok(Ok((i.to_string(), netmask(i)))))
        .map_err(estr)?
}

#[command(async)]
pub fn local_ipv6() -> Result<String, String> {
    local_ip_address::local_ipv6()
        .and_then(|i| Ok(Ok(i.to_string())))
        .map_err(estr)?
}
