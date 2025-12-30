<script lang="ts">
    import { onMount } from "svelte";
    import FileExplorer from "$lib/components/FileExplorer.svelte";
    import FileViewer from "$lib/components/FileViewer.svelte";
    import FilterPanel from "$lib/components/FilterPanel.svelte";
    import { writable } from "svelte/store";
    import { selectedFile, fileTree } from "$lib/stores/fileStore";
    import {
        uploadZipFile,
        getUploadedFolders,
        getFileTree,
    } from "$lib/api/files";

    interface DataItem {
        name: string;
        value: number;
    }

    let data: DataItem[] = []; // Explicitly typed data array
    let filters = writable<Record<string, any>>({});
    let filteredData = writable<DataItem[]>(data); // Explicitly typed filtered data

    let uploading = false;
    let error = "";
    let folders: string[] = [];
    let selectedFolder: string | null = null;
    const folderKey = "selectedFolder";

    let sidebarWidth = 300; // Default width of the sidebar
    let isResizing = false;

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        uploading = true;
        error = "";

        try {
            const result = await uploadZipFile(file);
            fileTree.set(result.fileTree);
            await loadFoldersAndTrees();
            selectedFolder = result.folderName;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to upload file";
        } finally {
            uploading = false;
            input.value = "";
        }
    }

    async function loadFoldersAndTrees() {
        try {
            const result = await getUploadedFolders();
            folders = result.folders;
            if (folders.length === 0) {
                fileTree.set([]);
                return;
            }
            // Fetch all file trees in parallel
            const trees = await Promise.all(
                folders.map(async (folder) => {
                    const res = await getFileTree(folder);
                    // Wrap each tree as a root folder node
                    return {
                        name: folder,
                        path: folder,
                        type: "directory" as const, // Ensure type matches 'FileNode'
                        children: res.fileTree,
                    };
                }),
            );
            fileTree.set(trees);
            if (!selectedFolder) {
                selectedFolder = folders[folders.length - 1];
            }
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load folders";
        }
    }

    $: if (folders.length > 0) {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(folderKey, selectedFolder ?? "");
        }
    }

    onMount(() => {
        if (typeof localStorage !== "undefined") {
            const saved = localStorage.getItem(folderKey);
            if (saved) selectedFolder = saved;
        }
        loadFoldersAndTrees();
    });

    function startResizing() {
        isResizing = true;
    }

    function stopResizing() {
        isResizing = false;
    }

    function resizeSidebar(event: MouseEvent) {
        if (isResizing) {
            sidebarWidth = Math.max(200, Math.min(600, event.clientX)); // Restrict width between 200px and 600px
        }
    }

    onMount(() => {
        window.addEventListener("mousemove", resizeSidebar);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resizeSidebar);
            window.removeEventListener("mouseup", stopResizing);
        };
    });

    // Simulate loading data on mount
    onMount(async () => {
        data = await fetchData(); // Replace with actual data fetching logic
        filteredData.set(data);
    });

    async function fetchData(): Promise<DataItem[]> {
        // Simulate fetching data
        return [
            { name: "Item 1", value: 10 },
            { name: "Item 2", value: 20 },
            { name: "Item 3", value: 30 },
        ];
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
        <aside class="sidebar" style="width: {sidebarWidth}px;">
            <FileExplorer />
            <button
                class="resizer"
                aria-label="Resize sidebar"
                on:mousedown={startResizing}
            ></button>
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
        position: relative;
        width: 300px;
        background: #2e2e2e;
        border-right: 0px solid #3c3c3c;
        overflow: hidden;
    }

    .resizer {
        position: absolute;
        top: 0;
        right: 0;
        width: 5px;
        height: 100%;
        cursor: ew-resize;
        background: #444;
        z-index: 1;
        padding-inline-end: 2px;
        padding-inline-start: 2px;
        border: none;
    }

    .resizer:hover {
        background: #666;
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
