import { Router } from 'express';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

// Message history (members only). ?before=<ISO date>&limit=50
router.get('/rooms/:roomId/messages', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.members.some((m) => m.equals(req.user._id))) {
      return res.status(403).json({ message: 'Join the room to read messages' });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const query = { room: room._id };
    if (req.query.before) query.createdAt = { $lt: new Date(req.query.before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username')
      .populate('file', 'originalName size mimeType sha256');
    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

// Sender or admin can delete a message
router.delete('/messages/:id', async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (!msg.sender.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await msg.deleteOne();
    req.app.get('io').to(String(msg.room)).emit('message:deleted', { id: String(msg._id), roomId: String(msg.room) });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
