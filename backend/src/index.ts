import express from 'express';
import cors from 'cors';
import path from 'path';
import { uploadRouter } from './routes/upload';
import { filesRouter } from './routes/files';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/files', filesRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
