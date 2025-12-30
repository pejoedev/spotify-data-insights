<script lang="ts">
    import FileExplorer from "$lib/components/FileExplorer.svelte";
    import FileViewer from "$lib/components/FileViewer.svelte";
    import { selectedFile, fileTree } from "$lib/stores/fileStore";
    import { uploadZipFile } from "$lib/api/files";

    let uploading = false;
    let error = "";

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        uploading = true;
        error = "";

        try {
            const result = await uploadZipFile(file);
            fileTree.set(result.fileTree);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to upload file";
        } finally {
            uploading = false;
            input.value = "";
        }
    }
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
</style>
