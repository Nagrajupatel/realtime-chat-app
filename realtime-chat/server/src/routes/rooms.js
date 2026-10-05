import { Router } from 'express';
import Room from '../models/Room.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', async (_req, res, next) => {
  try {
    const rooms = await Room.find().sort({ createdAt: 1 }).populate('owner', 'username');
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Room name is required' });
    if (await Room.findOne({ name })) return res.status(409).json({ message: 'Room already exists' });

    const room = await Room.create({ name, description, owner: req.user._id, members: [req.user._id] });
    req.app.get('io').in(`user:${req.user._id}`).socketsJoin(String(room._id));
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, { $addToSet: { members: req.user._id } }, { new: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    req.app.get('io').in(`user:${req.user._id}`).socketsJoin(String(room._id));
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/leave', async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, { $pull: { members: req.user._id } }, { new: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    req.app.get('io').in(`user:${req.user._id}`).socketsLeave(String(room._id));
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

// Only the room owner or an admin can delete a room
router.delete('/:id', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the owner or an admin can delete this room' });
    }
    await Message.deleteMany({ room: room._id });
    await room.deleteOne();
    req.app.get('io').to(String(room._id)).emit('room:deleted', { roomId: String(room._id) });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
