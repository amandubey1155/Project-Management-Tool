import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// Get all projects for current user
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Projects where user is a member, owner, or public projects
    const projects = db.prepare(`
      SELECT DISTINCT 
        p.*, 
        u.name as owner_name, 
        u.avatar_color as owner_avatar_color,
        pm.role as current_user_role,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t 
         JOIN columns c ON t.column_id = c.id 
         WHERE t.project_id = p.id AND LOWER(c.title) LIKE '%done%') as completed_task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
      WHERE p.owner_id = ? OR pm.user_id = ? OR p.is_public = 1
      ORDER BY p.updated_at DESC
    `).all(userId, userId, userId);

    res.json({ projects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// Create a new project
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, description, icon, color, is_public } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required.' });
    }

    const insertProject = db.prepare(`
      INSERT INTO projects (title, description, owner_id, icon, color, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertProject.run(
      title.trim(),
      description ? description.trim() : '',
      req.user.id,
      icon || 'folder',
      color || '#4f46e5',
      is_public ? 1 : 0
    );

    const projectId = Number(result.lastInsertRowid);

    // Add owner as 'owner' in project_members
    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (?, ?, 'owner')
    `).run(projectId, req.user.id);

    // Create standard default Kanban columns
    const defaultColumns = [
      { title: 'To Do', color: '#64748b', pos: 0 },
      { title: 'In Progress', color: '#3b82f6', pos: 1 },
      { title: 'In Review', color: '#f59e0b', pos: 2 },
      { title: 'Done', color: '#10b981', pos: 3 }
    ];

    const insertCol = db.prepare(`
      INSERT INTO columns (project_id, title, color, position)
      VALUES (?, ?, ?, ?)
    `);

    for (const col of defaultColumns) {
      insertCol.run(projectId, col.title, col.color, col.pos);
    }

    const createdProject = db.prepare(`
      SELECT p.*, u.name as owner_name, 'owner' as current_user_role
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `).get(projectId);

    res.status(201).json({
      message: 'Project created successfully',
      project: createdProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// Get single project details (including columns and members)
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    const project = db.prepare(`
      SELECT p.*, u.name as owner_name, u.email as owner_email, u.avatar_color as owner_avatar_color,
             pm.role as current_user_role
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
      WHERE p.id = ?
    `).get(userId, projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Check permission
    if (!project.is_public && project.owner_id !== userId && !project.current_user_role) {
      return res.status(403).json({ error: 'You do not have access to this project.' });
    }

    // Get columns
    const columns = db.prepare(`
      SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC, id ASC
    `).all(projectId);

    // Get members
    const members = db.prepare(`
      SELECT pm.id as membership_id, pm.role, pm.joined_at,
             u.id, u.name, u.email, u.avatar_color, u.bio
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY 
        CASE pm.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'member' THEN 3 
          ELSE 4 
        END ASC,
        u.name ASC
    `).all(projectId);

    res.json({
      project,
      columns,
      members
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to load project details.' });
  }
});

// Update project
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, description, icon, color, is_public } = req.body;

    // Check if user is owner or admin
    const member = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id);

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Only project owners and admins can edit project settings.' });
    }

    const updateStmt = db.prepare(`
      UPDATE projects
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color),
          is_public = COALESCE(?, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(
      title ? title.trim() : null,
      description !== undefined ? description.trim() : null,
      icon || null,
      color || null,
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      projectId
    );

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    // Notify project room
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('project:updated', updated);
    }

    res.json({ message: 'Project updated successfully', project: updated });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;

    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the project owner can delete this project.' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('project:deleted', { projectId });
    }

    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// Add member to project
router.post('/:id/members', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;
    const { email, userId, role = 'member' } = req.body;

    // Check user permission
    const currentMember = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id);

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return res.status(403).json({ error: 'Only project owners and admins can invite members.' });
    }

    let targetUser;
    if (userId) {
      targetUser = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(userId);
    } else if (email) {
      targetUser = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email.toLowerCase().trim());
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const existingMember = db.prepare(`
      SELECT id FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, targetUser.id);

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project.' });
    }

    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(projectId, targetUser.id, role);

    const project = db.prepare('SELECT title FROM projects WHERE id = ?').get(projectId);

    // Send real-time notification
    const io = req.app.get('io');
    createNotification({
      userId: targetUser.id,
      senderId: req.user.id,
      type: 'project_invite',
      title: 'Added to Project',
      message: `${req.user.name} added you to project "${project.title}" as ${role}`,
      link: `/projects/${projectId}`,
      io
    });

    const newMemberRecord = {
      role,
      user_id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      avatar_color: targetUser.avatar_color,
      joined_at: new Date().toISOString()
    };

    if (io) {
      io.to(`project:${projectId}`).emit('member:added', {
        projectId,
        member: newMemberRecord
      });
    }

    res.status(201).json({
      message: 'Member added successfully',
      member: newMemberRecord
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});

