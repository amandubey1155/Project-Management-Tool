import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, UserPlus, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatRelativeTime } from '../utils/helpers';

export default function NotificationDropdown({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    onClose();
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'assigned':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'project_invite':
        return <CheckCircle className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-slate-100 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Bell className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            No notifications yet
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3 ${
                !notif.is_read ? 'bg-indigo-950/20' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700/60">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-slate-300 truncate">
                    {notif.title}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(notif.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 break-words line-clamp-2">
                  {notif.message}
                </p>
              </div>

              {!notif.is_read && (
                <div className="mt-2 w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
