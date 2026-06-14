import * as vscode from "vscode";
import { VersionBumpViewProvider } from "./provider/VersionBumpViewProvider";
import { Logger } from "./logger";

export function activate(context: vscode.ExtensionContext): void {
    const outputChannel = vscode.window.createOutputChannel("Version Bump");
    context.subscriptions.push(outputChannel);

    const logger = new Logger(outputChannel);

    const provider = new VersionBumpViewProvider(context.extensionUri, logger);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            VersionBumpViewProvider.viewType,
            provider,
        ),
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "version-bump.bumpAndPush",
            async () => {
                await provider.execute();
            },
        ),
    );
}

export function deactivate(): void {}
