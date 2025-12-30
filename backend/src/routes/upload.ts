import { Router, Request, Response } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { validateFilePath, ensureUploadsDir, getUploadsDir } from '../utils/pathValidator';
import { buildFileTree } from '../utils/fileTree';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'temp/',
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    },
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    }
});

/**
 * POST /api/upload
 * Upload and extract a ZIP file
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        ensureUploadsDir();

        const uploadedFile = req.file;
        const originalName = path.parse(uploadedFile.originalname).name;
        const timestamp = Date.now();
        const extractDir = path.join(getUploadsDir(), `${originalName}-${timestamp}`);

        // Extract ZIP file
        const zip = new AdmZip(uploadedFile.path);
        zip.extractAllTo(extractDir, true);

        // Check if the extracted folder contains a single top-level folder
        const extractedItems = fs.readdirSync(extractDir);
        if (extractedItems.length === 1) {
            const singleFolderName = extractedItems[0];
            const singleFolderPath = path.join(extractDir, singleFolderName);
            const stats = fs.statSync(singleFolderPath);
            if (stats.isDirectory()) {
                // Rename the folder to include the identifier
                const newFolderName = `${singleFolderName}-${timestamp}`;
                const newFolderPath = path.join(extractDir, newFolderName);
                fs.renameSync(singleFolderPath, newFolderPath);

                // Move the renamed folder up to uploads directory
                const targetPath = path.join(getUploadsDir(), newFolderName);
                fs.renameSync(newFolderPath, targetPath);
                // Remove the now-empty extractDir
                fs.rmSync(extractDir, { recursive: true, force: true });

                // Build file tree from the new folder
                const fileTree = buildFileTree(targetPath, newFolderName);
                fs.unlinkSync(uploadedFile.path);
                return res.json({
                    success: true,
                    folderName: newFolderName,
                    fileTree
                });
            }
        }

        // Clean up temp file
        fs.unlinkSync(uploadedFile.path);

        // Build file tree
        const fileTree = buildFileTree(extractDir, `${originalName}-${timestamp}`);

        res.json({
            success: true,
            folderName: `${originalName}-${timestamp}`,
            fileTree
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to upload and extract file',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export { router as uploadRouter };
