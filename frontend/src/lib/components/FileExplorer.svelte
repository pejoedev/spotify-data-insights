<script lang="ts">
    import {
        fileTree,
        selectedFile,
        expandedFolders,
    } from "$lib/stores/fileStore";
    import type { FileNode } from "$lib/stores/fileStore";

    function toggleFolder(path: string) {
        expandedFolders.update((set) => {
            const newSet = new Set(set);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    }

    function selectFile(path: string, type: string) {
        if (type === "file") {
            selectedFile.set(path);
        } else {
            toggleFolder(path);
        }
    }

    function getIcon(node: FileNode): string {
        if (node.type === "directory") {
            return $expandedFolders.has(node.path) ? "📂" : "📁";
        }
        const ext = node.name.split(".").pop()?.toLowerCase();
        switch (ext) {
            case "json":
                return "📄";
            case "pdf":
                return "📕";
            case "txt":
                return "📝";
            case "csv":
                return "📊";
            default:
                return "📄";
        }
    }
</script>

<div class="file-explorer">
    {#if $fileTree.length === 0}
        <div class="empty">No files uploaded yet</div>
    {:else}
        <div class="tree">
            {#each $fileTree as node}
                <svelte:self {node} level={0} />
            {/each}
        </div>
    {/if}
</div>

{#if $$props.node}
    {@const node = $$props.node}
    {@const level = $$props.level || 0}

    <div class="tree-item" style="padding-left: {level * 12}px">
        <button
            class="item-button"
            class:selected={node.type === "file" && $selectedFile === node.path}
            on:click={() => selectFile(node.path, node.type)}
        >
            <span class="icon">{getIcon(node)}</span>
            <span class="name">{node.name}</span>
        </button>

        {#if node.type === "directory" && $expandedFolders.has(node.path) && node.children}
            {#each node.children as child}
                <svelte:self node={child} level={level + 1} />
            {/each}
        {/if}
    </div>
{/if}

<style>
    .file-explorer {
        height: 100%;
        overflow-y: auto;
    }

    .empty {
        padding: 1rem;
        color: #858585;
        text-align: center;
        font-size: 0.9rem;
    }

    .tree {
        padding: 0.5rem 0;
    }

    .tree-item {
        user-select: none;
    }

    .item-button {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0.35rem 0.5rem;
        background: none;
        border: none;
        color: #cccccc;
        cursor: pointer;
        text-align: left;
        font-size: 0.9rem;
        transition: background 0.1s;
    }

    .item-button:hover {
        background: #2a2d2e;
    }

    .item-button.selected {
        background: #094771;
    }

    .icon {
        margin-right: 0.4rem;
        font-size: 1rem;
    }

    .name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
