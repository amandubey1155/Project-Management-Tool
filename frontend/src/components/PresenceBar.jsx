import React from 'react';
import { Eye } from 'lucide-react';
import { getInitials } from '../utils/helpers';

export default function PresenceBar({ activeUsers = [] }) {
  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full text-xs text-slate-300">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Eye className="w-3.5 h-3.5 text-indigo-400" />
        <span className="hidden sm:inline font-medium text-[11px] uppercase tracking-wider text-slate-400">
          Live now:
        </span>
      </div>

      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {activeUsers.map((u) => (
          <div
            key={u.id}
            title={`${u.name} is currently viewing this board`}
            className="relative group cursor-pointer"
          >
            <div
              className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-emerald-500/50"
              style={{ backgroundColor: u.avatar_color || '#6366f1' }}
            >
              {getInitials(u.name)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-slate-900"></span>
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-400 font-medium ml-0.5">
        {activeUsers.length} active
      </span>
    </div>
  );
}
