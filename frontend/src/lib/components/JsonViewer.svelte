<script lang="ts">
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
    let filteredData = writable<any[]>([]);

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
            if (isArray && parsedData) {
                filteredData.set(parsedData);
            }
        } catch (e) {
            parsedData = null;
            isArray = false;
            filteredData.set([]);
        }
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
                >{$filteredData.length} / {parsedData.length} items</span
            >
        {/if}
    </div>

    {#if isArray && parsedData && parsedData.length > 0}
        <FilterPanel data={parsedData} {filters} {filteredData} />

        <div class="list-view">
            {#each $filteredData as item, index}
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
