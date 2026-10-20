import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, 
  Smartphone, 
  Server, 
  Sparkles, 
  Rocket, 
  Globe, 
  Database, 
  Shield,
  Plus, 
  Users, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Search,
  Lock,
  Globe2
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ProjectModal from '../components/ProjectModal';
import { ROLE_CONFIG } from '../utils/helpers';

const ICON_MAP = {
  folder: Folder,
  smartphone: Smartphone,
  server: Server,
  sparkles: Sparkles,
  rocket: Rocket,
  globe: Globe,
  database: Database,
  shield: Shield
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'mine' | 'shared'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.get('/projects');
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (projectData) => {
    const res = await api.post('/projects', projectData);
    setProjects((prev) => [res.project, ...prev]);
    navigate(`/projects/${res.project.id}`);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === 'mine') return p.owner_id === user.id;
    if (filterTab === 'shared') return p.owner_id !== user.id;
    return true;
  });

  const totalTasks = projects.reduce((acc, p) => acc + (p.task_count || 0), 0);
  const totalCompleted = projects.reduce((acc, p) => acc + (p.completed_task_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar onOpenNewProject={() => setIsCreateModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Welcome & Stats Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Good day, {user?.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-400">
              Welcome to your collaborative team workspace. Here is what is on deck:
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-xs text-slate-400 font-medium">Projects</span>
              <p className="text-xl font-bold text-white">{projects.length}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-xs text-slate-400 font-medium">Active Tasks</span>
              <p className="text-xl font-bold text-indigo-400">{totalTasks}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-2.5 text-center">
              <span className="text-xs text-slate-400 font-medium">Completed</span>
              <p className="text-xl font-bold text-emerald-400">{totalCompleted}</p>
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'mine', label: 'My Projects' },
              { id: 'shared', label: 'Shared with Me' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Filter projects by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading workspace projects...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Project Card */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-slate-900/70 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                Create New Project
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Set up a new board, invite team members, and manage tasks.
              </p>
            </div>

            {/* Project Cards */}
            {filteredProjects.map((project) => {
              const IconComp = ICON_MAP[project.icon] || Folder;
              const roleConfig = ROLE_CONFIG[project.current_user_role] || ROLE_CONFIG.member;
              const progress = project.task_count > 0
                ? Math.round((project.completed_task_count / project.task_count) * 100)
                : 0;

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Top: Icon & Visibility/Role */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md"
                        style={{ backgroundColor: `${project.color}20`, color: project.color }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {project.is_public ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800">
                            <Globe2 className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}

                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${roleConfig.badge}`}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Project Title & Description */}
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Card Bottom: Progress & Stats */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">
                          {project.completed_task_count || 0} of {project.task_count || 0} tasks
                        </span>
                        <span className="font-bold text-indigo-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Members & Action */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{project.member_count || 1} members</span>
                      </div>

                      <span className="text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Open Board <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
