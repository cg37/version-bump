import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logger";
import { bumpAndPush } from "../commands/bumpAndPush";
import type { WebviewMessage, ExtensionMessage } from "../types/messages";

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
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._buildHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.type) {
                    case "versionTypeChanged":
                        this._selectedVersionType = message.value;
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
        const htmlPath = path.join(
            this._extensionUri.fsPath,
            "out",
            "webview",
            "sidebar.html",
        );
        const html = fs.readFileSync(htmlPath, "utf-8");

        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "out", "webview", "sidebar.js"),
        );

        const cspSource = webview.cspSource;

        return html
            .replace(/\{\{CSP_SOURCE\}\}/g, cspSource)
            .replace(/\{\{SCRIPT_URI\}\}/g, scriptUri.toString());
    }
}
