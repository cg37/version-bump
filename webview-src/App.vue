<template>
    <div class="container">
        <div>
            <h3>Version Bump</h3>
        </div>

        <!-- Workspace selector (only shown when >1 workspace) -->
        <div v-if="workspaces.length > 1" class="section">
            <label for="workspaceSelect">Workspace</label>
            <select
                id="workspaceSelect"
                v-model="selectedWorkspace"
                @change="onWorkspaceChange"
            >
                <option
                    v-for="ws in workspaces"
                    :key="ws.path"
                    :value="ws.path"
                >
                    {{ ws.name }} (v{{ ws.version }})
                </option>
            </select>
        </div>

        <!-- Version info card -->
        <div v-if="currentVersion" class="version-card">
            <div class="version-row">
                <span class="version-label">Current</span>
                <span class="version-value">v{{ currentVersion }}</span>
            </div>
            <div class="version-arrow">↓</div>
            <div class="version-row">
                <span class="version-label">After bump</span>
                <span class="version-value next">v{{ nextVersion }}</span>
            </div>
        </div>
        <div v-else class="version-empty">
            No package.json found in workspace
        </div>

        <div class="section">
            <label for="versionType">Bump Type</label>
            <select
                id="versionType"
                v-model="versionType"
                @change="onVersionTypeChange"
            >
                <option value="patch">patch — fix (0.0.X)</option>
                <option value="minor">minor — feature (0.X.0)</option>
                <option value="major">major — breaking (X.0.0)</option>
            </select>
        </div>

        <div class="section">
            <button
                :disabled="isRunning || !currentVersion || !hasChanges"
                @click="onBump"
            >
                <span v-if="isRunning" class="spinner"></span>
                {{ isRunning ? "Running..." : "Bump &amp; Push" }}
            </button>
            <div
                v-if="currentVersion && !hasChanges && !isRunning"
                class="no-changes-tip"
            >
                ✓ Nothing to bump — no uncommitted changes or unpushed commits
            </div>
        </div>

        <div class="hint">
            Runs <code>npm version &lt;type&gt;</code> followed by
            <code>git push --follow-tags</code>.<br />
            Check the "Version Bump" output channel for logs.
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { vscode, type ExtensionMessage } from "./vscode";

type VersionType = "patch" | "minor" | "major";

const versionType = ref<VersionType>("patch");
const isRunning = ref(false);
const currentVersion = ref("");
const nextVersion = ref("");
const hasChanges = ref(false);

// Multi-workspace state
const workspaces = ref<{ path: string; name: string; version: string }[]>([]);
const selectedWorkspace = ref("");

function onVersionTypeChange() {
    vscode.postMessage({
        type: "versionTypeChanged",
        value: versionType.value,
    });
}

function onWorkspaceChange() {
    vscode.postMessage({
        type: "workspaceSelected",
        value: selectedWorkspace.value,
    });
}

function onBump() {
    vscode.postMessage({ type: "executeBump" });
}

onMounted(() => {
    window.addEventListener("message", (event) => {
        const msg = event.data as ExtensionMessage;
        if (msg.type === "setRunningState") {
            isRunning.value = msg.value;
        } else if (msg.type === "setVersionInfo") {
            currentVersion.value = msg.current;
            nextVersion.value = msg.next;
            hasChanges.value = msg.hasChanges;
        } else if (msg.type === "setWorkspaceList") {
            workspaces.value = msg.workspaces;
            selectedWorkspace.value = msg.selected;
        }
    });
    // Notify the extension that the webview is ready
    vscode.postMessage({ type: "ready" });
});
</script>

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

/* Version preview card */
.version-card {
    background: var(--vscode-editor-inactiveSelectionBackground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.version-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.version-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
}

.version-value {
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-foreground);
}

.version-value.next {
    color: var(--vscode-terminal-ansiGreen);
}

.version-arrow {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
}

.version-empty {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

select,
button {
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

select:focus,
button:focus {
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
    margin-top: 4px;
    line-height: 1.4;
}

.no-changes-tip {
    font-size: 11px;
    color: var(--vscode-terminal-ansiGreen);
    margin-top: 4px;
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
    to {
        transform: rotate(360deg);
    }
}
</style>
