// Typed wrapper around the VSCode WebView API

export type WebviewMessage =
    | { type: "versionTypeChanged"; value: string }
    | { type: "executeBump" };

export interface ExtensionMessage {
    type: "setRunningState";
    value: boolean;
}

declare function acquireVsCodeApi(): {
    postMessage(msg: WebviewMessage): void;
};

export const vscode = acquireVsCodeApi();
