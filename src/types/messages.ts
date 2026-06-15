// Messages sent from the webview → extension
export type WebviewMessage =
    | { type: "versionTypeChanged"; value: string }
    | { type: "executeBump" }
    | { type: "ready" }
    | { type: "workspaceSelected"; value: string };

// Messages sent from the extension → webview
export type ExtensionMessage =
    | { type: "setRunningState"; value: boolean }
    | { type: "setVersionInfo"; current: string; next: string; hasChanges: boolean }
    | { type: "setWorkspaceList"; workspaces: { path: string; name: string; version: string }[]; selected: string };
