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
