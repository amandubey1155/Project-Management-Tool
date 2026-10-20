import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function Toast() {
  const { toast, dismissToast, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!toast) return null;

  const handleClick = () => {
    markAsRead(toast.id);
    dismissToast();
    if (toast.link) {
      navigate(toast.link);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-indigo-500/40 rounded-xl shadow-2xl p-4 flex items-start gap-3 text-slate-100 animate-in slide-in-from-bottom-5 duration-300">
      <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
        <Bell className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 cursor-pointer" onClick={handleClick}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            {toast.title || 'Notification'}
          </p>
        </div>
        <p className="text-sm font-medium text-slate-200 mt-0.5 line-clamp-2">
          {toast.message}
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mt-2 hover:underline font-medium">
          View details <ExternalLink className="w-3 h-3" />
        </span>
      </div>

      <button
        onClick={dismissToast}
        className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
