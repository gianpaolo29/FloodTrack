require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
app.use(express.json());

const server = http.createServer(app);

const LARAVEL_API_URL = (process.env.LARAVEL_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '');
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'change-me-in-production';
const PORT = process.env.PORT ?? 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? '*';

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('NO_TOKEN'));
  try {
    const { data } = await axios.get(`${LARAVEL_API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 5000,
    });
    socket.user = data;
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
});

io.on('connection', (socket) => {
  const { id: userId, name, role } = socket.user ?? {};
  console.log(`[+] uid=${userId} name="${name}"`);

  socket.join(`user:${userId}`);

  socket.on('join-report', (reportId) => socket.join(`report:${reportId}`));
  socket.on('leave-report', (reportId) => socket.leave(`report:${reportId}`));
  socket.on('typing', (reportId) => {
    socket.to(`report:${reportId}`).emit('typing-update', { id: userId, name, role });
  });
  socket.on('disconnect', (reason) => console.log(`[-] uid=${userId} ${reason}`));
});

app.post('/internal/emit', (req, res) => {
  if (req.headers['x-internal-secret'] !== INTERNAL_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });

  const { room, event, data } = req.body;
  if (!room || !event) return res.status(400).json({ error: 'room and event required' });

  io.to(room).emit(event, data ?? null);
  return res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', connections: io.engine.clientsCount }));

server.listen(PORT, () => console.log(`Socket server on port ${PORT} | Laravel: ${LARAVEL_API_URL}`));
