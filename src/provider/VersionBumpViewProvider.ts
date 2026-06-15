import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logger";
import { bumpAndPush } from "../commands/bumpAndPush";
import type { WebviewMessage, ExtensionMessage } from "../types/messages";

/** Check whether a package.json with a valid version exists in the workspace. */
function hasValidPackageJson(cwd: string): boolean {
    const pkgPath = path.join(cwd, "package.json");
    const version = readPackageVersion(pkgPath);
    return version !== "";
}

/** Compute what the next version string will be after a bump.
 *  Supports semver with optional pre-release tags (e.g. 1.0.0-alpha.1).
 */
function computeNextVersion(current: string, bumpType: string): string {
    // Match core semver: major.minor.patch[-prerelease][+build]
    const match = current.match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?(?:\+.+)?$/);
    if (!match) return current;
    let [, major, minor, patch] = match.map(Number);
    if (bumpType === "major") { major++; minor = 0; patch = 0; }
    else if (bumpType === "minor") { minor++; patch = 0; }
    else { patch++; }
    return `${major}.${minor}.${patch}`;
}

/** Read the "version" field from a package.json file. Returns "" on failure. */
function readPackageVersion(pkgPath: string): string {
    try {
        const raw = fs.readFileSync(pkgPath, "utf-8");
        const json = JSON.parse(raw) as { version?: string };
        return json.version ?? "";
    } catch {
        return "";
    }
}

export class VersionBumpViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "versionBumpView";

    private _view?: vscode.WebviewView;
    private _selectedVersionType = "patch";
    private _isRunning = false;
    private _selectedWorkspace = "";

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _logger: Logger,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, "out", "webview"),
            ],
        };

        webviewView.webview.html = this._buildHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.type) {
                    case "ready":
                        // WebView is mounted — push current version info
                        void this._sendWorkspaceList();
                        break;
                    case "workspaceSelected":
                        this._selectedWorkspace = message.value;
                        void this._sendVersionInfo();
                        break;
                    case "versionTypeChanged":
                        this._selectedVersionType = message.value;
                        void this._sendVersionInfo();
                        break;
                    case "executeBump":
                        await this._handleExecuteBump();
                        break;
                }
            },
        );
    }

    public async execute(): Promise<void> {
        await this._handleExecuteBump();
    }

    private _getWorkspacePkgPath(): string | null {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return null;
        const target = this._selectedWorkspace
            ? folders.find((f) => f.uri.fsPath === this._selectedWorkspace)
            : folders[0];
        if (!target) return null;
        return path.join(target.uri.fsPath, "package.json");
    }

    private _listWorkspaces(): { path: string; name: string; version: string }[] {
        const folders = vscode.workspace.workspaceFolders ?? [];
        return folders
            .map((f) => {
                const pkgPath = path.join(f.uri.fsPath, "package.json");
                const version = readPackageVersion(pkgPath);
                const name = f.name;
                return { path: f.uri.fsPath, name, version };
            })
            .filter((w) => w.version !== "");
    }

    private async _sendWorkspaceList(): Promise<void> {
        if (!this._view) return;
        const workspaces = this._listWorkspaces();
        if (workspaces.length === 0) return;
        if (!this._selectedWorkspace && workspaces.length > 0) {
            this._selectedWorkspace = workspaces[0].path;
        }
        const msg: ExtensionMessage = {
            type: "setWorkspaceList",
            workspaces,
            selected: this._selectedWorkspace,
        };
        this._view.webview.postMessage(msg);
        // After workspace list is sent, also send version info
        void this._sendVersionInfo();
    }

    private async _sendVersionInfo(): Promise<void> {
        if (!this._view) return;
        const pkgPath = this._getWorkspacePkgPath();
        const current = pkgPath ? readPackageVersion(pkgPath) : "";
        const next = current
            ? computeNextVersion(current, this._selectedVersionType)
            : "";
        const folders = vscode.workspace.workspaceFolders;
        const hasChanges = folders ? hasValidPackageJson(folders[0].uri.fsPath) : false;
        const msg: ExtensionMessage = { type: "setVersionInfo", current, next, hasChanges };
        this._view.webview.postMessage(msg);
    }

    private async _handleExecuteBump(): Promise<void> {
        if (this._isRunning) {
            vscode.window.showWarningMessage("Version bump is already in progress.");
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("Please open a workspace folder first.");
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;

        this._isRunning = true;
        this._setRunningState(true);

        this._logger.clear();
        this._logger.show(true);

        try {
            const result = await bumpAndPush(
                workspacePath,
                this._selectedVersionType,
                this._logger,
            );

            if (result.success) {
                vscode.window.showInformationMessage(
                    "Version bump and push completed successfully.",
                );
                // Refresh version display after successful bump
                void this._sendVersionInfo();
            } else {
                const hint = result.recoveryHint
                    ? ` ${result.recoveryHint}`
                    : "";
                vscode.window.showErrorMessage(
                    `Version bump failed: ${result.error}${hint}`,
                );
            }
        } finally {
            this._isRunning = false;
            this._setRunningState(false);
        }
    }

    private _setRunningState(isRunning: boolean): void {
        if (this._view) {
            const msg: ExtensionMessage = {
                type: "setRunningState",
                value: isRunning,
            };
            this._view.webview.postMessage(msg);
        }
    }

    private _buildHtml(webview: vscode.Webview): string {
        const webviewOutDir = vscode.Uri.joinPath(
            this._extensionUri,
            "out",
            "webview",
        );

        // Read the Vite-built index.html
        const htmlPath = path.join(webviewOutDir.fsPath, "index.html");
        let html = fs.readFileSync(htmlPath, "utf-8");

        // Rewrite all src/href paths to use vscode-resource URIs
        html = html.replace(
            /(src|href)="([^"]+)"/g,
            (_match: string, attr: string, value: string) => {
                if (value.startsWith("http") || value.startsWith("data:")) {
                    return _match;
                }
                const assetUri = webview.asWebviewUri(
                    vscode.Uri.joinPath(webviewOutDir, value.replace(/^\//, "")),
                );
                return `${attr}="${assetUri}"`;
            },
        );

        // Inject CSP meta tag with the correct webview csp source
        const cspSource = webview.cspSource;
        html = html.replace(
            /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/,
            `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};">`,
        );

        return html;
    }
}
