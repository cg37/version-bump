// Typed wrapper around the VSCode WebView API

export type WebviewMessage =
    | { type: "versionTypeChanged"; value: string }
    | { type: "executeBump" }
    | { type: "ready" };

export type ExtensionMessage =
    | { type: "setRunningState"; value: boolean }
    | { type: "setVersionInfo"; current: string; next: string };

declare function acquireVsCodeApi(): {
    postMessage(msg: WebviewMessage): void;
};

export const vscode = acquireVsCodeApi();
