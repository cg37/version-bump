import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";
import * as util from "util";
import { Logger } from "../logger";
import { bumpAndPush } from "../commands/bumpAndPush";
import type { WebviewMessage, ExtensionMessage } from "../types/messages";

const exec = util.promisify(childProcess.exec);

/**
 * Returns false (disable button) only when ALL of the following are true:
 *   - working tree is clean (no uncommitted changes)
 *   - local HEAD is at the same commit as origin/master
 *
 * In all other cases (has changes, is ahead, git unavailable, etc.) returns true.
 */
async function hasGitChanges(cwd: string): Promise<boolean> {
    try {
        // 1. Any uncommitted changes → allow
        const { stdout: statusOut } = await exec("git status --porcelain", { cwd });
        if (statusOut.trim().length > 0) {
            return true;
        }

        // 2. Compare local HEAD with origin/master
        //    If they differ (local is ahead or behind), allow bump
        const { stdout: localHash } = await exec("git rev-parse HEAD", { cwd });
        const { stdout: remoteHash } = await exec("git rev-parse origin/master", { cwd });
        if (localHash.trim() !== remoteHash.trim()) {
            return true;
        }

        // Clean working tree AND same commit as origin/master → nothing to bump
        return false;
    } catch {
        // Git not available, not a repo, or origin/master doesn't exist — don't block
        return true;
    }
}

/** Compute what the next version string will be after a bump. */
function computeNextVersion(current: string, bumpType: string): string {
    const match = current.match(/^(\d+)\.(\d+)\.(\d+)/);
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
        return path.join(folders[0].uri.fsPath, "package.json");
    }

    private async _sendVersionInfo(): Promise<void> {
        if (!this._view) return;
        const pkgPath = this._getWorkspacePkgPath();
        const current = pkgPath ? readPackageVersion(pkgPath) : "";
        const next = current
            ? computeNextVersion(current, this._selectedVersionType)
            : "";
        const folders = vscode.workspace.workspaceFolders;
        const hasChanges = folders
            ? await hasGitChanges(folders[0].uri.fsPath)
            : false;
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
                vscode.window.showErrorMessage(
                    `Version bump failed: ${result.error}`,
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
