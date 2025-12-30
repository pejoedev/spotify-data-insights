<script lang="ts">
    import { onMount } from "svelte";
    import FileExplorer from "$lib/components/FileExplorer.svelte";
    import FileViewer from "$lib/components/FileViewer.svelte";
    import { selectedFile, fileTree } from "$lib/stores/fileStore";
    import {
        uploadZipFile,
        getUploadedFolders,
        getFileTree,
    } from "$lib/api/files";

    let uploading = false;
    let error = "";
    let folders: string[] = [];
    let selectedFolder: string | null = null;

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        uploading = true;
        error = "";

        try {
            const result = await uploadZipFile(file);
            fileTree.set(result.fileTree);
            await loadFolders();
            selectedFolder = result.folderName;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to upload file";
        } finally {
            uploading = false;
            input.value = "";
        }
    }

    async function loadFolders() {
        try {
            const result = await getUploadedFolders();
            folders = result.folders;
            if (folders.length > 0 && !selectedFolder) {
                selectedFolder = folders[folders.length - 1];
            }
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load folders";
        }
    }

    async function loadFileTree(folder: string) {
        try {
            const result = await getFileTree(folder);
            fileTree.set(result.fileTree);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load file tree";
        }
    }

    $: if (selectedFolder) {
        loadFileTree(selectedFolder);
    }

    onMount(() => {
        loadFolders();
    });
</script>

<div class="app">
    <header>
        <h1>🎵 Spotify Data Explorer</h1>
        <label class="upload-btn" class:disabled={uploading}>
            <input
                type="file"
                accept=".zip"
                on:change={handleFileUpload}
                disabled={uploading}
            />
            {uploading ? "Uploading..." : "📁 Upload ZIP"}
        </label>
    </header>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    <div class="main-content">
        <aside class="sidebar">
            <div class="folder-list">
                <h2>Uploaded Folders</h2>
                {#if folders.length === 0}
                    <div class="empty">No uploads yet</div>
                {:else}
                    <ul>
                        {#each folders as folder}
                            <li>
                                <button
                                    class:selected={selectedFolder === folder}
                                    on:click={() => {
                                        selectedFolder = folder;
                                    }}
                                >
                                    {folder}
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
            <FileExplorer />
        </aside>
        <main class="viewer">
            {#if $selectedFile}
                <FileViewer />
            {:else}
                <div class="empty-state">
                    <p>👈 Select a file to view</p>
                    <p class="hint">
                        Upload a Spotify data export ZIP to get started
                    </p>
                </div>
            {/if}
        </main>
    </div>
</div>

<style>
    :global(*) {
        box-sizing: border-box;
    }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen, Ubuntu, Cantarell, sans-serif;
        background: #1e1e1e;
        color: #cccccc;
        overflow: hidden;
    }

    .app {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 1rem;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }

    h1 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
    }

    .upload-btn {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #0e639c;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.2s;
    }

    .upload-btn:hover:not(.disabled) {
        background: #1177bb;
    }

    .upload-btn.disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .upload-btn input {
        display: none;
    }

    .error {
        padding: 0.75rem 1rem;
        background: #5a1d1d;
        color: #f48771;
        border-bottom: 1px solid #be1100;
    }

    .main-content {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .sidebar {
        width: 300px;
        background: #252525;
        border-right: 1px solid #3c3c3c;
        overflow-y: auto;
    }

    .viewer {
        flex: 1;
        overflow: auto;
        background: #1e1e1e;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #858585;
    }

    .empty-state p {
        margin: 0.5rem 0;
        font-size: 1.1rem;
    }

    .hint {
        font-size: 0.9rem;
        opacity: 0.7;
    }

    .folder-list {
        padding: 1rem;
        border-bottom: 1px solid #3c3c3c;
    }

    .folder-list h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: #4ec9b0;
    }

    .folder-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .folder-list li {
        margin-bottom: 0.5rem;
    }

    .folder-list button {
        background: none;
        border: none;
        color: #cccccc;
        cursor: pointer;
        font-size: 0.95rem;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        transition: background 0.1s;
    }

    .folder-list button.selected {
        background: #094771;
        color: #fff;
    }

    .folder-list button:hover {
        background: #2a2d2e;
    }
</style>
