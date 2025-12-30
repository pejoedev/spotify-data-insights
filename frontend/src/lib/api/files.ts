const API_BASE = 'http://localhost:3001/api';

export async function uploadZipFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
    }

    return response.json();
}

export async function getFileContent(path: string) {
    const response = await fetch(`${API_BASE}/files/content?path=${encodeURIComponent(path)}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load file');
    }

    return response.json();
}

export async function renameFile(oldPath: string, newName: string) {
    const response = await fetch(`${API_BASE}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newName })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename');
    }

    return response.json();
}

export async function deleteFile(path: string) {
    const response = await fetch(`${API_BASE}/files/delete?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete');
    }

    return response.json();
}
