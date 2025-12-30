import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { validateFilePath, getUploadsDir } from '../utils/pathValidator';
import { buildFileTree } from '../utils/fileTree';

const router = Router();

/**
 * GET /api/files/list
 * Get list of all uploaded ZIP folders
 */
router.get('/list', (req: Request, res: Response) => {
    try {
        const uploadsDir = getUploadsDir();

        if (!fs.existsSync(uploadsDir)) {
            return res.json({ folders: [] });
        }

        const items = fs.readdirSync(uploadsDir);
        const folders = items.filter(item => {
            const fullPath = path.join(uploadsDir, item);
            return fs.statSync(fullPath).isDirectory();
        });

        res.json({ folders });
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ error: 'Failed to list folders' });
    }
});

/**
 * GET /api/files/tree/:folderName
 * Get file tree for a specific folder
 */
router.get('/tree/:folderName', (req: Request, res: Response) => {
    try {
        const { folderName } = req.params;
        const validation = validateFilePath(folderName);

        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        if (!fs.existsSync(validation.absolutePath!)) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const fileTree = buildFileTree(validation.absolutePath!, folderName);
        res.json({ fileTree });
    } catch (error) {
        console.error('Tree error:', error);
        res.status(500).json({ error: 'Failed to build file tree' });
    }
});

/**
 * GET /api/files/content
 * Get file content by path
 */
router.get('/content', (req: Request, res: Response) => {
    try {
        const filePath = req.query.path as string;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const validation = validateFilePath(filePath);

        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        if (!fs.existsSync(validation.absolutePath!)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const stats = fs.statSync(validation.absolutePath!);
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const content = fs.readFileSync(validation.absolutePath!, 'utf-8');

        res.json({
            content,
            path: filePath,
            extension: ext
        });
    } catch (error) {
        console.error('Content error:', error);
        res.status(500).json({
            error: 'Failed to read file',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/files/rename
 * Rename a file or folder
 */
router.post('/rename', (req: Request, res: Response) => {
    try {
        const { oldPath, newName } = req.body;

        if (!oldPath || !newName) {
            return res.status(400).json({ error: 'oldPath and newName are required' });
        }

        // Validate newName doesn't contain path separators or traversal
        if (newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
            return res.status(400).json({ error: 'Invalid new name' });
        }

        const validation = validateFilePath(oldPath);

        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        if (!fs.existsSync(validation.absolutePath!)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const oldAbsolutePath = validation.absolutePath!;
        const newAbsolutePath = path.join(path.dirname(oldAbsolutePath), newName);

        // Ensure new path is still within uploads directory
        const newValidation = validateFilePath(path.relative(getUploadsDir(), newAbsolutePath));
        if (!newValidation.valid) {
            return res.status(400).json({ error: 'Invalid new path' });
        }

        if (fs.existsSync(newAbsolutePath)) {
            return res.status(400).json({ error: 'A file with that name already exists' });
        }

        fs.renameSync(oldAbsolutePath, newAbsolutePath);

        const newPath = path.relative(getUploadsDir(), newAbsolutePath);
        res.json({ success: true, newPath });
    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({
            error: 'Failed to rename',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/files/delete
 * Delete a file or folder
 */
router.delete('/delete', (req: Request, res: Response) => {
    try {
        const filePath = req.query.path as string;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const validation = validateFilePath(filePath);

        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        if (!fs.existsSync(validation.absolutePath!)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const stats = fs.statSync(validation.absolutePath!);

        if (stats.isDirectory()) {
            fs.rmSync(validation.absolutePath!, { recursive: true, force: true });
        } else {
            fs.unlinkSync(validation.absolutePath!);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: 'Failed to delete',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export { router as filesRouter };
