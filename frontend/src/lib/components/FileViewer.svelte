<script lang="ts">
    import { selectedFile, fileContent } from "$lib/stores/fileStore";
    import { getFileContent } from "$lib/api/files";
    import { onMount } from "svelte";
    import JsonViewer from "./JsonViewer.svelte";

    let loading = false;
    let error = "";

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
</script>

<div class="file-viewer">
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
    .file-viewer {
        height: 100%;
        overflow: auto;
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
