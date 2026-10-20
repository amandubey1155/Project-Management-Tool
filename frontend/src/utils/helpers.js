import { format, formatDistanceToNow, isPast, isToday, parseISO } from 'date-fns';

export function getInitials(name = '') {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM d, yyyy');
  } catch (e) {
    return dateString;
  }
}

export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return dateString;
  }
}

export function isOverdue(dueDateString, isDone = false) {
  if (!dueDateString || isDone) return false;
  try {
    const date = typeof dueDateString === 'string' ? parseISO(dueDateString) : dueDateString;
    return isPast(date) && !isToday(date);
  } catch (e) {
    return false;
  }
}

export const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  high: { label: 'High', color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { label: 'Medium', color: '#3b82f6', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  low: { label: 'Low', color: '#10b981', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' }
};

export const ROLE_CONFIG = {
  owner: { label: 'Owner', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  admin: { label: 'Admin', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  member: { label: 'Member', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  viewer: { label: 'Viewer', badge: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40' }
};
