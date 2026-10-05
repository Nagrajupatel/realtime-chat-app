import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Room from '../models/Room.js';
import File from '../models/File.js';
import Message, { populateMessage } from '../models/Message.js';
import { protect } from '../middleware/auth.js';
import { putObject, getObject } from '../config/s3.js';
import { sha256 } from '../utils/crypto.js';

const router = Router();
router.use(protect);

const MAX_MB = 10;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024 } });

const isMember = (room, userId) => room.members.some((m) => m.equals(userId));

// Upload: hash -> S3 (AES-256 at rest, S3 verifies the SHA-256) -> save metadata -> broadcast message
router.post('/rooms/:roomId/files', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!isMember(room, req.user._id)) return res.status(403).json({ message: 'Join the room first' });

    const hash = sha256(req.file.buffer);
    const s3Key = `rooms/${room._id}/${crypto.randomUUID()}`;
    await putObject(s3Key, req.file.buffer, req.file.mimetype, hash.base64);

    const file = await File.create({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      s3Key,
      sha256: hash.hex,
      uploader: req.user._id,
      room: room._id,
    });

    const msg = await Message.create({ room: room._id, sender: req.user._id, file: file._id });
    await populateMessage(msg);
    req.app.get('io').to(String(room._id)).emit('message:new', msg);
    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});

// Download: re-hash the bytes from S3 and compare with the stored SHA-256 before sending
router.get('/files/:id/download', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const room = await Room.findById(file.room);
    if (!room || !isMember(room, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const data = await getObject(file.s3Key);
    if (sha256(data).hex !== file.sha256) {
      return res.status(422).json({ message: 'Integrity check failed. File may be corrupted.' });
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(data);
  } catch (err) {
    next(err);
  }
});

export default router;
