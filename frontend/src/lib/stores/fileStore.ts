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
export const selectedFile = writable<string | null>(null);
export const fileContent = writable<FileContent | null>(null);
export const expandedFolders = writable<Set<string>>(new Set());
