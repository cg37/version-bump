// Messages sent from the webview → extension
export type WebviewMessage =
    | { type: "versionTypeChanged"; value: string }
    | { type: "executeBump" }
    | { type: "ready" };

// Messages sent from the extension → webview
export type ExtensionMessage =
    | { type: "setRunningState"; value: boolean }
    | { type: "setVersionInfo"; current: string; next: string };
