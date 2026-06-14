// WebView-side script: DOM logic + message passing
// Runs inside the VSCode webview (browser environment).

/** @typedef {{ type: "versionTypeChanged", value: string } | { type: "executeBump" }} WebviewMessage */
/** @typedef {{ type: "setRunningState", value: boolean }} ExtensionMessage */

/** @type {{ postMessage: (msg: WebviewMessage) => void }} */
const vscode = acquireVsCodeApi();

function init() {
    const versionTypeEl = document.getElementById("versionType");
    const bumpBtn = document.getElementById("bumpBtn");

    if (!versionTypeEl || !bumpBtn) return;

    versionTypeEl.addEventListener("change", () => {
        vscode.postMessage({
            type: "versionTypeChanged",
            value: versionTypeEl.value,
        });
    });

    bumpBtn.addEventListener("click", () => {
        vscode.postMessage({ type: "executeBump" });
    });

    window.addEventListener("message", (event) => {
        const msg = event.data;
        if (msg.type === "setRunningState") {
            setButtonState(bumpBtn, msg.value);
        }
    });
}

function setButtonState(btn, isRunning) {
    if (isRunning) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>Running...';
    } else {
        btn.disabled = false;
        btn.textContent = "Bump & Push";
    }
}

init();
