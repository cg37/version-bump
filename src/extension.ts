import * as vscode from 'vscode';
import { VersionBumpViewProvider } from './versionBumpViewProvider';

export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Version Bump');
	context.subscriptions.push(outputChannel);

	const provider = new VersionBumpViewProvider(context.extensionUri, outputChannel);

	const viewRegistration = vscode.window.registerWebviewViewProvider(
		VersionBumpViewProvider.viewType,
		provider
	);
	context.subscriptions.push(viewRegistration);

	const bumpCommand = vscode.commands.registerCommand('version-bump.bumpAndPush', async () => {
		await provider.executeBumpAndPush();
	});
	context.subscriptions.push(bumpCommand);
}

export function deactivate() {}
