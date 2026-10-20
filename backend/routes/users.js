import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Search users by query (name or email)
router.get('/search', authenticateToken, (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    if (!q) {
      const users = db.prepare('SELECT id, name, email, avatar_color, bio FROM users LIMIT 20').all();
      return res.json({ users });
    }

    const queryStr = `%${q}%`;
    const users = db.prepare(`
      SELECT id, name, email, avatar_color, bio 
      FROM users 
      WHERE name LIKE ? OR email LIKE ?
      LIMIT 20
    `).all(queryStr, queryStr);

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users.' });
  }
});

// Get user profile by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, avatar_color, bio, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
