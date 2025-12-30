import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

/**
 * Validates that a file path is safe and within the uploads directory
 * Prevents directory traversal attacks
 */
export function validateFilePath(relativePath: string): { valid: boolean; absolutePath?: string; error?: string } {
    // Check for directory traversal patterns
    if (relativePath.includes('..') || relativePath.includes('\\..') || relativePath.includes('../')) {
        return { valid: false, error: 'Invalid path: directory traversal detected' };
    }

    // Normalize the path
    const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.resolve(UPLOADS_DIR, normalizedPath);

    // Ensure the resolved path is within the uploads directory
    if (!absolutePath.startsWith(UPLOADS_DIR)) {
        return { valid: false, error: 'Invalid path: outside allowed directory' };
    }

    return { valid: true, absolutePath };
}

/**
 * Gets the uploads directory path
 */
export function getUploadsDir(): string {
    return UPLOADS_DIR;
}

/**
 * Ensures the uploads directory exists
 */
export function ensureUploadsDir(): void {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}
