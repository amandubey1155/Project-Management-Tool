import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';

export function runSeed() {
  console.log('🌱 Seeding database with demo users, projects, and tasks...');
  initDatabase();

  // Clear existing data in reverse order of foreign keys
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM task_activities;
    DELETE FROM task_comments;
    DELETE FROM task_subtasks;
    DELETE FROM task_labels;
    DELETE FROM task_assignees;
    DELETE FROM tasks;
    DELETE FROM columns;
    DELETE FROM project_members;
    DELETE FROM projects;
    DELETE FROM users;
  `);

  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, avatar_color, bio)
    VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    { name: 'Alex Rivera', email: 'alex@example.com', color: '#6366f1', bio: 'Product Lead & Scrum Master' },
    { name: 'Sarah Chen', email: 'sarah@example.com', color: '#ec4899', bio: 'Senior Frontend Engineer' },
    { name: 'David Miller', email: 'david@example.com', color: '#10b981', bio: 'Backend Architect & Cloud Specialist' },
    { name: 'Elena Rostova', email: 'elena@example.com', color: '#f59e0b', bio: 'Product Designer & UX Researcher' },
    { name: 'Marcus Vance', email: 'marcus@example.com', color: '#8b5cf6', bio: 'DevOps & Site Reliability Engineer' }
  ];

  const userIds = {};
  for (const u of users) {
    const res = insertUser.run(u.name, u.email, passwordHash, u.color, u.bio);
    userIds[u.email] = Number(res.lastInsertRowid);
  }

  // 2. Seed Project 1: Mobile App 2.0 Redesign
  const insertProject = db.prepare(`
    INSERT INTO projects (title, description, owner_id, icon, color, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const p1Res = insertProject.run(
    'Mobile App 2.0 Redesign',
    'Revamping the mobile experience with real-time sync, unified design system, and improved performance.',
    userIds['alex@example.com'],
    'smartphone',
    '#6366f1',
    1
  );
  const p1Id = Number(p1Res.lastInsertRowid);

  // Add members to Project 1
  const insertMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
  `);
  insertMember.run(p1Id, userIds['alex@example.com'], 'owner');
  insertMember.run(p1Id, userIds['sarah@example.com'], 'admin');
  insertMember.run(p1Id, userIds['david@example.com'], 'member');
  insertMember.run(p1Id, userIds['elena@example.com'], 'member');

  // Add Columns to Project 1
  const insertCol = db.prepare(`
    INSERT INTO columns (project_id, title, color, position)
    VALUES (?, ?, ?, ?)
  `);
  const colTodo = Number(insertCol.run(p1Id, 'To Do', '#64748b', 0).lastInsertRowid);
  const colProgress = Number(insertCol.run(p1Id, 'In Progress', '#3b82f6', 1).lastInsertRowid);
  const colReview = Number(insertCol.run(p1Id, 'In Review', '#f59e0b', 2).lastInsertRowid);
  const colDone = Number(insertCol.run(p1Id, 'Done', '#10b981', 3).lastInsertRowid);

  // Helper to insert task
  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, column_id, title, description, priority, due_date, position, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssignee = db.prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)');
  const insertLabel = db.prepare('INSERT INTO task_labels (task_id, name, color) VALUES (?, ?, ?)');
  const insertSubtask = db.prepare('INSERT INTO task_subtasks (task_id, title, completed, position) VALUES (?, ?, ?, ?)');
  const insertComment = db.prepare('INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)');
  const insertActivity = db.prepare('INSERT INTO task_activities (task_id, user_id, action, details) VALUES (?, ?, ?, ?)');

  // Task 1: In Progress
  const t1 = Number(insertTask.run(
    p1Id,
    colProgress,
    'Design interactive onboarding walkthrough',
    'Create intuitive step-by-step onboarding cards highlighting key workspace features and gesture controls.',
    'high',
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    0,
    userIds['alex@example.com']
  ).lastInsertRowid);

  insertAssignee.run(t1, userIds['elena@example.com']);
  insertAssignee.run(t1, userIds['sarah@example.com']);
  insertLabel.run(t1, 'Design', '#ec4899');
  insertLabel.run(t1, 'UI/UX', '#f59e0b');
  insertSubtask.run(t1, 'Figma wireframes for slide animations', 1, 0);
  insertSubtask.run(t1, 'User testing with 5 participants', 1, 1);
  insertSubtask.run(t1, 'Export high-res SVG vectors', 0, 2);
  insertComment.run(t1, userIds['alex@example.com'], 'Elena, can we ensure the micro-interactions feel as smooth as Linear or Apple apps?');
  insertComment.run(t1, userIds['elena@example.com'], '@alex absolutely! Using spring physics and subtle haptic cues.');
  insertActivity.run(t1, userIds['alex@example.com'], 'created the task', null);
  insertActivity.run(t1, userIds['alex@example.com'], 'assigned Elena Rostova', null);

  // Task 2: In Progress
  const t2 = Number(insertTask.run(
    p1Id,
    colProgress,
    'Implement WebSocket real-time event sync',
    'Broadcast board state changes, live typing indicators, and user presence dynamically.',
    'urgent',
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    1,
    userIds['alex@example.com']
  ).lastInsertRowid);

  insertAssignee.run(t2, userIds['david@example.com']);
  insertLabel.run(t2, 'Backend', '#3b82f6');
  insertLabel.run(t2, 'Real-time', '#8b5cf6');
  insertSubtask.run(t2, 'Set up Socket.IO rooms per project', 1, 0);
  insertSubtask.run(t2, 'Handle presence tracking for active users', 1, 1);
  insertSubtask.run(t2, 'In-app notification badge triggers', 0, 2);
  insertComment.run(t2, userIds['david@example.com'], 'Rooms are working cleanly with zero lag on local network tests.');
  insertActivity.run(t2, userIds['alex@example.com'], 'created the task', null);

  // Task 3: In Review
  const t3 = Number(insertTask.run(
    p1Id,
    colReview,
    'Multi-role permission controls & security audit',
    'Ensure project members only have access to actions permitted by their role (Owner, Admin, Member, Viewer).',
    'high',
    new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    0,
    userIds['david@example.com']
  ).lastInsertRowid);

  insertAssignee.run(t3, userIds['david@example.com']);
  insertAssignee.run(t3, userIds['alex@example.com']);
  insertLabel.run(t3, 'Security', '#ef4444');
  insertSubtask.run(t3, 'Validate token expiration and refresh', 1, 0);
  insertSubtask.run(t3, 'Unit tests for column delete permissions', 1, 1);
  insertComment.run(t3, userIds['david@example.com'], 'PR is ready for review @alex.');
  insertActivity.run(t3, userIds['david@example.com'], 'moved task from "In Progress" to "In Review"', null);

  // Task 4: To Do
  const t4 = Number(insertTask.run(
    p1Id,
    colTodo,
    'Add drag-and-drop reordering for columns & cards',
    'Allow users to seamlessly drag cards across lists with visual insertion indicators.',
    'medium',
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    0,
    userIds['sarah@example.com']
  ).lastInsertRowid);

  insertAssignee.run(t4, userIds['sarah@example.com']);
  insertLabel.run(t4, 'Frontend', '#10b981');
  insertSubtask.run(t4, 'Touch event polyfill for mobile devices', 0, 0);
  insertSubtask.run(t4, 'Keyboard accessibility support (arrow keys)', 0, 1);
  insertActivity.run(t4, userIds['sarah@example.com'], 'created the task', null);

  // Task 5: Done
  const t5 = Number(insertTask.run(
    p1Id,
    colDone,
    'Dark mode theme & high-contrast slate design',
    'Built deep slate aesthetic with clean border contrast, custom scrollbars, and accessible tags.',
    'low',
    new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    0,
    userIds['sarah@example.com']
  ).lastInsertRowid);

  insertAssignee.run(t5, userIds['sarah@example.com']);
  insertAssignee.run(t5, userIds['elena@example.com']);
  insertLabel.run(t5, 'UI/UX', '#f59e0b');
  insertSubtask.run(t5, 'CSS variables palette', 1, 0);
  insertSubtask.run(t5, 'Contrast ratio verification (WCAG AA)', 1, 1);
  insertActivity.run(t5, userIds['sarah@example.com'], 'moved task to "Done"', null);

  // 3. Seed Project 2: Cloud Infrastructure Migration
  const p2Res = insertProject.run(
    'Cloud Infrastructure Migration',
    'Migrating microservices from legacy VM hosting to automated Docker & Kubernetes clusters.',
    userIds['david@example.com'],
    'server',
    '#0ea5e9',
    0
  );
  const p2Id = Number(p2Res.lastInsertRowid);

  insertMember.run(p2Id, userIds['david@example.com'], 'owner');
  insertMember.run(p2Id, userIds['marcus@example.com'], 'admin');
  insertMember.run(p2Id, userIds['alex@example.com'], 'member');

  const p2Todo = Number(insertCol.run(p2Id, 'Backlog', '#64748b', 0).lastInsertRowid);
  const p2Progress = Number(insertCol.run(p2Id, 'Active Sprint', '#3b82f6', 1).lastInsertRowid);
  const p2Done = Number(insertCol.run(p2Id, 'Shipped', '#10b981', 2).lastInsertRowid);

  const t6 = Number(insertTask.run(
    p2Id,
    p2Progress,
    'Database connection pooling & backup replication',
    'Automate daily SQLite snapshots and offsite replication with point-in-time recovery.',
    'urgent',
    new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    0,
    userIds['david@example.com']
  ).lastInsertRowid);

  insertAssignee.run(t6, userIds['marcus@example.com']);
  insertAssignee.run(t6, userIds['david@example.com']);
  insertLabel.run(t6, 'Database', '#0ea5e9');

  // Seed sample notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, sender_id, type, title, message, link, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    userIds['alex@example.com'],
    userIds['david@example.com'],
    'comment',
    'New Comment',
    'David Miller commented on "Multi-role permission controls & security audit": "PR is ready for review @alex."',
    `/projects/${p1Id}?task=${t3}`,
    0
  );

  insertNotif.run(
    userIds['alex@example.com'],
    userIds['elena@example.com'],
    'comment',
    'New Comment',
    'Elena Rostova replied: "@alex absolutely! Using spring physics and subtle haptic cues."',
    `/projects/${p1Id}?task=${t1}`,
    0
  );

  insertNotif.run(
    userIds['sarah@example.com'],
    userIds['alex@example.com'],
    'assigned',
    'Task Assigned',
    'Alex Rivera assigned you to task "Design interactive onboarding walkthrough"',
    `/projects/${p1Id}?task=${t1}`,
    0
  );

  console.log('✅ Database seeded successfully with demo users, projects, tasks, comments, and notifications!');
}

// If run directly via node seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed();
}
