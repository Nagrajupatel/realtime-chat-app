import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import messageRoutes from './routes/messages.js';
import fileRoutes from './routes/files.js';
import { initSocket } from './socket/index.js';

const app = express();
const server = http.createServer(app);
const origin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', messageRoutes);
app.use('/api', fileRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const io = new Server(server, { cors: { origin } });
app.set('io', io);
initSocket(io);

await connectDB();
const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server running on port ${port}`));
