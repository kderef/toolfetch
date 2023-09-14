export type translationNode = Record<string, string>;
export type translationMap = Record<string, translationNode>;

export const translations: translationMap = {
    username: {
        en: "username",
        nl: "gebruikersnaam"
    },
    hostname: {
        en: "hostname",
        nl: "hostnaam"
    },
    os_version: {
        en: "OS Version",
        nl: "OS Versie"
    },
    cpu_model: {
        en: "CPU Model",
        nl: "CPU Model"
    },
    cpu_cores: {
        en: "CPU Cores",
        nl: "CPU Cores"
    },
    clock_speed: {
        en: "Clock speed",
        nl: "Kloksnelheid"
    },
    physical_ram: {
        en: "Physical RAM",
        nl: "Fysieke RAM"
    },
    current_disk: {
        en: "Current disk",
        nl: "Huidige harde schijf"
    },
    internal_ipv4: {
        en: "Internal IPv4",
        nl: "Interne IPv4"
    },
    internal_ipv6: {
        en: "Internal IPv6",
        nl: "Interne IPv6"
    },
    external_ipv4: {
        en: "External IPv4",
        nl: "Externe IPv4"
    },
    external_ipv6: {
        en: "External IPv6",
        nl: "External IPv6"
    },
    subnet_mask: {
        en: "Subnet Mask",
        nl: "Subnetmasker"
    },
    default_gateway: {
        en: "Default Gateway",
        nl: "Standaard Gateway"
    },
    // buttons
    system_prefs: {
        en: "System Preferences",
        nl: "Systeem Voorkeuren"
    },
    config_panel: {
        en: "Config Panel",
        nl: "Configuratiescherm"
    },
    about_my_mac: {
        en: "About This Mac",
        nl: "Over deze Mac",
    },
    windows_tools: {
        en: "Windows Tools",
        nl: "Windows Tools"
    },
    installed_apps: {
        en: "Installed Apps",
        nl: "Geïnstalleerde Apps"
    },
    copy: {
        en: "Copy",
        nl: "Kopiëer"
    },
    save_to_file: {
        en: "Save to File",
        nl: "Sla op in Bestand"
    }
};

export const getTranslation = (trs: translationNode): string => {
    let lang = navigator.language;
    if (lang.startsWith("en")) {
        lang = "en";
    }

    return trs[lang] || trs["en"];
}