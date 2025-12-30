<script lang="ts">
    let showActions = true;
    import { selectedFile, fileTree } from "$lib/stores/fileStore";
    import {
        renameFile,
        deleteFile,
        getFileTree,
        getUploadedFolders,
    } from "$lib/api/files";

    let actionsLoading = false;

    async function refreshFileTree() {
        const result = await getUploadedFolders();
        const folders = result.folders;
        if (folders.length === 0) {
            fileTree.set([]);
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
        fileTree.set(trees);
    }

    async function handleRename() {
        if (!path) return;
        const currentName = path.split("/").pop();
        const newName = prompt("Rename to:", currentName);
        if (!newName || newName === currentName) return;
        actionsLoading = true;
        try {
            const result = await renameFile(path, newName);
            selectedFile.set(result.newPath);
            await refreshFileTree();
        } catch (e) {
            alert("Rename failed: " + (e instanceof Error ? e.message : e));
        } finally {
            actionsLoading = false;
        }
    }

    async function handleDelete() {
        if (!path) return;
        if (!confirm(`Delete '${path}'? This cannot be undone.`)) return;
        actionsLoading = true;
        try {
            await deleteFile(path);
            selectedFile.set(null);
            await refreshFileTree();
        } catch (e) {
            alert("Delete failed: " + (e instanceof Error ? e.message : e));
        } finally {
            actionsLoading = false;
        }
    }
    import { writable } from "svelte/store";
    import FilterPanel from "./FilterPanel.svelte";

    function getFilterKey(path: string) {
        return `filters:${path}`;
    }

    export let content: string;
    export let path: string;

    let parsedData: any = null;
    let isArray = false;
    let expandedItems = writable<Set<number>>(new Set());
    let filters = writable<Record<string, any>>({});
    let filteredData: any[] = [];

    $: {
        // Restore filters from localStorage when path changes
        if (isArray && path) {
            const key = getFilterKey(path);
            if (typeof localStorage !== "undefined") {
                const stored = localStorage.getItem(key);
                if (stored) {
                    try {
                        filters.set(JSON.parse(stored));
                    } catch {}
                }
            }
        }
    }

    filters.subscribe((value) => {
        if (isArray && path && typeof localStorage !== "undefined") {
            localStorage.setItem(getFilterKey(path), JSON.stringify(value));
        }
    });

    $: {
        try {
            parsedData = JSON.parse(content);
            isArray = Array.isArray(parsedData);
            if (isArray) {
                applyFilters(parsedData);
            }
        } catch (e) {
            parsedData = null;
            isArray = false;
        }
    }

    $: applyFilters(parsedData);

    function applyFilters(data: any) {
        if (!isArray || !data) {
            filteredData = [];
            return;
        }

        filteredData = data.filter((item: any) => {
            for (const [key, filterValue] of Object.entries($filters)) {
                if (
                    filterValue === null ||
                    filterValue === undefined ||
                    filterValue === ""
                )
                    continue;

                const itemValue = item[key];

                // Handle different filter types
                if (typeof filterValue === "object" && "min" in filterValue) {
                    // Numeric range filter
                    const num = Number(itemValue);
                    if (filterValue.min !== null && num < filterValue.min)
                        return false;
                    if (filterValue.max !== null && num > filterValue.max)
                        return false;
                } else if (
                    typeof filterValue === "object" &&
                    "from" in filterValue
                ) {
                    // Date range filter
                    const date = new Date(itemValue);
                    if (filterValue.from && date < new Date(filterValue.from))
                        return false;
                    if (filterValue.to && date > new Date(filterValue.to))
                        return false;
                } else if (typeof filterValue === "boolean") {
                    // Boolean filter
                    if (itemValue !== filterValue) return false;
                } else if (Array.isArray(filterValue)) {
                    // Multi-select filter
                    if (
                        filterValue.length > 0 &&
                        !filterValue.includes(itemValue)
                    )
                        return false;
                } else if (typeof filterValue === "string") {
                    // Text search filter
                    const searchTerm = filterValue.toLowerCase();
                    const value = String(itemValue || "").toLowerCase();
                    if (!value.includes(searchTerm)) return false;
                }
            }
            return true;
        });
    }

    function toggleItem(index: number) {
        expandedItems.update((set) => {
            const newSet = new Set(set);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    }

    function convertSpotifyUris(text: string): string {
        return text.replace(
            /spotify:(track|album|artist|playlist|user):([a-zA-Z0-9]+)/g,
            (match, type, id) => {
                const url = `https://open.spotify.com/${type}/${id}`;
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="spotify-link">${match}</a>`;
            },
        );
    }

    function formatValue(key: string, value: any): string {
        if (value === null || value === undefined)
            return '<span class="null">null</span>';
        if (typeof value === "boolean")
            return `<span class="boolean">${value}</span>`;
        if (typeof value === "number")
            return `<span class="number">${value}</span>`;
        if (typeof value === "string") {
            // Convert Spotify URIs to links
            if (value.startsWith("spotify:")) {
                return convertSpotifyUris(value);
            }
            return `<span class="string">"${value}"</span>`;
        }
        if (typeof value === "object")
            return '<span class="object">{...}</span>';
        return String(value);
    }
</script>

<div class="json-viewer">
    <div class="file-header">
        {#if isArray && parsedData}
            <span class="item-count"
                >{filteredData.length} / {parsedData.length} items</span
            >
        {/if}
    </div>

    {#if isArray && parsedData && parsedData.length > 0}
        <FilterPanel data={parsedData} {filters} />

        <div class="list-view">
            {#each filteredData as item, index}
                <div class="list-item">
                    <button
                        class="item-header"
                        on:click={() => toggleItem(index)}
                    >
                        <span class="toggle-icon"
                            >{$expandedItems.has(index) ? "▼" : "▶"}</span
                        >
                        <span class="item-preview">
                            {#each Object.entries(item).slice(0, 2) as [key, value]}
                                <span class="preview-field">
                                    <span class="key">{key}:</span>
                                    <span class="value"
                                        >{String(value).slice(0, 50)}</span
                                    >
                                </span>
                            {/each}
                        </span>
                    </button>

                    {#if $expandedItems.has(index)}
                        <div class="item-content">
                            {#each Object.entries(item) as [key, value]}
                                <div class="field">
                                    <span class="field-key">{key}:</span>
                                    <span class="field-value"
                                        >{@html formatValue(key, value)}</span
                                    >
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <pre class="raw-json">{content}</pre>
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
    .actions-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem 0.5rem 1rem;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }
    .actions-title {
        font-size: 0.95rem;
        color: #4ec9b0;
        margin-right: 1rem;
        font-weight: 600;
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
    .json-viewer {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .file-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }

    .file-path {
        font-size: 0.85rem;
        color: #858585;
    }

    .item-count {
        font-size: 0.85rem;
        color: #4ec9b0;
    }

    .list-view {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
    }

    .list-item {
        background: #252525;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        overflow: hidden;
    }

    .item-header {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0.75rem;
        background: none;
        border: none;
        color: #cccccc;
        cursor: pointer;
        text-align: left;
        transition: background 0.1s;
    }

    .item-header:hover {
        background: #2a2d2e;
    }

    .toggle-icon {
        margin-right: 0.5rem;
        font-size: 0.7rem;
        color: #858585;
    }

    .item-preview {
        display: flex;
        gap: 1rem;
        overflow: hidden;
    }

    .preview-field {
        display: flex;
        gap: 0.25rem;
        font-size: 0.85rem;
    }

    .key {
        color: #9cdcfe;
    }

    .value {
        color: #ce9178;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-content {
        padding: 0 0.75rem 0.75rem 2rem;
        font-size: 0.9rem;
        font-family: "Consolas", "Monaco", "Courier New", monospace;
    }

    .field {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.35rem;
        line-height: 1.4;
    }

    .field-key {
        color: #9cdcfe;
        min-width: 150px;
    }

    .field-value {
        color: #d4d4d4;
        word-break: break-word;
    }

    .field-value :global(.string) {
        color: #ce9178;
    }

    .field-value :global(.number) {
        color: #b5cea8;
    }

    .field-value :global(.boolean) {
        color: #569cd6;
    }

    .field-value :global(.null) {
        color: #569cd6;
        font-style: italic;
    }

    .field-value :global(.spotify-link) {
        color: #1db954;
        text-decoration: underline;
    }

    .field-value :global(.spotify-link:hover) {
        color: #1ed760;
    }

    .raw-json {
        flex: 1;
        margin: 0;
        padding: 1rem;
        font-family: "Consolas", "Monaco", "Courier New", monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        overflow: auto;
        color: #d4d4d4;
    }
</style>
