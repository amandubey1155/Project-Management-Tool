import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Layers, 
  Plus, 
  Bell, 
  LogOut, 
  User, 
  Radio, 
  ChevronDown, 
  Users, 
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationDropdown from './NotificationDropdown';
import { getInitials } from '../utils/helpers';

export default function Navbar({ onOpenNewProject }) {
  const { user, logout, demoLogin } = useAuth();
  const { connected } = useSocket();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
        setShowDemoSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const demoAccounts = [
    { name: 'Alex Rivera', email: 'alex@example.com', role: 'Product Lead', color: '#6366f1' },
    { name: 'Sarah Chen', email: 'sarah@example.com', role: 'Frontend Engineer', color: '#ec4899' },
    { name: 'David Miller', email: 'david@example.com', role: 'Backend Architect', color: '#10b981' },
    { name: 'Elena Rostova', email: 'elena@example.com', role: 'UI/UX Designer', color: '#f59e0b' },
    { name: 'Marcus Vance', email: 'marcus@example.com', role: 'DevOps Engineer', color: '#8b5cf6' }
  ];

  const handleSwitchAccount = async (email) => {
    setShowUserMenu(false);
    setShowDemoSwitcher(false);
    await demoLogin(email);
    window.location.reload();
  };

  return (
    <nav className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                PulseFlow
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Collaborative Workspace</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
            Projects
          </Link>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* WebSocket Live Connection Pill */}
        <div
          title={connected ? 'Connected to real-time sync server' : 'Connecting to real-time server...'}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300"
        >
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                connected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-slate-300">
            {connected ? 'Live Sync' : 'Connecting'}
          </span>
        </div>

        {/* Create Project Button */}
        {onOpenNewProject && (
          <button
            onClick={onOpenNewProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        )}

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* User Menu & Switcher */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                style={{ backgroundColor: user.avatar_color || '#6366f1' }}
              >
                {getInitials(user.name)}
              </div>
              <span className="text-xs font-medium text-slate-200 hidden sm:inline-block max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* User Info Header */}
                <div className="p-3.5 border-b border-slate-800 bg-slate-950/40">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                      style={{ backgroundColor: user.avatar_color || '#6366f1' }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Switch Demo Accounts option */}
                <div className="p-2 border-b border-slate-800">
                  <p className="px-2 py-1 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Switch Demo User (1-Click)
                  </p>
                  <div className="mt-1 space-y-1">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.email}
                        onClick={() => handleSwitchAccount(account.email)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          user.email === account.email
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] text-white font-bold"
                            style={{ backgroundColor: account.color }}
                          >
                            {getInitials(account.name)}
                          </span>
                          <span className="truncate">{account.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{account.role.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logout Button */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
