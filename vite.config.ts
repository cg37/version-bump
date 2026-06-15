import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    // Use webview-src as the root for the frontend project
    root: resolve(__dirname, "webview-src"),
    build: {
        // Output to out/webview so the extension can load it
        outDir: resolve(__dirname, "out/webview"),
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, "webview-src/index.html"),
            output: {
                // Use a predictable filename so VersionBumpViewProvider can reference it
                entryFileNames: "sidebar.js",
                chunkFileNames: "sidebar-[hash].js",
                assetFileNames: "sidebar-[hash][extname]",
            },
        },
    },
});