// Update member role
router.put('/:id/members/:userId', authenticateToken, (req, res) => {
  try {
    const { id: projectId, userId } = req.params;
    const { role } = req.body;

    const currentMember = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id);

    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    if (Number(userId) === req.user.id && role !== 'owner') {
      const ownerCount = db.prepare(`
        SELECT COUNT(*) as count FROM project_members WHERE project_id = ? AND role = 'owner'
      `).get(projectId).count;
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the only owner.' });
      }
    }

    db.prepare(`
      UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?
    `).run(role, projectId, userId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('member:updated', { projectId, userId: Number(userId), role });
    }

    res.json({ message: 'Role updated successfully', role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member role.' });
  }
});

// Remove member
router.delete('/:id/members/:userId', authenticateToken, (req, res) => {
  try {
    const { id: projectId, userId } = req.params;

    const currentMember = db.prepare(`
      SELECT role FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, req.user.id);

    // Allow members to leave themselves, or owners/admins to remove others
    if (Number(userId) !== req.user.id && (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin'))) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    db.prepare(`
      DELETE FROM project_members WHERE project_id = ? AND user_id = ?
    `).run(projectId, userId);

    // Also remove user as assignee from project's tasks
    db.prepare(`
      DELETE FROM task_assignees 
      WHERE user_id = ? AND task_id IN (SELECT id FROM tasks WHERE project_id = ?)
    `).run(userId, projectId);

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('member:removed', { projectId, userId: Number(userId) });
    }

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// Project Analytics & Overview stats
router.get('/:id/analytics', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;

    // Tasks grouped by column
    const columnStats = db.prepare(`
      SELECT c.id, c.title, c.color, COUNT(t.id) as task_count
      FROM columns c
      LEFT JOIN tasks t ON c.id = t.column_id
      WHERE c.project_id = ?
      GROUP BY c.id
      ORDER BY c.position ASC
    `).all(projectId);

    // Priority breakdown
    const priorityStats = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE project_id = ?
      GROUP BY priority
    `).all(projectId);

    // Overdue tasks count
    const overdueCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      WHERE t.project_id = ? 
        AND t.due_date IS NOT NULL 
        AND date(t.due_date) < date('now')
        AND LOWER(c.title) NOT LIKE '%done%'
    `).get(projectId).count;

    // Member workload
    const memberWorkload = db.prepare(`
      SELECT u.id, u.name, u.avatar_color, COUNT(ta.task_id) as assigned_count
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      LEFT JOIN task_assignees ta ON u.id = ta.user_id AND ta.task_id IN (SELECT id FROM tasks WHERE project_id = ?)
      WHERE pm.project_id = ?
      GROUP BY u.id
    `).all(projectId, projectId);

    res.json({
      columnStats,
      priorityStats,
      overdueCount,
      memberWorkload
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

export default router;
