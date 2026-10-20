# PulseFlow — Collaborative Project Management Tool
> Built with React, Tailwind CSS, Node.js, Express, native SQLite, and WebSockets (Socket.IO).

PulseFlow is a collaborative project management web application inspired by Trello and Asana. It provides real-time boards, task cards, multi-user assignment, nested subtask checklists, interactive task discussions with activity logs, and real-time notifications via WebSockets.

---

## ✨ Features

### 1. Collaborative Group Projects
- **Create & Manage Projects**: Set title, description, custom theme color, and icons.
- **Privacy Controls**: Set projects to public workspace or private.
- **Role-based Permissions**:
  - `Owner`: Full administrative privileges, project settings, member management, and project deletion.
  - `Admin`: Can add/remove members and manage columns and tasks.
  - `Member`: Can create, edit, move, assign, and comment on tasks.
  - `Viewer`: Read-only view for tracking progress.
- **Member Management**: Invite workspace collaborators by name or email with instant autocomplete.

### 2. Project Boards & Task Views (Kanban, List, Analytics)
- **Kanban Board View**:
  - Customizable columns (e.g. "To Do", "In Progress", "In Review", "Done").
  - Drag-and-drop task movement between columns and reordering.
  - Quick column creation, renaming, and custom column colors.
  - Double-click to rename column headers inline.
- **List / Table View**:
  - Asana-style grouped table view with collapsible column sections.
  - High-density view showing Priority badges, Due dates, Subtasks, Comments count, and Assignees.
- **Project Analytics & Overview**:
  - Overall completion rate percentage.
  - Tasks by status distribution bars.
  - Priority breakdown cards.
  - Team member workload allocation metrics.

### 3. Task Cards & Rich Task Details
- **Inline Editing**: Real-time editable task titles and descriptions.
- **Priority System**: `Urgent` (Red), `High` (Orange), `Medium` (Blue), and `Low` (Green) with badges.
- **Due Dates & Overdue Warnings**: Date picker with automatic overdue detection and badge indicators.
- **Multi-Assignee Management**: Assign multiple team members to a task with avatar pills.
- **Custom Labels & Tags**: Create custom tags with custom color palettes.
- **Subtasks & Checklist**:
  - Interactive checkboxes with visual progress bar and percentage completion.
  - Confetti celebration upon completing all subtasks or moving a task to "Done"!

### 4. Communication & Discussions
- **Task Comment Stream**: Dedicated discussion thread per task.
- **Real-Time Comment Broadcasting**: Comments appear instantly across all connected browsers without page reloads.
- **Typing Indicators**: Shows who is currently typing a comment in real-time.
- **@Mentions**: Tag team members (e.g., `@alex`, `@sarah`) to trigger targeted notifications.
- **Audit Activity Trail**: History of task actions (who created the task, changed status, moved columns, etc.).

### 5. WebSockets & Real-Time Sync (Bonus)
- **Live Board Updates**: Card creations, updates, moves, and deletions propagate immediately to all active board viewers via Socket.IO.
- **Active User Presence**: Real-time presence bar at the top of each project board showing avatars of collaborators actively viewing the board right now.
- **Live In-App Notification Center**:
  - Animated notification bell with unread count badge.
  - Floating toast banners when assigned to a task or receiving a comment.
  - "Mark all as read" and direct one-click navigation to tasks.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (Node 22/24 recommended with built-in `node:sqlite`).
- **npm**: v9+

### 1. Start Backend & Seed Demo Data
In the project root directory:

```bash
# Navigate to backend
cd backend

# Install dependencies (Express, Socket.IO, JWT, bcryptjs)
npm install

# Seed demo users, projects, tasks, and comments
npm run seed

# Start backend server (runs on http://localhost:5000)
npm run dev
```

### 2. Start Frontend
In a separate terminal window:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

Open **`http://localhost:5173`** in your browser!

---

## 👥 Pre-Seeded Demo Accounts (1-Click Login)

The login screen includes **1-click login buttons** so you can test multi-user collaboration in two separate browser tabs or windows:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | `alex@example.com` | `password123` | Product Lead & Scrum Master |
| **Sarah Chen** | `sarah@example.com` | `password123` | Senior Frontend Engineer |
| **David Miller** | `david@example.com` | `password123` | Backend Architect |
| **Elena Rostova** | `elena@example.com` | `password123` | Product Designer |
| **Marcus Vance** | `marcus@example.com` | `password123` | DevOps Engineer |

> **Pro Tip**: Open two browser tabs (or an Incognito window). Log in as **Alex** in one tab and **Sarah** in another. Move a card or post a comment in Tab 1, and watch Tab 2 update instantly with live toasts and presence indicators!

---

## 🛠️ Tech Stack & Architecture

- **Frontend**:
  - React 19 + Vite 8
  - Tailwind CSS v4
  - Lucide React (Icons)
  - Socket.IO Client (Real-time WebSockets)
  - Canvas Confetti (Celebratory feedback)
  - Date-fns (Date manipulation & relative time)
  - React Router DOM v7
- **Backend**:
  - Node.js v24
  - Express.js (REST API)
  - Socket.IO (WebSockets room-based events & presence)
  - Native Node `node:sqlite` (`DatabaseSync` - zero native compile dependencies, zero configuration)
  - JSON Web Tokens (JWT) for authentication
  - Bcryptjs for secure password hashing
