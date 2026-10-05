import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Message, { populateMessage } from '../models/Message.js';

export function initSocket(io) {
  // JWT authentication for every socket connection
  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(id);
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { _id, username } = socket.user;

    // Personal channel (REST routes use it to add/remove this user's sockets from rooms)
    socket.join(`user:${_id}`);
    const rooms = await Room.find({ members: _id }).select('_id');
    rooms.forEach((r) => socket.join(String(r._id)));

    socket.on('message:send', async ({ roomId, text } = {}, ack = () => {}) => {
      try {
        const clean = (text || '').trim();
        if (!clean) return ack({ error: 'Message is empty' });
        if (clean.length > 2000) return ack({ error: 'Message too long' });

        const room = await Room.findById(roomId);
        if (!room || !room.members.some((m) => m.equals(_id))) return ack({ error: 'Not a member of this room' });

        const msg = await Message.create({ room: room._id, sender: _id, text: clean });
        await populateMessage(msg);
        io.to(String(room._id)).emit('message:new', msg);
        ack({ ok: true });
      } catch {
        ack({ error: 'Could not send message' });
      }
    });

    socket.on('typing', ({ roomId } = {}) => {
      if (socket.rooms.has(String(roomId))) socket.to(String(roomId)).emit('typing', { roomId, username });
    });
  });
}
