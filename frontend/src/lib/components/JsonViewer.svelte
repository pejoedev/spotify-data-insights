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
    let selectedItemForModal: any = null;
    let showModal = false;

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
                filteredData.set(parsedData);
            } else if (parsedData !== null && typeof parsedData === "object") {
                // Convert single object to array with one item
                filteredData.set([parsedData]);
            } else {
                filteredData.set([]);
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

    function openModal(item: any) {
        selectedItemForModal = item;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedItemForModal = null;
    }

    function convertSpotifyUris(text: string): string {
        return text.replace(
            /spotify:(track|album|artist|playlist|user):([a-zA-Z0-9]+)/g,
            (match, type, id) => {
                const url = `https://open.spotify.com/${type}/${id}`;
                return `<a href="${url}" target="_blank" rel="noopener"
                 class="spotify-link">${match}</a>`;
            },
        );
    }

    function highlightJson(json: string): string {
        let result = json
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(
                /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|\b(true|false|null)\b)/g,
                (match) => {
                    let cls = "number";
                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = "key";
                        } else {
                            cls = "string";
                        }
                    } else if (/true|false/.test(match)) {
                        cls = "boolean";
                    } else if (/null/.test(match)) {
                        cls = "null";
                    }
                    return `<span class="${cls}">${match}</span>`;
                },
            );

        // Convert spotify URIs to links
        result = result.replace(
            /(<span class="string">")([^"]*spotify:[a-z]+:[a-zA-Z0-9]+[^"]*)(")<\/span>/g,
            (match, startSpan, content, endSpan) => {
                const converted = convertSpotifyUris(content);
                return `${startSpan}${converted}${endSpan}</span>`;
            },
        );

        return result;
    }

    function convertSpotifyUrisInField(text: string): string {
        return text.replace(
            /spotify:(track|album|artist|playlist|user):([a-zA-Z0-9]+)/g,
            (match, type, id) => {
                const url = `https://open.spotify.com/${type}/${id}`;
                return `<a href="${url}" target="_blank" rel="noopener"
                 class="spotify-link">${match}</a>`;
            },
        );
    }

    function formatValue(key: string, value: any, depth = 0): string {
        if (value === null || value === undefined)
            return '<span class="null">null</span>';
        if (typeof value === "boolean")
            return `<span class="boolean">${value}</span>`;
        if (typeof value === "number")
            return `<span class="number">${value}</span>`;
        if (typeof value === "string") {
            if (value.startsWith("spotify:")) {
                return convertSpotifyUrisInField(value);
            }
            return `<span class="string">"${value}"</span>`;
        }
        if (Array.isArray(value)) {
            return `[
                ${value
                    .slice(0, 3)
                    .map((item) => formatValue("", item, depth + 1))
                    .join(", ")}
                ${value.length > 3 ? "..." : ""}
            ]`;
        }
        if (typeof value === "object") {
            const entries = Object.entries(value)
                .slice(0, 3)
                .map(
                    ([k, v]) =>
                        `<span class="key">${k}:</span>
                         ${formatValue(k, v, depth + 1)}`,
                )
                .join(", ");
            return `{
                ${entries}
                ${Object.keys(value).length > 3 ? "..." : ""}
            }`;
        }
        return String(value);
    }
</script>

