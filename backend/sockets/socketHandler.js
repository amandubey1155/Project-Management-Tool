import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/authMiddleware.js';
import { db } from '../db.js';

// Map of projectId -> Map(socketId -> userInfo)
const projectPresence = new Map();

export function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Join personal room for notifications
    socket.join(`user:${user.id}`);

    // Join project room and track presence
    socket.on('project:join', ({ projectId }) => {
      const projId = Number(projectId);
      const room = `project:${projId}`;
      socket.join(room);
      socket.currentProjectId = projId;

      if (!projectPresence.has(projId)) {
        projectPresence.set(projId, new Map());
      }
      projectPresence.get(projId).set(socket.id, user);

      // Broadcast updated presence to this project
      const activeUsers = Array.from(projectPresence.get(projId).values());
      // Remove duplicate users who have multiple tabs open
      const uniqueUsers = Array.from(new Map(activeUsers.map(u => [u.id, u])).values());
      io.to(room).emit('presence:update', { projectId: projId, users: uniqueUsers });
    });

    // Leave project room
    socket.on('project:leave', ({ projectId }) => {
      const projId = Number(projectId);
      const room = `project:${projId}`;
      socket.leave(room);

      if (projectPresence.has(projId)) {
        projectPresence.get(projId).delete(socket.id);
        if (projectPresence.get(projId).size === 0) {
          projectPresence.delete(projId);
        } else {
          const activeUsers = Array.from(projectPresence.get(projId).values());
          const uniqueUsers = Array.from(new Map(activeUsers.map(u => [u.id, u])).values());
          io.to(room).emit('presence:update', { projectId: projId, users: uniqueUsers });
        }
      }
      socket.currentProjectId = null;
    });

    // Typing indicator for task comments
    socket.on('task:typing', ({ projectId, taskId, isTyping }) => {
      socket.to(`project:${projectId}`).emit('task:typing_status', {
        taskId,
        user: { id: user.id, name: user.name },
        isTyping
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.currentProjectId && projectPresence.has(socket.currentProjectId)) {
        const projId = socket.currentProjectId;
        projectPresence.get(projId).delete(socket.id);
        if (projectPresence.get(projId).size === 0) {
          projectPresence.delete(projId);
        } else {
          const activeUsers = Array.from(projectPresence.get(projId).values());
          const uniqueUsers = Array.from(new Map(activeUsers.map(u => [u.id, u])).values());
          io.to(`project:${projId}`).emit('presence:update', { projectId: projId, users: uniqueUsers });
        }
      }
    });
  });
}
