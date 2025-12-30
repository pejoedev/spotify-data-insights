import fs from 'fs';
import path from 'path';

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

/**
 * Recursively builds a file tree structure
 */
export function buildFileTree(dirPath: string, relativePath: string = ''): FileNode[] {
    const items = fs.readdirSync(dirPath);
    const tree: FileNode[] = [];

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            tree.push({
                name: item,
                path: itemRelativePath,
                type: 'directory',
                children: buildFileTree(fullPath, itemRelativePath)
            });
        } else {
            tree.push({
                name: item,
                path: itemRelativePath,
                type: 'file'
            });
        }
    }

    return tree.sort((a, b) => {
        // Directories first, then alphabetically
        if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
}
