import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { settingsAPI } from '../services/api';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  FileText,
  ClipboardList,
  Megaphone,
  TrendingUp,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  BookMarked,
  Building2,
  Settings,
  UserCheck,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/academic-years', label: 'Academic Years', icon: Calendar },
  { path: '/students', label: 'Students', icon: Users },
  { path: '/classes', label: 'Classes', icon: Building2 },
  { path: '/subjects', label: 'Subjects', icon: BookMarked },
  { path: '/exams', label: 'Exams', icon: BookOpen },
  { path: '/marks-entry', label: 'Marks Entry', icon: ClipboardList },
  { path: '/marksheets', label: 'Marksheets', icon: FileText },
  { path: '/promotion', label: 'Promotion', icon: TrendingUp },
  { path: '/teachers', label: 'Teachers', icon: UserCheck },
  { path: '/attendance', label: 'Attendance', icon: ClipboardList },
  { path: '/notices', label: 'Notices', icon: Megaphone },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${url}`;
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  React.useEffect(() => {
    settingsAPI.get().then((res) => setSettings(res.data.settings)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-indigo-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow">
          {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="School logo" className="w-7 h-7 object-contain" /> : <GraduationCap size={22} className="text-indigo-600" />}
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-base leading-tight truncate max-w-36">{settings?.schoolName || 'EduAdmin'}</p>
            <p className="text-indigo-300 text-xs">School Management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                ${active
                  ? 'bg-white text-indigo-700 shadow font-semibold'
                  : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm">{label}</span>}
              {!collapsed && active && (
                <ChevronRight size={16} className="ml-auto text-indigo-400" />
              )}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-indigo-700 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{admin?.name || 'Admin'}</p>
              <p className="text-indigo-300 text-xs truncate">{admin?.email || ''}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-indigo-200 hover:bg-red-500 hover:text-white transition-all text-sm
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:flex flex-col bg-indigo-800 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
        style={{ minHeight: '100vh' }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-4 left-0 z-10 hidden md:flex"
          style={{ left: collapsed ? '52px' : '228px', transition: 'left 0.3s' }}
        >
          <div className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-50 transition">
            {collapsed ? <ChevronRight size={12} className="text-indigo-600" /> : <X size={12} className="text-indigo-600" />}
          </div>
        </button>
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-indigo-800 flex items-center justify-between px-4 h-14 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="School logo" className="w-5 h-5 object-contain" /> : <GraduationCap size={16} className="text-indigo-600" />}
          </div>
          <span className="text-white font-bold text-base truncate max-w-48">{settings?.schoolName || 'EduAdmin'}</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-white p-1">
          <Menu size={24} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-indigo-800 flex flex-col h-full shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-indigo-200 hover:text-white"
            >
              <X size={22} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
