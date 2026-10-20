import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createNotification } from './notifications.js';

const router = express.Router({ mergeParams: true });

// Helper to get fully hydrated task
export function getFullTask(taskId) {
  const task = db.prepare(`
    SELECT t.*, 
           u.name as creator_name, u.avatar_color as creator_avatar_color,
           c.title as column_title, c.color as column_color
    FROM tasks t
    JOIN users u ON t.created_by = u.id
    JOIN columns c ON t.column_id = c.id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) return null;

  // Get assignees
  const assignees = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, ta.assigned_at
    FROM task_assignees ta
    JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ?
  `).all(taskId);

  // Get labels
  const labels = db.prepare(`
    SELECT id, name, color FROM task_labels WHERE task_id = ?
  `).all(taskId);

  // Get subtasks
  const subtasks = db.prepare(`
    SELECT id, title, completed, position, created_at 
    FROM task_subtasks 
    WHERE task_id = ? 
    ORDER BY position ASC, id ASC
  `).all(taskId);

  // Get comments count
  const commentCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM task_comments WHERE task_id = ?
  `).get(taskId);

  return {
    ...task,
    assignees,
    labels,
    subtasks,
    comment_count: commentCountRow ? commentCountRow.count : 0
  };
}

// Log task activity helper
export function logActivity(taskId, userId, action, details = null) {
  try {
    db.prepare(`
      INSERT INTO task_activities (task_id, user_id, action, details)
      VALUES (?, ?, ?, ?)
    `).run(taskId, userId, action, details);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Get all tasks for a project
router.get('/projects/:projectId/tasks', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;

    const taskRows = db.prepare(`
      SELECT t.*, 
             u.name as creator_name, u.avatar_color as creator_avatar_color,
             c.title as column_title, c.color as column_color
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      JOIN columns c ON t.column_id = c.id
      WHERE t.project_id = ?
      ORDER BY t.position ASC, t.id ASC
    `).all(projectId);

    // Hydrate each task with assignees, labels, and subtasks
    const tasks = taskRows.map(task => {
      const assignees = db.prepare(`
        SELECT u.id, u.name, u.email, u.avatar_color
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ?
      `).all(task.id);

      const labels = db.prepare(`
        SELECT id, name, color FROM task_labels WHERE task_id = ?
      `).all(task.id);

      const subtasks = db.prepare(`
        SELECT id, title, completed, position FROM task_subtasks WHERE task_id = ? ORDER BY position ASC
      `).all(task.id);

      const commentCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM task_comments WHERE task_id = ?
      `).get(task.id);

      return {
        ...task,
        assignees,
        labels,
        subtasks,
        comment_count: commentCountRow ? commentCountRow.count : 0
      };
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// Create a new task
router.post('/projects/:projectId/tasks', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const { column_id, title, description, priority, due_date, assignee_ids, labels } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    if (!column_id) {
      return res.status(400).json({ error: 'Column is required.' });
    }

    // Determine position within column
    const maxPosRow = db.prepare('SELECT MAX(position) as maxPos FROM tasks WHERE column_id = ?').get(column_id);
    const position = (maxPosRow.maxPos !== null && maxPosRow.maxPos !== undefined) ? maxPosRow.maxPos + 1 : 0;

    const insertTask = db.prepare(`
      INSERT INTO tasks (project_id, column_id, title, description, priority, due_date, position, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertTask.run(
      projectId,
      column_id,
      title.trim(),
      description ? description.trim() : '',
      priority || 'medium',
      due_date || null,
      position,
      req.user.id
    );

    const taskId = Number(result.lastInsertRowid);

    // Add assignees if provided
    const io = req.app.get('io');
    const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(projectId);

    if (Array.isArray(assignee_ids)) {
      const assignStmt = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
      for (const uid of assignee_ids) {
        assignStmt.run(taskId, uid);
        createNotification({
          userId: uid,
          senderId: req.user.id,
          type: 'assigned',
          title: 'Task Assigned',
          message: `${req.user.name} assigned you to task "${title.trim()}" in ${project.title}`,
          link: `/projects/${projectId}?task=${taskId}`,
          io
        });
      }
    }

    // Add labels if provided
    if (Array.isArray(labels)) {
      const labelStmt = db.prepare('INSERT INTO task_labels (task_id, name, color) VALUES (?, ?, ?)');
      for (const lbl of labels) {
        labelStmt.run(taskId, lbl.name.trim(), lbl.color || '#6366f1');
      }
    }

    // Log creation activity
    logActivity(taskId, req.user.id, 'created the task');

    const fullTask = getFullTask(taskId);

    if (io) {
      io.to(`project:${projectId}`).emit('task:created', fullTask);
    }

    res.status(201).json({ task: fullTask });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// Get single task details
router.get('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const task = getFullTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Get activities
    const activities = db.prepare(`
      SELECT a.*, u.name as user_name, u.avatar_color as user_avatar_color
      FROM task_activities a
      JOIN users u ON a.user_id = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all(req.params.id);

    // Get comments
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_color as user_avatar_color
      FROM task_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);

    res.json({
      task,
      activities,
      comments
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task details.' });
  }
});

