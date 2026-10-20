import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createNotification } from './notifications.js';
import { logActivity } from './tasks.js';

const router = express.Router({ mergeParams: true });

// Get comments for a task
router.get('/tasks/:taskId/comments', authenticateToken, (req, res) => {
  try {
    const { taskId } = req.params;

    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color as user_avatar_color
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(taskId);

    res.json({ comments });
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// Post a new comment
router.post('/tasks/:taskId/comments', authenticateToken, (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const task = db.prepare('SELECT project_id, title, created_by FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO task_comments (task_id, user_id, content)
      VALUES (?, ?, ?)
    `);

    const result = insertStmt.run(taskId, req.user.id, content.trim());
    const commentId = Number(result.lastInsertRowid);

    // Log activity
    logActivity(taskId, req.user.id, 'commented on the task');

    const comment = db.prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color as user_avatar_color
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    const io = req.app.get('io');
    const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(task.project_id);

    // Notify assignees and task creator (except the author)
    const assignees = db.prepare(`
      SELECT user_id FROM task_assignees WHERE task_id = ? AND user_id != ?
    `).all(taskId, req.user.id);

    const notifiedUserIds = new Set(assignees.map(a => a.user_id));
    if (task.created_by !== req.user.id) {
      notifiedUserIds.add(task.created_by);
    }

    // Check for @mentions in comment (e.g., @Alex, @sarah)
    const mentionMatches = content.match(/@(\w+)/g);
    if (mentionMatches) {
      const mentionedNames = mentionMatches.map(m => m.slice(1).toLowerCase());
      for (const name of mentionedNames) {
        const mentionedUser = db.prepare('SELECT id FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ?').get(`%${name}%`, `%${name}%`);
        if (mentionedUser && mentionedUser.id !== req.user.id) {
          notifiedUserIds.add(mentionedUser.id);
        }
      }
    }

    for (const targetUid of notifiedUserIds) {
      createNotification({
        userId: targetUid,
        senderId: req.user.id,
        type: 'comment',
        title: 'New Comment',
        message: `${req.user.name} commented on "${task.title}": "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
        link: `/projects/${task.project_id}?task=${taskId}`,
        io
      });
    }

    // Real-time broadcast to project room
    if (io) {
      io.to(`project:${task.project_id}`).emit('comment:created', {
        taskId: Number(taskId),
        projectId: task.project_id,
        comment
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// Delete comment
router.delete('/comments/:id', authenticateToken, (req, res) => {
  try {
    const commentId = req.params.id;

    const comment = db.prepare(`
      SELECT c.*, t.project_id, pm.role as project_role
      FROM task_comments c
      JOIN tasks t ON c.task_id = t.id
      LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
      WHERE c.id = ?
    `).get(req.user.id, commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Can delete if comment owner or project admin/owner
    const isAuthor = comment.user_id === req.user.id;
    const isProjectAdmin = comment.project_role === 'owner' || comment.project_role === 'admin';

    if (!isAuthor && !isProjectAdmin) {
      return res.status(403).json({ error: 'Permission denied to delete this comment.' });
    }

    db.prepare('DELETE FROM task_comments WHERE id = ?').run(commentId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${comment.project_id}`).emit('comment:deleted', {
        commentId: Number(commentId),
        taskId: comment.task_id,
        projectId: comment.project_id
      });
    }

    res.json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

export default router;
