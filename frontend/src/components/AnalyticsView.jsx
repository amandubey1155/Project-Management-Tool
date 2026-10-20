import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Users, BarChart3, TrendingUp } from 'lucide-react';
import { PRIORITY_CONFIG, getInitials } from '../utils/helpers';

export default function AnalyticsView({ project, columns = [], tasks = [], members = [] }) {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => {
    const col = columns.find((c) => c.id === t.column_id);
    return col && col.title.toLowerCase().includes('done');
  }).length;

  const inProgressTasks = tasks.filter((t) => {
    const col = columns.find((c) => c.id === t.column_id);
    return col && (col.title.toLowerCase().includes('progress') || col.title.toLowerCase().includes('review'));
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Priority counts
  const priorities = {
    urgent: tasks.filter((t) => t.priority === 'urgent').length,
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalTasks}</div>
          <p className="text-[11px] text-slate-500 mt-1">Across {columns.length} columns</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completionRate}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Flight</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{inProgressTasks}</div>
          <p className="text-[11px] text-slate-500 mt-1">Active tasks in progress</p>
        </div>

        {/* Team Members */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Team Size</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{members.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Collaborators in project</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Tasks by Column</h3>
          <div className="space-y-3">
            {columns.map((col) => {
              const colTaskCount = tasks.filter((t) => t.column_id === col.id).length;
              const pct = totalTasks > 0 ? Math.round((colTaskCount / totalTasks) * 100) : 0;

              return (
                <div key={col.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      {col.title}
                    </span>
                    <span className="text-slate-400">{colTaskCount} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: col.color || '#6366f1' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Priority Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(priorities).map(([key, count]) => {
              const cfg = PRIORITY_CONFIG[key];
              return (
                <div key={key} className={`p-3.5 rounded-xl border ${cfg.bg} ${cfg.border} flex flex-col justify-between`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
                  <span className="text-2xl font-bold text-white mt-1">{count}</span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0}% of all tasks
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Member Workload */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-200">Member Workload Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const assignedTasks = tasks.filter((t) => t.assignees?.some((a) => a.id === member.id));
            const memberDone = assignedTasks.filter((t) => {
              const col = columns.find((c) => c.id === t.column_id);
              return col && col.title.toLowerCase().includes('done');
            }).length;

            return (
              <div key={member.id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                    style={{ backgroundColor: member.avatar_color || '#6366f1' }}
                  >
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{member.role}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Assigned Tasks:</span>
                  <span className="font-bold text-white">{assignedTasks.length}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Completed:</span>
                  <span className="font-semibold text-emerald-400">{memberDone}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
