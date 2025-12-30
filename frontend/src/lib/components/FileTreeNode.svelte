<script lang="ts">
    import {
        selectedFile,
        expandedFolders,
        fileTree,
    } from "$lib/stores/fileStore";
    import type { FileNode } from "$lib/stores/fileStore";

    import {
        renameFile,
        deleteFile,
        getFileTree,
        getUploadedFolders,
    } from "$lib/api/files";

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

    async function renameNode(event: Event) {
        event.stopPropagation();
        const newName = prompt("Rename to:", node.name);
        if (!newName || newName === node.name) return;
        try {
            const result = await renameFile(node.path, newName);
            // If the selected file is affected by the rename, update its path
            if ($selectedFile) {
                // If renaming a file
                if (node.type === "file" && $selectedFile === node.path) {
                    selectedFile.set(result.newPath);
                }
                // If renaming a folder and the selected file is inside it
                if (
                    node.type === "directory" &&
                    $selectedFile.startsWith(node.path + "/")
                ) {
                    const suffix = $selectedFile.slice(node.path.length);
                    selectedFile.set(result.newPath + suffix);
                }
            }
            await refreshFileTree();
        } catch (e) {
            alert("Rename failed: " + (e instanceof Error ? e.message : e));
        }
    }

    async function deleteNode(event: Event) {
        event.stopPropagation();
        if (!confirm(`Delete '${node.name}'? This cannot be undone.`)) return;
        try {
            // If the selected file is being deleted (or is inside this folder), clear it
            if (
                $selectedFile &&
                ($selectedFile === node.path ||
                    $selectedFile.startsWith(node.path + "/"))
            ) {
                selectedFile.set(null);
            }
            await deleteFile(node.path);
            await refreshFileTree();
        } catch (e) {
            alert("Delete failed: " + (e instanceof Error ? e.message : e));
        }
    }

    export let node: FileNode;
    export let level: number = 0;

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

<div class="tree-item" style="padding-left: {level * 12}px">
    <div class="tree-row">
        {#if node.type === "directory"}
            <span
                class="chevron"
                on:click={() => toggleFolder(node.path)}
                style="cursor: pointer;"
            >
                {#if node.children && node.children.length > 0}
                    {$expandedFolders.has(node.path) ? "▼" : "▶"}
                {/if}
            </span>
        {/if}
        <button
            class="item-button"
            class:selected={node.type === "file" && $selectedFile === node.path}
            on:click={() => selectFile(node.path, node.type)}
        >
            <span class="icon">{getIcon(node)}</span>
            <span class="name">{node.name}</span>
        </button>
        <button class="action-btn rename" title="Rename" on:click={renameNode}
            >✏️</button
        >
        <button class="action-btn delete" title="Delete" on:click={deleteNode}
            >🗑️</button
        >
    </div>
    {#if node.type === "directory" && $expandedFolders.has(node.path) && node.children}
        <div class="children">
            {#each node.children as child}
                <svelte:self node={child} level={level + 1} />
            {/each}
        </div>
    {/if}
</div>

<style>
    .tree-item {
        user-select: none;
        display: flex;
        flex-direction: column;
    }
    .tree-row {
        display: flex;
        align-items: center;
    }
    .chevron {
        width: 1.1em;
        display: inline-block;
        text-align: center;
        color: #858585;
        font-size: 0.9em;
        margin-right: 0.1em;
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
    .children {
        display: flex;
        flex-direction: column;
        /* No margin-left; rely on .tree-item padding for indentation */
    }
    .action-btn {
        background: none;
        border: none;
        color: #858585;
        cursor: pointer;
        margin-left: 0.2em;
        font-size: 1em;
        padding: 0 0.2em;
        opacity: 0.7;
        transition: opacity 0.1s;
    }
    .action-btn:hover {
        opacity: 1;
        color: #e0e0e0;
    }
</style>
