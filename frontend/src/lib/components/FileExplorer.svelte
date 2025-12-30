<script lang="ts">
    import { fileTree } from "$lib/stores/fileStore";
    import FileTreeNode from "$lib/components/FileTreeNode.svelte";
</script>


<div class="file-explorer">
    {#if $fileTree.length === 0}
        <div class="empty">No files uploaded yet</div>
    {:else}
        <div class="tree">
            {#each $fileTree as node}
                <FileTreeNode {node} level={0} />
            {/each}
        </div>
    {/if}
</div>

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
