<script lang="ts">
    import { selectedFile, fileContent } from "$lib/stores/fileStore";
    import { getFileContent } from "$lib/api/files";
    import { onMount } from "svelte";
    import JsonViewer from "./JsonViewer.svelte";
    import {
        renameFile,
        deleteFile,
        getFileTree,
        getUploadedFolders,
    } from "$lib/api/files";

    let loading = false;
    let error = "";
    let showActions = true;
    let actionsLoading = false;

    $: if ($selectedFile) {
        loadFile($selectedFile);
    }

    async function loadFile(path: string) {
        loading = true;
        error = "";

        try {
            const content = await getFileContent(path);
            fileContent.set(content);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load file";
            fileContent.set(null);
        } finally {
            loading = false;
        }
    }

    async function refreshFileTree() {
        const result = await getUploadedFolders();
        const folders = result.folders;
        if (folders.length === 0) {
            return;
        }
        const trees = await Promise.all(
            folders.map(async (folder) => {
                const res = await getFileTree(folder);
                return {
                    name: folder,
                    path: folder,
                    type: "directory",
                    children: res.fileTree,
                };
            }),
        );
    }

    async function handleRename() {
        if (!$fileContent?.path) return;
        const currentName = $fileContent.path.split("/").pop();
        const newName = prompt("Rename to:", currentName);
        if (!newName || newName === currentName) return;
        actionsLoading = true;
        try {
            const result = await renameFile($fileContent.path, newName);
            selectedFile.set(result.newPath);
            await refreshFileTree();
        } catch (e) {
            alert("Rename failed: " + (e instanceof Error ? e.message : e));
        } finally {
            actionsLoading = false;
        }
    }

    async function handleDelete() {
        if (!$fileContent?.path) return;
        if (!confirm(`Delete '${$fileContent.path}'? This cannot be undone.`))
            return;
        actionsLoading = true;
        try {
            await deleteFile($fileContent.path);
            selectedFile.set(null);
            await refreshFileTree();
        } catch (e) {
            alert("Delete failed: " + (e instanceof Error ? e.message : e));
        } finally {
            actionsLoading = false;
        }
    }
</script>

<div class="file-viewer">
    {#if $fileContent}
        <div class="file-header">
            <span class="file-path">{$fileContent.path}</span>
        </div>
        <div class="actions-bar" class:collapsed={!showActions}>
            <button
                class="toggle-btn"
                on:click={() => (showActions = !showActions)}
            >
                {showActions ? "▼" : "▶"} Actions
            </button>
            {#if showActions}
                <button
                    class="action-btn rename"
                    title="Rename"
                    on:click={handleRename}
                    disabled={actionsLoading}>✏️ Rename</button
                >
                <button
                    class="action-btn delete"
                    title="Delete"
                    on:click={handleDelete}
                    disabled={actionsLoading}>🗑️ Delete</button
                >
            {/if}
        </div>
    {/if}
    {#if loading}
        <div class="loading">Loading...</div>
    {:else if error}
        <div class="error">
            <p>❌ Error</p>
            <p>{error}</p>
        </div>
    {:else if $fileContent}
        {#if $fileContent.extension === ".json"}
            <JsonViewer
                content={$fileContent.content}
                path={$fileContent.path}
            />
        {:else if $fileContent.extension === ".pdf"}
            <div class="pdf-viewer">
                <embed
                    src={`http://localhost:3001/api/files/raw?path=${encodeURIComponent($fileContent.path)}`}
                    type="application/pdf"
                    width="100%"
                    height="800px"
                />
                <p class="hint">Path: {$fileContent.path}</p>
            </div>
        {:else}
            <div class="text-viewer">
                <div class="file-header">
                    <span class="file-path">{$fileContent.path}</span>
                </div>
                <pre class="content">{$fileContent.content}</pre>
            </div>
        {/if}
    {/if}
</div>

<style>
    .actions-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem 0.5rem 1rem;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }
    .actions-bar.collapsed {
        padding-bottom: 0.2rem;
    }
    .toggle-btn {
        background: none;
        border: none;
        color: #4ec9b0;
        font-size: 0.95rem;
        font-weight: 600;
        margin-right: 1rem;
        cursor: pointer;
        padding: 0.2em 0.7em;
        border-radius: 3px;
        opacity: 0.8;
        transition:
            opacity 0.1s,
            background 0.1s;
    }
    .toggle-btn:hover {
        opacity: 1;
        background: #2a2d2e;
    }
    .action-btn {
        background: none;
        border: none;
        color: #858585;
        cursor: pointer;
        font-size: 1em;
        padding: 0.2em 0.7em;
        border-radius: 3px;
        opacity: 0.7;
        transition:
            opacity 0.1s,
            background 0.1s;
    }
    .action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .action-btn:hover:not(:disabled) {
        opacity: 1;
        color: #e0e0e0;
        background: #2a2d2e;
    }
    .file-viewer {
        height: 100%;
        overflow: hidden; /* Changed from auto to hidden to make it non-scrollable */
        display: flex;
        flex-direction: column;
    }

    .loading,
    .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #858585;
    }

    .error {
        color: #f48771;
    }

    .error p {
        margin: 0.25rem 0;
    }

    .text-viewer,
    .pdf-viewer {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .file-header {
        padding: 0.75rem 1rem;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }

    .file-path {
        font-size: 0.85rem;
        color: #858585;
    }

    .content {
        flex: 1;
        margin: 0;
        padding: 1rem;
        font-family: "Consolas", "Monaco", "Courier New", monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        overflow: auto;
        color: #d4d4d4;
    }

    .pdf-viewer {
        align-items: center;
        justify-content: center;
        color: #858585;
    }

    .hint {
        font-size: 0.85rem;
        opacity: 0.7;
    }
</style>
