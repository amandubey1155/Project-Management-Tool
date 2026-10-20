import React, { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit2, Check, X } from 'lucide-react';
import TaskCard from './TaskCard';

export default function BoardView({
  columns = [],
  tasks = [],
  onSelectTask,
  onMoveTask,
  onAddTask,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn
}) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // New task inline creation per column
  const [activeNewTaskColId, setActiveNewTaskColId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // New column creation
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#64748b');

  // Editing column title
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Drag handlers
  const handleDragStart = (e, task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskIdStr = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskIdStr) return;

    const taskId = Number(taskIdStr);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.column_id !== targetColumnId) {
      // Calculate new position at end of target column
      const targetTasks = tasks.filter((t) => t.column_id === targetColumnId);
      const newPos = targetTasks.length;
      onMoveTask(taskId, targetColumnId, newPos);
    }
    setDraggedTaskId(null);
  };

  // Submit new task
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

  // Submit new column
  const handleCreateColumn = (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    onAddColumn({
      title: newColumnTitle.trim(),
      color: newColumnColor
    });

    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  // Submit edited column
  const handleSaveEditColumn = (colId) => {
    if (!editingTitle.trim()) {
      setEditingColumnId(null);
      return;
    }
    onUpdateColumn(colId, { title: editingTitle.trim() });
    setEditingColumnId(null);
  };

  return (
    <div className="flex-1 overflow-x-auto p-4 sm:p-6 select-none">
      <div className="flex items-start gap-5 min-w-max pb-6">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.column_id === column.id);
          const isDragOver = dragOverColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`w-80 shrink-0 bg-slate-900/70 border rounded-2xl flex flex-col max-h-[calc(100vh-12rem)] transition-colors ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/30'
                  : 'border-slate-800'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: column.color || '#64748b' }}
                  />

                  {editingColumnId === column.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="text-xs bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEditColumn(column.id)}
                        className="text-emerald-400 hover:text-emerald-300 p-0.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingColumnId(null)}
                        className="text-slate-400 hover:text-slate-200 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3
                      onDoubleClick={() => {
                        setEditingColumnId(column.id);
                        setEditingTitle(column.title);
                      }}
                      className="font-bold text-sm text-slate-200 truncate cursor-pointer hover:text-white"
                      title="Double click to rename"
                    >
                      {column.title}
                    </h3>
                  )}

                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingColumnId(column.id);
                      setEditingTitle(column.title);
                    }}
                    title="Rename column"
                    className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {columns.length > 1 && (
                    <button
                      onClick={() => onDeleteColumn(column.id)}
                      title="Delete column"
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cards List in this Column */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[120px]">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    columns={columns}
                    onClick={onSelectTask}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onQuickMove={(tId, cId) => onMoveTask(tId, cId, 0)}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <div className="border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
                    Drop tasks here
                  </div>
                )}
              </div>

              {/* Column Footer: Add Task Button / Form */}
              <div className="p-3 border-t border-slate-800/80 bg-slate-950/20 rounded-b-2xl">
                {activeNewTaskColId === column.id ? (
                  <form onSubmit={(e) => handleCreateTask(e, column.id)} className="space-y-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Enter task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-end gap-2">
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
                        Add Task
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setActiveNewTaskColId(column.id);
                      setNewTaskTitle('');
                    }}
                    className="w-full py-2 rounded-xl border border-transparent hover:border-slate-800 hover:bg-slate-800/60 text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add New Column Section */}
        <div className="w-72 shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleCreateColumn}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3"
            >
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                New Column
              </h4>
              <input
                type="text"
                autoFocus
                placeholder="Column name (e.g. QA, Blocked)..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-slate-400 font-medium">Color:</span>
                <div className="flex items-center gap-1.5">
                  {['#64748b', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColumnColor(c)}
                      className={`w-4 h-4 rounded-full ${newColumnColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColumnTitle.trim()}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full py-3.5 px-4 rounded-2xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-800/40 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Add Column</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
