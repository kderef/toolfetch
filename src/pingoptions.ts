import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
 
document.addEventListener("DOMContentLoaded", async () => {
    const input: HTMLInputElement = document.querySelector("#address-input")!;
    const radioInternet = document.querySelector<HTMLInputElement>("#radio-internet")!;
    const radioGateway = document.querySelector<HTMLInputElement>("#radio-gateway")!;

    const pingButton = document.getElementById("btn-ping-alt")!;

    var gateway: string | null = null;

    await listen<string>('gateway-loaded', (event) => {
        radioGateway.disabled = false;
        gateway = event.payload;
    });

    await listen<string>('ping-window-receive-translations', (event) => {
        // TODO: translate!
    });

    radioInternet.addEventListener("click", () => {
        input.value = "8.8.8.8";
    });

    radioGateway.addEventListener("click", async () => {
        input.value = gateway!;
    });
 
    pingButton.addEventListener("click", async () => {
        if (input.value.trim() === "") return;
        await invoke("button_open", {
            name: "cmd",
            args: ["/c", "start", "ping", "-t", input.value],
            noWindow: false
        })
    });

    await emit("ping-window-loaded");
    await emit("ping-window-request-translations");
});