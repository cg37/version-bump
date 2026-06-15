// Typed wrapper around the VSCode WebView API

export type WebviewMessage =
    | { type: "versionTypeChanged"; value: string }
    | { type: "executeBump" }
    | { type: "ready" }
    | { type: "workspaceSelected"; value: string };

export type ExtensionMessage =
    | { type: "setRunningState"; value: boolean }
    | { type: "setVersionInfo"; current: string; next: string; hasChanges: boolean }
    | { type: "setWorkspaceList"; workspaces: { path: string; name: string; version: string }[]; selected: string };

declare function acquireVsCodeApi(): {
    postMessage(msg: WebviewMessage): void;
};

export const vscode = acquireVsCodeApi();
