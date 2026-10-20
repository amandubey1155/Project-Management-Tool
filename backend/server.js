import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Attach io instance to express app so routes can broadcast events
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
initDatabase();

// Setup WebSockets
setupSocketHandlers(io);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', columnRoutes);
app.use('/api', taskRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 5100;
server.listen(PORT, () => {
  console.log(`🚀 Project Management Backend running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server active`);
});
