import * as vscode from "vscode";

export class Logger {
    constructor(private readonly channel: vscode.OutputChannel) {}

    log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.channel.appendLine(`[${timestamp}] ${message}`);
    }

    clear(): void {
        this.channel.clear();
    }

    show(preserveFocus?: boolean): void {
        this.channel.show(preserveFocus);
    }
}
