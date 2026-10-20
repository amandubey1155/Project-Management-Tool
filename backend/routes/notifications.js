import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get notifications for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*, u.name as sender_name, u.avatar_color as sender_avatar_color
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(req.user.id).count;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark single notification as read
router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
    stmt.run(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
});

// Helper function to create a notification (exported for use in tasks/comments routes)
export function createNotification({ userId, senderId, type, title, message, link, io }) {
  try {
    if (userId === senderId) return; // Don't notify oneself

    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, sender_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(userId, senderId, type, title, message, link);
    const notifId = Number(res.lastInsertRowid);

    const fullNotif = db.prepare(`
      SELECT n.*, u.name as sender_name, u.avatar_color as sender_avatar_color
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.id = ?
    `).get(notifId);

    // Emit live WebSocket event if user is connected
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', fullNotif);
    }

    return fullNotif;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export default router;
