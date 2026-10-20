import React from 'react';
import { 
  Calendar, 
  CheckSquare, 
  MessageSquare, 
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { PRIORITY_CONFIG, formatDate, isOverdue, getInitials } from '../utils/helpers';

export default function TaskCard({ 
  task, 
  onClick, 
  onDragStart, 
  onDragEnd, 
  columns = [], 
  onQuickMove 
}) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const overdue = isOverdue(task.due_date, task.column_title?.toLowerCase().includes('done'));

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed)?.length || 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick && onClick(task)}
      className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:shadow-indigo-500/5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none"
    >
      {/* Top Bar: Priority Badge + Labels */}
      <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${priority.bg} ${priority.text} border ${priority.border}`}>
            {priority.label}
          </span>

          {task.labels && task.labels.map((lbl) => (
            <span
              key={lbl.id}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white/90 truncate max-w-[120px]"
              style={{ backgroundColor: `${lbl.color}25`, borderColor: `${lbl.color}50`, borderWidth: 1 }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: lbl.color }} />
              {lbl.name}
            </span>
          ))}
        </div>

        {/* Quick move dropdown for mobile / direct clicks */}
        {columns.length > 1 && onQuickMove && (
          <div className="relative group/menu" onClick={(e) => e.stopPropagation()}>
            <select
              aria-label="Move task to column"
              value={task.column_id}
              onChange={(e) => onQuickMove(task.id, Number(e.target.value))}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] bg-slate-900 border border-slate-700 text-slate-300 rounded px-1 py-0.5 cursor-pointer outline-none transition-opacity"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  Move: {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-medium text-slate-100 group-hover:text-indigo-200 transition-colors line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Description Snippet if available */}
      {task.description && (
        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
          {task.description}
        </p>
      )}

      {/* Card Footer: Due Date, Subtask Count, Comment Count, Assignees */}
      <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {/* Due Date */}
          {task.due_date && (
            <div className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? 'text-rose-400' : 'text-slate-400'}`}>
              {overdue ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Calendar className="w-3.5 h-3.5 shrink-0" />}
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}

          {/* Subtasks */}
          {totalSubtasks > 0 && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium ${
                completedSubtasks === totalSubtasks ? 'text-emerald-400' : 'text-slate-400'
              }`}
              title={`${completedSubtasks} of ${totalSubtasks} subtasks completed`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}

          {/* Comments */}
          {task.comment_count > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400" title={`${task.comment_count} comments`}>
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{task.comment_count}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatars */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {task.assignees.map((assignee) => (
              <div
                key={assignee.id}
                title={assignee.name}
                className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                style={{ backgroundColor: assignee.avatar_color || '#6366f1' }}
              >
                {getInitials(assignee.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
