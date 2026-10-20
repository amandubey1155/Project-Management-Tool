import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Trash2, 
  Calendar, 
  Users, 
  Tag, 
  CheckSquare, 
  MessageSquare, 
  Activity, 
  Send, 
  Plus, 
  Check, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  PRIORITY_CONFIG, 
  formatDate, 
  formatRelativeTime, 
  isOverdue, 
  getInitials 
} from '../utils/helpers';

export default function TaskModal({ taskId, projectId, columns = [], projectMembers = [], onClose, onTaskUpdated, onTaskDeleted }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [columnId, setColumnId] = useState(null);
  const [dueDate, setDueDate] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  // Subtask input
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Label input
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');

  // Assignee dropdown
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // Load task details
  const fetchTaskDetails = async () => {
    try {
      const data = await api.get(`/tasks/${taskId}`);
      setTask(data.task);
      setComments(data.comments || []);
      setActivities(data.activities || []);

      setTitle(data.task.title);
      setDescription(data.task.description || '');
      setPriority(data.task.priority);
      setColumnId(data.task.column_id);
      setDueDate(data.task.due_date ? data.task.due_date.split('T')[0] : '');
      setLoading(false);
    } catch (err) {
      console.error('Failed to load task:', err);
      onClose();
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Listen for real-time task updates and comments
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask.id === Number(taskId)) {
        setTask(updatedTask);
        setTitle(updatedTask.title);
        setDescription(updatedTask.description || '');
        setPriority(updatedTask.priority);
        setColumnId(updatedTask.column_id);
        setDueDate(updatedTask.due_date ? updatedTask.due_date.split('T')[0] : '');
      }
    };

    const handleCommentCreated = (payload) => {
      if (payload.taskId === Number(taskId)) {
        setComments((prev) => [...prev, payload.comment]);
      }
    };

    const handleCommentDeleted = (payload) => {
      if (payload.taskId === Number(taskId)) {
        setComments((prev) => prev.filter((c) => c.id !== payload.commentId));
      }
    };

    const handleTyping = (payload) => {
      if (payload.taskId === Number(taskId) && payload.user.id !== user.id) {
        if (payload.isTyping) {
          setTypingUsers((prev) => [...new Set([...prev, payload.user.name])]);
        } else {
          setTypingUsers((prev) => prev.filter((name) => name !== payload.user.name));
        }
      }
    };

    socket.on('task:updated', handleTaskUpdated);
    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('task:typing_status', handleTyping);

    return () => {
      socket.off('task:updated', handleTaskUpdated);
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('task:typing_status', handleTyping);
    };
  }, [socket, taskId, user.id]);

  // Save general updates
  const handleUpdate = async (fields = {}) => {
    try {
      const payload = {
        title: fields.title !== undefined ? fields.title : title,
        description: fields.description !== undefined ? fields.description : description,
        priority: fields.priority !== undefined ? fields.priority : priority,
        column_id: fields.column_id !== undefined ? fields.column_id : columnId,
        due_date: fields.due_date !== undefined ? fields.due_date : (dueDate || null)
      };

      const res = await api.put(`/tasks/${taskId}`, payload);
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);

      // Trigger confetti if moved to a Done column
      const selectedCol = columns.find((c) => c.id === payload.column_id);
      if (selectedCol && selectedCol.title.toLowerCase().includes('done')) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  // Move Column
  const handleColumnChange = (newColId) => {
    setColumnId(newColId);
    handleUpdate({ column_id: newColId });
  };

  // Priority Change
  const handlePriorityChange = (newPriority) => {
    setPriority(newPriority);
    handleUpdate({ priority: newPriority });
  };

  // Due Date Change
  const handleDateChange = (newDate) => {
    setDueDate(newDate);
    handleUpdate({ due_date: newDate || null });
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (onTaskDeleted) onTaskDeleted(taskId);
      onClose();
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  };

  // Subtask: Add
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks`, { title: newSubtaskTitle.trim() });
      setTask(res.task);
      setNewSubtaskTitle('');
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  // Subtask: Toggle
  const handleToggleSubtask = async (subtaskId, completed) => {
    try {
      const res = await api.put(`/tasks/subtasks/${subtaskId}`, { completed: !completed });
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);

      // Check if all subtasks are now completed!
      const allDone = res.task.subtasks.every((s) => s.completed);
      if (allDone && res.task.subtasks.length > 0) {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  // Subtask: Delete
  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const res = await api.delete(`/tasks/subtasks/${subtaskId}`);
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  // Assignee: Add
  const handleAssignUser = async (userId) => {
    try {
      const res = await api.post(`/tasks/${taskId}/assignees`, { userId });
      setTask(res.task);
      setShowAssignDropdown(false);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to assign user:', err);
    }
  };

  // Assignee: Remove
  const handleUnassignUser = async (userId) => {
    try {
      const res = await api.delete(`/tasks/${taskId}/assignees/${userId}`);
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to remove assignee:', err);
    }
  };

  // Label: Add
  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    try {
      const res = await api.post(`/tasks/${taskId}/labels`, {
        name: newLabelName.trim(),
        color: newLabelColor
      });
      setTask(res.task);
      setNewLabelName('');
      setShowAddLabel(false);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to add label:', err);
    }
  };

  // Label: Remove
  const handleRemoveLabel = async (labelId) => {
    try {
      const res = await api.delete(`/tasks/labels/${labelId}`);
      setTask(res.task);
      if (onTaskUpdated) onTaskUpdated(res.task);
    } catch (err) {
      console.error('Failed to remove label:', err);
    }
  };

  // Comments: Post
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { content: newComment.trim() });
      setComments((prev) => [...prev, res.comment]);
      setNewComment('');
      // Emit typing stopped
      if (socket) {
        socket.emit('task:typing', { projectId, taskId, isTyping: false });
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Comments: Delete
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

  // Handle typing indicator
  const handleCommentChange = (e) => {
    setNewComment(e.target.value);
    if (socket) {
      socket.emit('task:typing', {
        projectId,
        taskId,
        isTyping: e.target.value.length > 0
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center text-slate-300">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading task...</p>
        </div>
      </div>
    );
  }

  const assignedUserIds = new Set(task?.assignees?.map((a) => a.id) || []);
  const availableMembers = projectMembers.filter((m) => !assignedUserIds.has(m.id));

  const totalSubtasks = task?.subtasks?.length || 0;
  const completedSubtasks = task?.subtasks?.filter((s) => s.completed)?.length || 0;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const currentPriorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(dueDate, columns.find((c) => c.id === columnId)?.title?.toLowerCase().includes('done'));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Column Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                aria-label="Select task column"
                value={columnId || ''}
                onChange={(e) => handleColumnChange(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-100 outline-none cursor-pointer"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1">
              <span className="text-xs text-slate-400 font-medium">Priority:</span>
              <select
                aria-label="Select task priority"
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className={`bg-transparent text-xs font-bold outline-none cursor-pointer uppercase ${currentPriorityConfig.text}`}
              >
                <option value="urgent" className="bg-slate-900 text-red-400">Urgent</option>
                <option value="high" className="bg-slate-900 text-orange-400">High</option>
                <option value="medium" className="bg-slate-900 text-blue-400">Medium</option>
                <option value="low" className="bg-slate-900 text-emerald-400">Low</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              title="Delete task"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Left Content (2 Cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleUpdate({ title })}
                placeholder="Task title..."
                className="w-full text-xl font-bold bg-transparent text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 pb-1 outline-none transition-colors"
              />
            </div>

            {/* Description Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleUpdate({ description })}
                placeholder="Add more details, requirements, or acceptance criteria..."
                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Subtasks / Checklist */}
            <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Checklist
                  </span>
                  {totalSubtasks > 0 && (
                    <span className="text-xs text-slate-400 font-medium">
                      ({completedSubtasks}/{totalSubtasks})
                    </span>
                  )}
                </div>
                {totalSubtasks > 0 && (
                  <span className="text-xs font-bold text-indigo-400">{progressPercent}%</span>
                )}
              </div>

              {/* Progress Bar */}
              {totalSubtasks > 0 && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Subtask items list */}
              <div className="space-y-1.5 mb-3">
                {task?.subtasks?.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={Boolean(subtask.completed)}
                        onChange={() => handleToggleSubtask(subtask.id, subtask.completed)}
                        className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                      />
                      <span
                        className={`text-sm select-none truncate ${
                          subtask.completed ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </label>

                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add subtask inline form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a checklist item..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 text-xs bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>
            </div>

            {/* Tabs: Comments & Activity Log */}
            <div>
              <div className="flex border-b border-slate-800 mb-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'comments'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments ({comments.length})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Activity History ({activities.length})
                </button>
              </div>

              {activeTab === 'comments' ? (
                <div className="space-y-4">
                  {/* Comments list */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        No comments yet. Start the conversation below or mention teammates with @username.
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ backgroundColor: comment.avatar_color || '#6366f1' }}
                              >
                                {getInitials(comment.user_name)}
                              </div>
                              <span className="text-xs font-semibold text-slate-200">
                                {comment.user_name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {formatRelativeTime(comment.created_at)}
                              </span>
                            </div>

                            {comment.user_id === user.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed pl-7 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <p className="text-[11px] text-indigo-400 italic animate-pulse">
                      {typingUsers.join(', ')} is typing...
                    </p>
                  )}

                  {/* New comment input */}
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a comment or mention (@name)..."
                      value={newComment}
                      onChange={handleCommentChange}
                      className="flex-1 text-xs bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  </form>
                </div>
              ) : (
                /* Activity Log list */
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs text-slate-400">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: act.user_avatar_color || '#6366f1' }}
                      >
                        {getInitials(act.user_name)}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-300">{act.user_name}</span>{' '}
                        <span>{act.action}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatRelativeTime(act.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Metadata (1 Col) */}
          <div className="space-y-6 bg-slate-950/20 p-4 rounded-xl border border-slate-800/60 self-start">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Due Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`w-full text-xs bg-slate-800/80 border rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500 ${
                    overdue ? 'border-rose-500/50 text-rose-300' : 'border-slate-700'
                  }`}
                />
                {dueDate && (
                  <button
                    onClick={() => handleDateChange('')}
                    title="Clear date"
                    className="text-xs text-slate-400 hover:text-slate-200 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {overdue && (
                <p className="text-[11px] text-rose-400 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Overdue deadline
                </p>
              )}
            </div>

            {/* Assignees Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Assignees
                </label>
                {availableMembers.length > 0 && (
                  <button
                    onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assign
                  </button>
                )}
              </div>

              {/* Current Assignees */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {task?.assignees?.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">Unassigned</span>
                ) : (
                  task?.assignees?.map((assignee) => (
                    <span
                      key={assignee.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: assignee.avatar_color || '#6366f1' }}
                      >
                        {getInitials(assignee.name)}
                      </span>
                      <span className="truncate max-w-[100px]">{assignee.name}</span>
                      <button
                        onClick={() => handleUnassignUser(assignee.id)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Assign Dropdown */}
              {showAssignDropdown && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5">Project Members</p>
                  {availableMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleAssignUser(m.id)}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-200 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: m.avatar_color || '#6366f1' }}
                      >
                        {getInitials(m.name)}
                      </div>
                      <span className="truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Labels Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  Labels
                </label>
                <button
                  onClick={() => setShowAddLabel(!showAddLabel)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {task?.labels?.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No labels</span>
                ) : (
                  task?.labels?.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-white/90"
                      style={{ backgroundColor: `${label.color}30`, borderColor: `${label.color}60`, borderWidth: 1 }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                      <span>{label.name}</span>
                      <button
                        onClick={() => handleRemoveLabel(label.id)}
                        className="text-slate-400 hover:text-rose-400 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Label Form */}
              {showAddLabel && (
                <form onSubmit={handleAddLabel} className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl space-y-2">
                  <input
                    type="text"
                    placeholder="Label title..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewLabelColor(c)}
                          className={`w-4 h-4 rounded-full border ${newLabelColor === c ? 'ring-2 ring-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={!newLabelName.trim()}
                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Meta details */}
            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1.5">
              <p>Created by: <span className="text-slate-400 font-medium">{task?.creator_name}</span></p>
              <p>Created: <span className="text-slate-400">{formatDate(task?.created_at)}</span></p>
              <p>Updated: <span className="text-slate-400">{formatRelativeTime(task?.updated_at)}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
