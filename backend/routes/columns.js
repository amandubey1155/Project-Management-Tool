import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Create a new column in project
router.post('/projects/:projectId/columns', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, color } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Column title is required.' });
    }

    // Get max position
    const maxPosRow = db.prepare('SELECT MAX(position) as maxPos FROM columns WHERE project_id = ?').get(projectId);
    const position = (maxPosRow.maxPos !== null && maxPosRow.maxPos !== undefined) ? maxPosRow.maxPos + 1 : 0;

    const stmt = db.prepare(`
      INSERT INTO columns (project_id, title, color, position)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(projectId, title.trim(), color || '#64748b', position);
    const newColId = Number(result.lastInsertRowid);

    const newColumn = db.prepare('SELECT * FROM columns WHERE id = ?').get(newColId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('column:created', newColumn);
    }

    res.status(201).json({ column: newColumn });
  } catch (error) {
    console.error('Create column error:', error);
    res.status(500).json({ error: 'Failed to create column.' });
  }
});

// Update a column
router.put('/columns/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { title, color } = req.body;

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const stmt = db.prepare(`
      UPDATE columns
      SET title = COALESCE(?, title),
          color = COALESCE(?, color)
      WHERE id = ?
    `);

    stmt.run(title ? title.trim() : null, color || null, id);

    const updated = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${column.project_id}`).emit('column:updated', updated);
    }

    res.json({ column: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update column.' });
  }
});

// Delete a column (and its tasks)
router.delete('/columns/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    db.prepare('DELETE FROM columns WHERE id = ?').run(id);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${column.project_id}`).emit('column:deleted', { columnId: Number(id), projectId: column.project_id });
    }

    res.json({ message: 'Column deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete column.' });
  }
});

// Reorder columns
router.put('/projects/:projectId/columns/reorder', authenticateToken, (req, res) => {
  try {
    const { projectId } = req.params;
    const { columnIds } = req.body; // array of column IDs in new order

    if (!Array.isArray(columnIds)) {
      return res.status(400).json({ error: 'columnIds must be an array.' });
    }

    const updateStmt = db.prepare('UPDATE columns SET position = ? WHERE id = ? AND project_id = ?');
    columnIds.forEach((colId, index) => {
      updateStmt.run(index, colId, projectId);
    });

    const columns = db.prepare('SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC').all(projectId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('columns:reordered', { projectId: Number(projectId), columns });
    }

    res.json({ columns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder columns.' });
  }
});

export default router;
