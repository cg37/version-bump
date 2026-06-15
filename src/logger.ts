import * as vscode from "vscode";

export type LogLevel = "info" | "warn" | "error";

export class Logger {
    constructor(private readonly channel: vscode.OutputChannel) {}

    log(message: string, level: LogLevel = "info"): void {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = level === "warn" ? "[WARN] " : level === "error" ? "[ERR]  " : "";
        this.channel.appendLine(`[${timestamp}] ${prefix}${message}`);
    }

    clear(): void {
        this.channel.clear();
    }

    show(preserveFocus?: boolean): void {
        this.channel.show(preserveFocus);
    }
}
