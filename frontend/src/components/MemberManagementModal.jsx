import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Shield, Search, Check } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getInitials, ROLE_CONFIG } from '../utils/helpers';

export default function MemberManagementModal({
  isOpen,
  onClose,
  projectId,
  members = [],
  currentUserRole = 'member',
  onMemberAdded,
  onMemberUpdated,
  onMemberRemoved
}) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRole, setSelectedRole] = useState('member');
  const [searching, setSearching] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Search users as query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const currentMemberIds = new Set(members.map((m) => m.id));
        // Filter out users already in project
        const available = res.users.filter((u) => !currentMemberIds.has(u.id));
        setSearchResults(available);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, members]);

  if (!isOpen) return null;

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Add member
  const handleAddMember = async (targetUser) => {
    setLoadingAction(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, {
        userId: targetUser.id,
        role: selectedRole
      });
      if (onMemberAdded) onMemberAdded(res.member);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Change member role
  const handleRoleChange = async (memberUserId, newRole) => {
    try {
      await api.put(`/projects/${projectId}/members/${memberUserId}`, { role: newRole });
      if (onMemberUpdated) onMemberUpdated(memberUserId, newRole);
    } catch (err) {
      alert(err.message);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberUserId}`);
      if (onMemberRemoved) onMemberRemoved(memberUserId);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Project Members & Access</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Invite Bar (if admin/owner) */}
        {isOwnerOrAdmin && (
          <div className="p-4 px-6 border-b border-slate-800 bg-slate-900/60">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Invite Collaborators
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or email (e.g. sarah@example.com)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                aria-label="Role for invited member"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {/* Search dropdown results */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl p-2 max-h-44 overflow-y-auto divide-y divide-slate-700/50">
                {searchResults.map((u) => (
                  <div key={u.id} className="py-2 px-2 flex items-center justify-between hover:bg-slate-700/40 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                        style={{ backgroundColor: u.avatar_color || '#6366f1' }}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddMember(u)}
                      disabled={loadingAction}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current Members List */}
        <div className="flex-1 overflow-y-auto p-4 px-6 divide-y divide-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Current Members ({members.length})
          </p>

          <div className="space-y-3 pt-2">
            {members.map((member) => {
              const isSelf = member.id === user.id;
              const isOwner = member.role === 'owner';
              const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;

              return (
                <div key={member.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                      style={{ backgroundColor: member.avatar_color || '#6366f1' }}
                    >
                      {getInitials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {member.name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Role Selector or Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwnerOrAdmin && !isOwner ? (
                      <select
                        aria-label={`Role for ${member.name}`}
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${roleConfig.badge}`}>
                        {roleConfig.label}
                      </span>
                    )}

                    {/* Remove button */}
                    {isOwnerOrAdmin && !isOwner && !isSelf && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        title="Remove from project"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-6 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