<div class="json-viewer">
    {#if !isArray && $filteredData.length > 0}
        <!-- Single object view - show full prettified JSON -->
        <div class="file-header">
            <h2>JSON Object</h2>
        </div>
        <pre class="modal-json single-object">{@html highlightJson(
                JSON.stringify($filteredData[0], null, 2),
            )}</pre>
    {:else}
        <!-- Array view -->
        <div class="file-header">
            {#if isArray && parsedData}
                <span class="item-count"
                    >{$filteredData.length} / {parsedData.length} items</span
                >
            {/if}
        </div>

        {#if $filteredData.length > 0}
            {#if isArray}
                <FilterPanel data={parsedData} {filters} {filteredData} />
            {/if}

            <div class="list-view">
                {#each $filteredData as item, index}
                    <div class="list-item">
                        <div class="item-header-wrapper">
                            <button
                                class="item-header"
                                on:click={() => toggleItem(index)}
                            >
                                <span class="toggle-icon"
                                    >{$expandedItems.has(index)
                                        ? "▼"
                                        : "▶"}</span
                                >
                                <span class="item-preview">
                                    {#each Object.entries(item).slice(0, 2) as [key, value]}
                                        <span class="preview-field">
                                            <span class="key">{key}:</span>
                                            <span class="value"
                                                >{String(value).slice(
                                                    0,
                                                    50,
                                                )}</span
                                            >
                                        </span>
                                    {/each}
                                </span>
                            </button>
                            <button
                                class="view-json-btn"
                                on:click={() => openModal(item)}
                                title="View full JSON"
                            >
                                View JSON
                            </button>
                        </div>

                        {#if $expandedItems.has(index)}
                            <div class="item-content">
                                {#each Object.entries(item) as [key, value]}
                                    <div class="field">
                                        <span class="field-key">{key}:</span>
                                        <span class="field-value"
                                            >{@html formatValue(
                                                key,
                                                value,
                                            )}</span
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
    {/if}
</div>

{#if showModal}
    <div class="modal-overlay" on:click={closeModal}>
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <h2>Full JSON</h2>
                <button
                    class="close-btn"
                    on:click={closeModal}
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>
            <pre class="modal-json">{@html highlightJson(
                    JSON.stringify(selectedItemForModal, null, 2),
                )}</pre>
        </div>
    </div>
{/if}

<style>
    .json-viewer {
        height: auto; /* Changed from 100% to auto to allow dynamic height adjustment */
        display: flex;
        flex-direction: column;
        overflow: auto; /* Added to prevent content from flowing outside the screen */
        max-width: 100%; /* Added to ensure the element does not exceed the visible screen width */
        box-sizing: border-box; /* Ensures padding and borders are included in the element's width */
    }

    .file-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }

    .file-header h2 {
        margin: 0;
        color: #cccccc;
        font-size: 1rem;
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

    .item-header-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .item-header {
        flex: 1;
        display: flex;
        align-items: center;
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

    .view-json-btn {
        margin-right: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: #3c3c3c;
        border: 1px solid #555555;
        color: #cccccc;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.85rem;
        transition:
            background 0.1s,
            border-color 0.1s;
    }

    .view-json-btn:hover {
        background: #454545;
        border-color: #707070;
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

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: #252525;
        border: 1px solid #3c3c3c;
        border-radius: 8px;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid #3c3c3c;
    }

    .modal-header h2 {
        margin: 0;
        color: #cccccc;
        font-size: 1.1rem;
    }

    .close-btn {
        background: none;
        border: none;
        color: #cccccc;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
        transition: background 0.1s;
    }

    .close-btn:hover {
        background: #3c3c3c;
    }

    .modal-json {
        flex: 1;
        margin: 0;
        padding: 1rem;
        font-family: "Consolas", "Monaco", "Courier New", monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        overflow: auto;
        color: #d4d4d4;
    }

    .modal-json.single-object {
        background: #252525;
        border-bottom: 1px solid #3c3c3c;
    }

    .modal-json :global(.string) {
        color: #ce9178;
    }

    .modal-json :global(.number) {
        color: #b5cea8;
    }

    .modal-json :global(.boolean) {
        color: #569cd6;
    }

    .modal-json :global(.key) {
        color: #9cdcfe;
    }

    .modal-json :global(.null) {
        color: #569cd6;
        font-style: italic;
    }

    .modal-json :global(.spotify-link) {
        color: #1db954;
        text-decoration: underline;
    }

    .modal-json :global(.spotify-link:hover) {
        color: #1ed760;
    }
</style>
