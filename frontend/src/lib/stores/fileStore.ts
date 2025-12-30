import { writable } from 'svelte/store';

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

export interface FileContent {
    content: string;
    path: string;
    extension: string;
}

export const fileTree = writable<FileNode[]>([]);

function createSelectedFileStore() {
    const key = 'selectedFile';
    const initial = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    const store = writable<string | null>(initial);
    store.subscribe((value) => {
        if (typeof localStorage !== 'undefined') {
            if (value) localStorage.setItem(key, value);
            else localStorage.removeItem(key);
        }
    });
    return store;
}

export const selectedFile = createSelectedFileStore();
export const fileContent = writable<FileContent | null>(null);
function createExpandedFoldersStore() {
    const key = 'expandedFolders';
    let initial: Set<string> = new Set();
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                initial = new Set(JSON.parse(stored));
            } catch { }
        }
    }
    const store = writable<Set<string>>(initial);
    store.subscribe((value) => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(Array.from(value)));
        }
    });
    return store;
}

export const expandedFolders = createExpandedFoldersStore();
