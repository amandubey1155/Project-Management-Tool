import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register new user
router.post('/register', (req, res) => {
  try {
    const { name, email, password, avatar_color } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const chosenColor = avatar_color || '#4f46e5';

    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, avatar_color, bio)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(name.trim(), email.toLowerCase().trim(), passwordHash, chosenColor, 'Collaborator');
    const newUserId = Number(result.lastInsertRowid);

    const token = jwt.sign({ id: newUserId, email: email.toLowerCase().trim() }, JWT_SECRET, {
      expiresIn: '7d'
    });

    const user = {
      id: newUserId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      avatar_color: chosenColor,
      bio: 'Collaborator'
    };

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error while registering user.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d'
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_color: user.avatar_color,
      bio: user.bio
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, avatar_color, bio } = req.body;

    const stmt = db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          avatar_color = COALESCE(?, avatar_color),
          bio = COALESCE(?, bio)
      WHERE id = ?
    `);

    stmt.run(name || null, avatar_color || null, bio !== undefined ? bio : null, req.user.id);

    const updated = db.prepare('SELECT id, name, email, avatar_color, bio FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Get list of demo users for easy 1-click test login
router.get('/demo-users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, avatar_color, bio FROM users LIMIT 6').all();
    res.json({ demoUsers: users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch demo users.' });
  }
});

// 1-click demo login without typing password
router.post('/demo-login', (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id, name, email, avatar_color, bio FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'Demo user not found.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      message: 'Demo login successful',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ error: 'Demo login failed.' });
  }
});

export default router;