// Update task
router.put('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, due_date, column_id } = req.body;

    const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const stmt = db.prepare(`
      UPDATE tasks
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          priority = COALESCE(?, priority),
          due_date = COALESCE(?, due_date),
          column_id = COALESCE(?, column_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      title ? title.trim() : null,
      description !== undefined ? description.trim() : null,
      priority || null,
      due_date !== undefined ? due_date : null,
      column_id || null,
      taskId
    );

    // Log changes
    if (priority && priority !== existingTask.priority) {
      logActivity(taskId, req.user.id, `changed priority to ${priority}`);
    }
    if (title && title !== existingTask.title) {
      logActivity(taskId, req.user.id, `renamed task to "${title}"`);
    }

    const fullTask = getFullTask(taskId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${existingTask.project_id}`).emit('task:updated', fullTask);
    }

    res.json({ task: fullTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Move task (Drag and Drop / Column changing & reordering)
router.put('/tasks/:id/move', authenticateToken, (req, res) => {
  try {
    const taskId = req.params.id;
    const { target_column_id, new_position } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const oldColumnId = task.column_id;
    const newColumnId = target_column_id || oldColumnId;
    const newPos = (new_position !== undefined) ? Number(new_position) : task.position;

    // If moved between columns, record activity
    if (oldColumnId !== newColumnId) {
      const oldCol = db.prepare('SELECT title FROM columns WHERE id = ?').get(oldColumnId);
      const newCol = db.prepare('SELECT title FROM columns WHERE id = ?').get(newColumnId);
      logActivity(taskId, req.user.id, `moved task from "${oldCol ? oldCol.title : 'old'}" to "${newCol ? newCol.title : 'new'}"`);
    }

    // Update target column's positions
    db.prepare(`
      UPDATE tasks 
      SET position = position + 1 
      WHERE column_id = ? AND position >= ? AND id != ?
    `).run(newColumnId, newPos, taskId);

    // Update task column and position
    db.prepare(`
      UPDATE tasks
      SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newColumnId, newPos, taskId);

    const fullTask = getFullTask(taskId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:moved', {
        taskId: Number(taskId),
        projectId: task.project_id,
        sourceColumnId: oldColumnId,
        targetColumnId: newColumnId,
        newPosition: newPos,
        task: fullTask
      });
    }

    res.json({ task: fullTask });
  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({ error: 'Failed to move task.' });
  }
});

// Delete task
router.delete('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const taskId = req.params.id;
    const task = db.prepare('SELECT project_id, column_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:deleted', {
        taskId: Number(taskId),
        projectId: task.project_id,
        columnId: task.column_id
      });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// Assign user to task
router.post('/tasks/:id/assignees', authenticateToken, (req, res) => {
  try {
    const taskId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const task = db.prepare('SELECT project_id, title FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(taskId, userId);

    const assignedUser = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    logActivity(taskId, req.user.id, `assigned ${assignedUser ? assignedUser.name : 'user'}`);

    const io = req.app.get('io');
    const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(task.project_id);

    createNotification({
      userId,
      senderId: req.user.id,
      type: 'assigned',
      title: 'Task Assigned',
      message: `${req.user.name} assigned you to "${task.title}" in ${project.title}`,
      link: `/projects/${task.project_id}?task=${taskId}`,
      io
    });

    const fullTask = getFullTask(taskId);

    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.json({ task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign user.' });
  }
});

// Remove user from task
router.delete('/tasks/:id/assignees/:userId', authenticateToken, (req, res) => {
  try {
    const { id: taskId, userId } = req.params;

    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const unassignedUser = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
    db.prepare('DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?').run(taskId, userId);

    logActivity(taskId, req.user.id, `unassigned ${unassignedUser ? unassignedUser.name : 'user'}`);

    const fullTask = getFullTask(taskId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.json({ task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove assignee.' });
  }
});

// Add subtask
router.post('/tasks/:id/subtasks', authenticateToken, (req, res) => {
  try {
    const taskId = req.params.id;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Subtask title is required.' });
    }

    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const maxPos = db.prepare('SELECT MAX(position) as m FROM task_subtasks WHERE task_id = ?').get(taskId).m || 0;

    const result = db.prepare(`
      INSERT INTO task_subtasks (task_id, title, completed, position)
      VALUES (?, ?, 0, ?)
    `).run(taskId, title.trim(), maxPos + 1);

    const fullTask = getFullTask(taskId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.status(201).json({ subtaskId: Number(result.lastInsertRowid), task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add subtask.' });
  }
});

// Toggle or update subtask
router.put('/tasks/subtasks/:subtaskId', authenticateToken, (req, res) => {
  try {
    const { subtaskId } = req.params;
    const { completed, title } = req.body;

    const subtask = db.prepare('SELECT * FROM task_subtasks WHERE id = ?').get(subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found.' });
    }

    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(subtask.task_id);

    db.prepare(`
      UPDATE task_subtasks
      SET completed = COALESCE(?, completed),
          title = COALESCE(?, title)
      WHERE id = ?
    `).run(completed !== undefined ? (completed ? 1 : 0) : null, title ? title.trim() : null, subtaskId);

    const fullTask = getFullTask(subtask.task_id);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.json({ task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subtask.' });
  }
});

// Delete subtask
router.delete('/tasks/subtasks/:subtaskId', authenticateToken, (req, res) => {
  try {
    const { subtaskId } = req.params;
    const subtask = db.prepare('SELECT task_id FROM task_subtasks WHERE id = ?').get(subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found.' });
    }

    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(subtask.task_id);

    db.prepare('DELETE FROM task_subtasks WHERE id = ?').run(subtaskId);

    const fullTask = getFullTask(subtask.task_id);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.json({ task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subtask.' });
  }
});

// Add label
router.post('/tasks/:id/labels', authenticateToken, (req, res) => {
  try {
    const taskId = req.params.id;
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Label name is required.' });
    }

    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    db.prepare('INSERT INTO task_labels (task_id, name, color) VALUES (?, ?, ?)').run(
      taskId,
      name.trim(),
      color || '#6366f1'
    );

    const fullTask = getFullTask(taskId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.status(201).json({ task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add label.' });
  }
});

// Remove label
router.delete('/tasks/labels/:labelId', authenticateToken, (req, res) => {
  try {
    const { labelId } = req.params;
    const label = db.prepare('SELECT task_id FROM task_labels WHERE id = ?').get(labelId);
    if (!label) {
      return res.status(404).json({ error: 'Label not found.' });
    }

    const task = db.prepare('SELECT project_id FROM tasks WHERE id = ?').get(label.task_id);

    db.prepare('DELETE FROM task_labels WHERE id = ?').run(labelId);

    const fullTask = getFullTask(label.task_id);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.project_id}`).emit('task:updated', fullTask);
    }

    res.json({ task: fullTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete label.' });
  }
});

export default router;
