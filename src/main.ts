import { invoke } from "@tauri-apps/api/tauri";
import { message, save } from "@tauri-apps/api/dialog"
import { WebviewWindow, WindowOptions } from "@tauri-apps/api/window";
import { emit, once } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/api/clipboard";

const macSpacing = "      ";

let webviewPing: WebviewWindow | undefined = undefined;
var gateway: string | null = null;

const execute = async (command: string): Promise<any> => {
    try {
        return await invoke(command)
    } catch (error) {
        message(`Failed to get ${command}: ${error}`, { title: "Error on " + command });
        return "Error";
    }
}

/// [net, hardware]
const tablesToMaps = (): [Array<[string, string]>, Array<[string, string]>] => {
    // extract the information
    let tableHardware: HTMLTableElement | null = document.querySelector("#hardware-table")!;
    let tableNet: HTMLTableElement | null = document.querySelector("#network-table")!;

    var hardwareMap: Array<[string, string]> = [];
    var netMap: Array<[string, string]> = [];

    for (let i = 1; i < tableHardware.rows.length; i++) {
        hardwareMap.push(
            [tableHardware.rows[i].cells[0].textContent!.padEnd(30), tableHardware.rows[i].cells[1].textContent!]
        )
    }
    for (let i = 1; i < tableNet.rows.length; i++) {
        netMap.push(
            [tableNet.rows[i].cells[0].textContent!.padEnd(30), tableNet.rows[i].cells[1].textContent!]
        )
    }

    return [netMap, hardwareMap];
}

enum hardwareOrder {
    OS = 1, USR, CPU_MOD, CPU_CORES, RAM, DISK
}
enum networkOrder {
    INT_IP4 = 1, SUBNET, GATEWAY, INT_IP6, EXT_IP4, EXT_IP6,
}

const tbAt = (tbl: HTMLTableElement | null, i: number) => tbl!.rows[i].cells[1]

async function fetchInformation() {
    let tableHardware: HTMLTableElement | null = document.querySelector("#hardware-table");
    let tableNet: HTMLTableElement | null = document.querySelector("#network-table");

    if (tableHardware && tableNet) {
        let allTables = document.querySelectorAll("table")!;
        for (let i = 0; i < allTables.length; i++) {
            for (let j = 1; j < allTables[i].rows.length; j++) {
                allTables[i].rows[j].cells[1].innerHTML = '<i style="color:gray">loading...</i>'
            }
        }

        /* hardware table */

        execute("os_version").then((response: string) => tbAt(tableHardware, hardwareOrder.OS).textContent = response);
        execute("username").then((response: string) => tbAt(tableHardware, hardwareOrder.USR).textContent = response);
        execute("cpu_model").then((response: string) => tbAt(tableHardware, hardwareOrder.CPU_MOD).textContent = response);
        execute("cpu_stats").then((response: [number, number]) => tbAt(tableHardware, hardwareOrder.CPU_CORES).textContent = response[0] + ' cores @ ' + response[1] + ' MHz')
        execute("ram").then((response: Record<string, number>) => tbAt(tableHardware, hardwareOrder.RAM).textContent =
            `${Math.floor(response["total"] / 1024)} Mb (${(Math.floor(response["total"] / 1024) / 1000).toFixed(1)} Gb)`);

        execute("disk").then((response: Array<number>) => {
            const total_gb = response[0] / 1024 / 1024;
            const used_gb = response[1] / 1024 / 1024;
            const used_prc = (response[1] / response[0]) * 100

            tbAt(tableHardware, hardwareOrder.DISK).textContent =
                `${total_gb.toFixed(1)} Gb (used: ${used_gb.toFixed(1)} Gb = ${used_prc.toFixed(2)}%)`
        });

        /* network table */

        execute("gateway_and_mac").then((response: Record<string, string>) => {
            tbAt(tableNet, networkOrder.GATEWAY).textContent = response[0];
            tbAt(tableNet, networkOrder.INT_IP4).textContent += `${macSpacing}(MAC: ${response[1]})`;

            if (webviewPing === undefined) {
                gateway = response[0];
            } else {
                emit("gateway-loaded", response[0]);
            }
        });

        execute("local_ipv4_and_mask").then((response: [string, string]) => {
            const intIp4 = tbAt(tableNet, networkOrder.INT_IP4);

            if (intIp4.textContent!.length > "loading...".length) {
                const macSection = intIp4.textContent!.split(macSpacing)[1];
                intIp4.textContent = response[0] + macSpacing + macSection;
            } else intIp4.textContent = response[0];

            tbAt(tableNet, networkOrder.SUBNET).textContent = response[1];
        });
        execute("local_ipv6").then((response: string) => tbAt(tableNet, networkOrder.INT_IP6).textContent = response);

        execute("external_ipv4").then((response: string) => tbAt(tableNet, networkOrder.EXT_IP4).textContent = response);
        execute("external_ipv6").then((response: string) => tbAt(tableNet, networkOrder.EXT_IP6).textContent = response);
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    fetchInformation();

    document.onkeydown = (e: KeyboardEvent) => {
        if (e.key === "F5") fetchInformation();
    }

    document.querySelector("#btn-save")!.addEventListener("click", async () => {
        var path = await save({
            filters: [{
                name: "Text file",
                extensions: ['txt', '*']
            }],
            title: "save system information to file",
            defaultPath: "toolfetch-info.txt"
        });

        //console.log(path);

        if (!path) return;

        let [netMap, hardwareMap] = tablesToMaps();

        // write the file
        await invoke(
            "button_save", { path: path, hardwareInfo: hardwareMap, networkInfo: netMap }
        ).catch((err) => message(`${path}: ${err}`, { title: "Error while writing file!" }));
    });

    const addListener = (selector: string, name: string, args: Array<string> = [], noWindow: boolean = true) => {
        document.querySelector(selector)!.addEventListener("click", async () => {
            await invoke("button_open", {
                name: name,
                args: args,
                noWindow: noWindow
            }).catch((err) => message(`failed to start ${name}: ${err}`, { title: "Error" }))
        });
    }

    addListener("#btn-conf", "control")
    addListener("#btn-printers", "control", ["printers"]);
    addListener("#btn-wintools", "control", ["admintools"]);
    addListener("#btn-programs", "control", ["appwiz.cpl"]);
    addListener("#btn-cmd", "cmd.exe", ["/c", "start"]);

    document.querySelector("#btn-copy")!.addEventListener("click", async () => {
        let [netMap, hardwareMap] = tablesToMaps();
        await writeText(await invoke("button_copy", { hardwareInfo: hardwareMap, networkInfo: netMap }));
    });

    document.querySelector("#btn-ping")!.addEventListener("click", async () => {
        const webviewOptions: WindowOptions = {
            center: true,
            focus: true,
            title: "Ping Options",
            visible: true,
            height: 130,
            width: 400,
            fileDropEnabled: false,
            resizable: false,
            url: "/pingoptions.html",
            alwaysOnTop: true,
        };
        webviewPing = new WebviewWindow("Ping-options", webviewOptions);

        once("ping-window-loaded", async () => {
            if (gateway) emit("gateway-loaded", gateway)
        });

        webviewPing.once("tauri://error", (error) => {
            message(`failed to open window: ${error.payload}`, { title: "Window error" });
        });
    });
});