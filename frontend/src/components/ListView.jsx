import React, { useState } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  AlertCircle, 
  Plus, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { PRIORITY_CONFIG, formatDate, isOverdue, getInitials } from '../utils/helpers';

export default function ListView({
  columns = [],
  tasks = [],
  onSelectTask,
  onAddTask,
  onMoveTask
}) {
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [activeNewTaskColId, setActiveNewTaskColId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const toggleCollapse = (colId) => {
    setCollapsedColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const handleCreateTask = (e, columnId) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onAddTask({
      column_id: columnId,
      title: newTaskTitle.trim()
    });

    setNewTaskTitle('');
    setActiveNewTaskColId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="space-y-6">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.column_id === column.id);
          const isCollapsed = collapsedColumns[column.id];

          return (
            <div key={column.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              {/* Group Header */}
              <div
                onClick={() => toggleCollapse(column.id)}
                className="p-3.5 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: column.color || '#64748b' }}
                  />
                  <h3 className="font-bold text-sm text-slate-200">{column.title}</h3>
                  <span className="text-xs text-slate-500 font-medium">({columnTasks.length})</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNewTaskColId(column.id);
                    setNewTaskTitle('');
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Add task in this section"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks Table */}
              {!isCollapsed && (
                <div>
                  {columnTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic">
                      No tasks in this section.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {columnTasks.map((task) => {
                        const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        const overdue = isOverdue(
                          task.due_date,
                          column.title.toLowerCase().includes('done')
                        );
                        const totalSub = task.subtasks?.length || 0;
                        const doneSub = task.subtasks?.filter((s) => s.completed)?.length || 0;

                        return (
                          <div
                            key={task.id}
                            onClick={() => onSelectTask(task)}
                            className="p-3 px-4 hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                          >
                            {/* Left: Title & Labels */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${priority.bg} ${priority.text} border ${priority.border} shrink-0`}
                              >
                                {priority.label}
                              </span>

                              <span className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                                {task.title}
                              </span>

                              {task.labels && task.labels.map((lbl) => (
                                <span
                                  key={lbl.id}
                                  className="hidden md:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md text-white/90 shrink-0"
                                  style={{
                                    backgroundColor: `${lbl.color}25`,
                                    borderColor: `${lbl.color}50`,
                                    borderWidth: 1
                                  }}
                                >
                                  {lbl.name}
                                </span>
                              ))}
                            </div>

                            {/* Right Columns: Due Date, Subtasks, Comments, Assignees */}
                            <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                              {/* Due Date */}
                              {task.due_date && (
                                <div
                                  className={`flex items-center gap-1.5 ${
                                    overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                                  }`}
                                >
                                  {overdue ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <Calendar className="w-3.5 h-3.5" />
                                  )}
                                  <span className="hidden sm:inline">{formatDate(task.due_date)}</span>
                                </div>
                              )}

                              {/* Subtasks */}
                              {totalSub > 0 && (
                                <div className="flex items-center gap-1" title="Subtasks">
                                  <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{doneSub}/{totalSub}</span>
                                </div>
                              )}

                              {/* Comments */}
                              {task.comment_count > 0 && (
                                <div className="flex items-center gap-1" title="Comments">
                                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{task.comment_count}</span>
                                </div>
                              )}

                              {/* Assignees */}
                              {task.assignees && task.assignees.length > 0 && (
                                <div className="flex items-center -space-x-1.5">
                                  {task.assignees.map((a) => (
                                    <div
                                      key={a.id}
                                      title={a.name}
                                      className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                                      style={{ backgroundColor: a.avatar_color || '#6366f1' }}
                                    >
                                      {getInitials(a.name)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Task input row */}
                  {activeNewTaskColId === column.id ? (
                    <form
                      onSubmit={(e) => handleCreateTask(e, column.id)}
                      className="p-3 bg-slate-950/30 border-t border-slate-800/80 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNewTaskColId(null);
                          setNewTaskTitle('');
                        }}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newTaskTitle.trim()}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold"
                      >
                        Add
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveNewTaskColId(column.id);
                        setNewTaskTitle('');
                      }}
                      className="w-full p-2.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors flex items-center gap-2 justify-start px-4"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add task...</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
