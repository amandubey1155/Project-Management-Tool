import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Folder, 
  Smartphone, 
  Server, 
  Sparkles, 
  Rocket, 
  Globe, 
  Database, 
  Shield,
  Settings, 
  UserPlus, 
  LayoutGrid, 
  List as ListIcon, 
  BarChart3, 
  Search, 
  Filter, 
  ArrowLeft,
  Users
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import BoardView from '../components/BoardView';
import ListView from '../components/ListView';
import AnalyticsView from '../components/AnalyticsView';
import TaskModal from '../components/TaskModal';
import ProjectModal from '../components/ProjectModal';
import MemberManagementModal from '../components/MemberManagementModal';
import PresenceBar from '../components/PresenceBar';
import { getInitials } from '../utils/helpers';

const ICON_MAP = {
  folder: Folder,
  smartphone: Smartphone,
  server: Server,
  sparkles: Sparkles,
  rocket: Rocket,
  globe: Globe,
  database: Database,
  shield: Shield
};

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinProject, leaveProject } = useSocket();

  const [project, setProject] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'board' | 'list' | 'analytics'
  const [viewMode, setViewMode] = useState('board');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Modal states
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Check URL query for direct task open (?task=123)
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam) {
      setSelectedTaskId(Number(taskParam));
    }
  }, [searchParams]);

  // Load project details and tasks
  const fetchProjectData = useCallback(async () => {
    try {
      const [projData, taskData] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`)
      ]);

      setProject(projData.project);
      setColumns(projData.columns || []);
      setMembers(projData.members || []);
      setTasks(taskData.tasks || []);
    } catch (err) {
      console.error('Failed to load project:', err);
      alert(err.message || 'Failed to load project');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Join WebSocket project room & handle real-time sync
  useEffect(() => {
    if (!socket || !projectId) return;

    joinProject(projectId);

    // Task event handlers
    const handleTaskCreated = (newTask) => {
      setTasks((prev) => [...prev.filter((t) => t.id !== newTask.id), newTask]);
    };

    const handleTaskUpdated = (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    };

    const handleTaskMoved = (payload) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === payload.taskId ? payload.task : t))
      );
    };

    const handleTaskDeleted = (payload) => {
      setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
      if (selectedTaskId === payload.taskId) {
        setSelectedTaskId(null);
      }
    };

    // Column event handlers
    const handleColumnCreated = (newCol) => {
      setColumns((prev) => [...prev, newCol]);
    };

    const handleColumnUpdated = (updatedCol) => {
      setColumns((prev) => prev.map((c) => (c.id === updatedCol.id ? updatedCol : c)));
    };

    const handleColumnDeleted = (payload) => {
      setColumns((prev) => prev.filter((c) => c.id !== payload.columnId));
      setTasks((prev) => prev.filter((t) => t.column_id !== payload.columnId));
    };

    // Member event handlers
    const handleMemberAdded = (payload) => {
      if (payload.projectId === Number(projectId)) {
        setMembers((prev) => [...prev, payload.member]);
      }
    };

    const handleMemberUpdated = (payload) => {
      if (payload.projectId === Number(projectId)) {
        setMembers((prev) =>
          prev.map((m) => (m.id === payload.userId ? { ...m, role: payload.role } : m))
        );
      }
    };

    const handleMemberRemoved = (payload) => {
      if (payload.projectId === Number(projectId)) {
        setMembers((prev) => prev.filter((m) => m.id !== payload.userId));
      }
    };

    // Presence update
    const handlePresence = (payload) => {
      if (payload.projectId === Number(projectId)) {
        setActiveUsers(payload.users || []);
      }
    };

    // Project update
    const handleProjectUpdated = (updatedProj) => {
      if (updatedProj.id === Number(projectId)) {
        setProject((prev) => ({ ...prev, ...updatedProj }));
      }
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('column:created', handleColumnCreated);
    socket.on('column:updated', handleColumnUpdated);
    socket.on('column:deleted', handleColumnDeleted);
    socket.on('member:added', handleMemberAdded);
    socket.on('member:updated', handleMemberUpdated);
    socket.on('member:removed', handleMemberRemoved);
    socket.on('presence:update', handlePresence);
    socket.on('project:updated', handleProjectUpdated);

    return () => {
      leaveProject(projectId);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('column:created', handleColumnCreated);
      socket.off('column:updated', handleColumnUpdated);
      socket.off('column:deleted', handleColumnDeleted);
      socket.off('member:added', handleMemberAdded);
      socket.off('member:updated', handleMemberUpdated);
      socket.off('member:removed', handleMemberRemoved);
      socket.off('presence:update', handlePresence);
      socket.off('project:updated', handleProjectUpdated);
    };
  }, [socket, projectId, selectedTaskId]);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.labels && task.labels.some((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          if (task.assignees && task.assignees.length > 0) return false;
        } else {
          const targetUserId = Number(assigneeFilter);
          if (!task.assignees || !task.assignees.some((a) => a.id === targetUserId)) return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter]);

  // Actions
  const handleMoveTask = async (taskId, targetColumnId, newPosition) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, column_id: targetColumnId, position: newPosition } : t))
      );
      await api.put(`/tasks/${taskId}/move`, {
        target_column_id: targetColumnId,
        new_position: newPosition
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      fetchProjectData();
    }
  };

  const handleAddTask = async ({ column_id, title }) => {
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, { column_id, title });
      setTasks((prev) => [...prev, res.task]);
    } catch (err) {
      alert('Failed to add task: ' + err.message);
    }
  };

  const handleAddColumn = async ({ title, color }) => {
    try {
      const res = await api.post(`/projects/${projectId}/columns`, { title, color });
      setColumns((prev) => [...prev, res.column]);
    } catch (err) {
      alert('Failed to add column: ' + err.message);
    }
  };

  const handleUpdateColumn = async (columnId, fields) => {
    try {
      const res = await api.put(`/columns/${columnId}`, fields);
      setColumns((prev) => prev.map((c) => (c.id === columnId ? res.column : c)));
    } catch (err) {
      alert('Failed to update column: ' + err.message);
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm('Delete this column and all its tasks?')) return;
    try {
      await api.delete(`/columns/${columnId}`);
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setTasks((prev) => prev.filter((t) => t.column_id !== columnId));
    } catch (err) {
      alert('Failed to delete column: ' + err.message);
    }
  };

  const handleUpdateProjectSettings = async (projectFields) => {
    const res = await api.put(`/projects/${projectId}`, projectFields);
    setProject(res.project);
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this project?')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      navigate('/');
    } catch (err) {
      alert('Failed to delete project: ' + err.message);
    }
  };

  const openTaskModal = (task) => {
    setSelectedTaskId(task.id);
    setSearchParams({ task: task.id });
  };

  const closeTaskModal = () => {
    setSelectedTaskId(null);
    setSearchParams({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-400">Loading project board...</p>
      </div>
    );
  }

  const IconComp = ICON_MAP[project?.icon] || Folder;
  const isOwner = project?.owner_id === user.id;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      {/* Project Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Back button + Icon + Title + Description */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0"
              style={{ backgroundColor: `${project?.color}25`, color: project?.color }}
            >
              <IconComp className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {project?.title}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => setIsEditProjectOpen(true)}
                    title="Project Settings"
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl">
                {project?.description || 'Collaborative team board'}
              </p>
            </div>
          </div>

          {/* Right: Presence + Member Avatars + Invite Button */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Real-time active users presence bar */}
            <PresenceBar activeUsers={activeUsers} />

            {/* Members Avatars with Invite Button */}
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full pl-2 pr-1 py-1">
              <div className="flex items-center -space-x-2 overflow-hidden">
                {members.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    title={`${m.name} (${m.role})`}
                    className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: m.avatar_color || '#6366f1' }}
                  >
                    {getInitials(m.name)}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300">
                    +{members.length - 5}
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Members ({members.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar: View Switcher & Filters */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>

            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>

          {/* Search & Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 sm:w-56 text-xs bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Priority Filter */}
            <select
              aria-label="Filter tasks by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-900/90 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Assignee Filter */}
            <select
              aria-label="Filter tasks by assignee"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="text-xs bg-slate-900/90 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'board' && (
          <BoardView
            columns={columns}
            tasks={filteredTasks}
            onSelectTask={openTaskModal}
            onMoveTask={handleMoveTask}
            onAddTask={handleAddTask}
            onAddColumn={handleAddColumn}
            onUpdateColumn={handleUpdateColumn}
            onDeleteColumn={handleDeleteColumn}
          />
        )}

        {viewMode === 'list' && (
          <ListView
            columns={columns}
            tasks={filteredTasks}
            onSelectTask={openTaskModal}
            onAddTask={handleAddTask}
            onMoveTask={handleMoveTask}
          />
        )}

        {viewMode === 'analytics' && (
          <AnalyticsView
            project={project}
            columns={columns}
            tasks={tasks}
            members={members}
          />
        )}
      </div>

      {/* Modals */}
      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          projectId={projectId}
          columns={columns}
          projectMembers={members}
          onClose={closeTaskModal}
          onTaskUpdated={(updatedTask) => {
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          }}
          onTaskDeleted={(tId) => {
            setTasks((prev) => prev.filter((t) => t.id !== Number(tId)));
          }}
        />
      )}

      {isEditProjectOpen && (
        <ProjectModal
          isOpen={isEditProjectOpen}
          initialData={project}
          onClose={() => setIsEditProjectOpen(false)}
          onSubmit={handleUpdateProjectSettings}
        />
      )}

      {isMembersModalOpen && (
        <MemberManagementModal
          isOpen={isMembersModalOpen}
          projectId={projectId}
          members={members}
          currentUserRole={project?.current_user_role}
          onClose={() => setIsMembersModalOpen(false)}
          onMemberAdded={(newMember) => setMembers((prev) => [...prev, newMember])}
          onMemberUpdated={(userId, newRole) => {
            setMembers((prev) =>
              prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m))
            );
          }}
          onMemberRemoved={(userId) => {
            setMembers((prev) => prev.filter((m) => m.id !== userId));
          }}
        />
      )}
    </div>
  );
}
