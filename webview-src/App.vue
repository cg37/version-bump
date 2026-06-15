<script setup lang="ts">
import { ref, onMounted } from "vue";
import { vscode } from "./vscode";

type VersionType = "patch" | "minor" | "major";

const versionType = ref<VersionType>("patch");
const isRunning = ref(false);

function onVersionTypeChange() {
    vscode.postMessage({ type: "versionTypeChanged", value: versionType.value });
}

function onBump() {
    vscode.postMessage({ type: "executeBump" });
}

onMounted(() => {
    window.addEventListener("message", (event) => {
        const msg = event.data;
        if (msg.type === "setRunningState") {
            isRunning.value = msg.value;
        }
    });
});
</script>

<template>
    <div class="container">
        <div>
            <h3>Version Bump</h3>
        </div>

        <div class="section">
            <label for="versionType">Version Type</label>
            <select id="versionType" v-model="versionType" @change="onVersionTypeChange">
                <option value="patch">patch (0.0.X)</option>
                <option value="minor">minor (0.X.0)</option>
                <option value="major">major (X.0.0)</option>
            </select>
        </div>

        <div class="section">
            <button :disabled="isRunning" @click="onBump">
                <span v-if="isRunning" class="spinner"></span>
                {{ isRunning ? "Running..." : "Bump &amp; Push" }}
            </button>
        </div>

        <div class="hint">
            Runs <code>npm version &lt;type&gt;</code> followed by
            <code>git push --follow-tags</code>.<br />
            Check the "Version Bump" output channel for logs.
        </div>
    </div>
</template>

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
    to {
        transform: rotate(360deg);
    }
}
</style>
