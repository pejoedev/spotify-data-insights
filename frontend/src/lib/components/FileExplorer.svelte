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
    }

    .empty {
        padding: 1rem;
        color: #858585;
        text-align: center;
        font-size: 0.9rem;
    }

    .tree {
        padding: 0.5rem 0;
        overflow-y: auto; /* Added to make the tree scrollable */
        max-height: 100%; /* Ensures the tree does not exceed its container's height */
    }
</style>
