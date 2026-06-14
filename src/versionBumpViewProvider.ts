import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import * as util from 'util';

const exec = util.promisify(childProcess.exec);

export class VersionBumpViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'versionBumpView';

	private _view?: vscode.WebviewView;
	private _selectedVersionType = 'patch';
	private _isRunning = false;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _outputChannel: vscode.OutputChannel
	) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.type) {
				case 'versionTypeChanged':
					this._selectedVersionType = message.value;
					break;
				case 'executeBump':
					await this.executeBumpAndPush();
					break;
			}
		});
	}

	public async executeBumpAndPush() {
		if (this._isRunning) {
			vscode.window.showWarningMessage('Version bump is already in progress.');
			return;
		}

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('Please open a workspace folder first.');
			return;
		}

		const workspacePath = workspaceFolders[0].uri.fsPath;

		this._isRunning = true;
		this._updateButtonState(true);

		this._outputChannel.clear();
		this._outputChannel.show(true);

		try {
			// Step 1: npm version <type>
			const versionCmd = `npm version ${this._selectedVersionType}`;
			this._log(`Executing: ${versionCmd}`);
			const { stdout: versionOut, stderr: versionErr } = await exec(versionCmd, {
				cwd: workspacePath,
			});
			if (versionOut) {
				this._log(versionOut);
			}
			if (versionErr) {
				this._log(versionErr);
			}

			// Step 2: git push --follow-tags
			const pushCmd = 'git push --follow-tags';
			this._log(`Executing: ${pushCmd}`);
			const { stdout: pushOut, stderr: pushErr } = await exec(pushCmd, {
				cwd: workspacePath,
			});
			if (pushOut) {
				this._log(pushOut);
			}
			if (pushErr) {
				this._log(pushErr);
			}

			this._log('Done! Version bump and push completed successfully.');
			vscode.window.showInformationMessage('Version bump and push completed successfully.');
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this._log(`Error: ${errorMessage}`);
			vscode.window.showErrorMessage(`Version bump failed: ${errorMessage}`);
		} finally {
			this._isRunning = false;
			this._updateButtonState(false);
		}
	}

	private _log(message: string) {
		const timestamp = new Date().toLocaleTimeString();
		this._outputChannel.appendLine(`[${timestamp}] ${message}`);
	}

	private _updateButtonState(isRunning: boolean) {
		if (this._view) {
			this._view.webview.postMessage({
				type: 'setRunningState',
				value: isRunning,
			});
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			padding: 16px;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background: var(--vscode-sideBar-background);
		}
		.container {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}
		h3 {
			font-size: 13px;
			font-weight: 600;
			margin-bottom: 4px;
			color: var(--vscode-descriptionForeground);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		.section {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}
		select, button {
			width: 100%;
			padding: 8px 10px;
			font-size: 13px;
			font-family: inherit;
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			cursor: pointer;
			outline: none;
		}
		select:focus, button:focus {
			border-color: var(--vscode-focusBorder);
		}
		button {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			font-weight: 500;
			transition: background 0.15s ease;
		}
		button:hover:not(:disabled) {
			background: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
		.hint {
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			margin-top: 8px;
			line-height: 1.4;
		}
		.spinner {
			display: inline-block;
			width: 12px;
			height: 12px;
			border: 2px solid currentColor;
			border-top-color: transparent;
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
			margin-right: 6px;
			vertical-align: middle;
		}
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
	</style>
</head>
<body>
	<div class="container">
		<div>
			<h3>Version Bump</h3>
		</div>
		
		<div class="section">
			<label for="versionType">Version Type</label>
			<select id="versionType">
				<option value="patch">patch (0.0.X)</option>
				<option value="minor">minor (0.X.0)</option>
				<option value="major">major (X.0.0)</option>
			</select>
		</div>

		<div class="section">
			<button id="bumpBtn">Bump & Push</button>
		</div>

		<div class="hint">
			Runs <code>npm version &lt;type&gt;</code> followed by <code>git push --follow-tags</code>.<br>
			Check the "Version Bump" output channel for logs.
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const versionType = document.getElementById('versionType');
		const bumpBtn = document.getElementById('bumpBtn');

		versionType.addEventListener('change', (e) => {
			vscode.postMessage({
				type: 'versionTypeChanged',
				value: e.target.value
			});
		});

		bumpBtn.addEventListener('click', () => {
			vscode.postMessage({ type: 'executeBump' });
		});

		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'setRunningState') {
				if (message.value) {
					bumpBtn.disabled = true;
					bumpBtn.innerHTML = '<span class="spinner"></span>Running...';
				} else {
					bumpBtn.disabled = false;
					bumpBtn.textContent = 'Bump & Push';
				}
			}
		});
	</script>
</body>
</html>`;
	}
}
