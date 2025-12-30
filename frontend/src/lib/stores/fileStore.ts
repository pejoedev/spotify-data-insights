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
export const expandedFolders = writable<Set<string>>(new Set());
