import React, { useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  FileText,
  ClipboardList,
  Megaphone,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  BookMarked,
  Building2,
  Settings,
  UserCheck,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/academic-years', label: 'Academic Years', icon: Calendar },
  { path: '/students', label: 'Students', icon: Users },
  { path: '/classes', label: 'Classes', icon: Building2 },
  { path: '/subjects', label: 'Subjects', icon: BookMarked },
  {
    label: 'Examinations',
    icon: BookOpen,
    children: [
      { path: '/exams', label: 'Exams' },
      { path: '/marks-entry', label: 'Marks Entry' },
      { path: '/promotion', label: 'Promotion' },
    ],
  },
  {
    label: 'Reports',
    icon: FileText,
    children: [
      { path: '/reports/tabulation', label: 'Tabulation' },
      { path: '/marksheets', label: 'Marksheets' },
      { path: '/evaluation', label: 'Analysis' },
    ],
  },
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sidebarId = useId();
  const { admin, logout } = useAuth();
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(null);
  const [examinationsOpen, setExaminationsOpen] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
        <SidebarContent collapsed={collapsed} setCollapsed={setCollapsed} settings={settings} admin={admin} handleLogout={handleLogout} onNavigate={() => setMobileOpen(false)} pathname={pathname} reportsOpen={reportsOpen} setReportsOpen={setReportsOpen} reportsMenuId={`${sidebarId}-desktop-reports`} examinationsOpen={examinationsOpen} setExaminationsOpen={setExaminationsOpen} examinationsMenuId={`${sidebarId}-desktop-examinations`} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-indigo-800 flex items-center justify-between px-4 h-14 shadow-lg">
        <button onClick={() => setMobileOpen(true)} className="p-2 text-white">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow">
            {settings?.logoUrl ? <img src={getImageUrl(settings.logoUrl)} alt="Logo" className="w-5 h-5 object-contain" /> : <GraduationCap size={16} className="text-indigo-600" />}
          </div>
          <span className="text-white font-bold text-sm truncate max-w-40">{settings?.schoolName || 'EduAdmin'}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold text-xs">
          {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-indigo-800 shadow-2xl flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-2 text-white hover:bg-indigo-700 rounded-lg">
              <X size={22} />
            </button>
            <SidebarContent collapsed={false} setCollapsed={setCollapsed} settings={settings} admin={admin} handleLogout={handleLogout} onNavigate={() => setMobileOpen(false)} pathname={pathname} reportsOpen={reportsOpen} setReportsOpen={setReportsOpen} reportsMenuId={`${sidebarId}-mobile-reports`} examinationsOpen={examinationsOpen} setExaminationsOpen={setExaminationsOpen} examinationsMenuId={`${sidebarId}-mobile-examinations`} />
          </aside>
        </div>
      )}
    </>
  );
};

const SidebarContent = ({ collapsed, setCollapsed, settings, admin, handleLogout, onNavigate, pathname, reportsOpen, setReportsOpen, reportsMenuId, examinationsOpen, setExaminationsOpen, examinationsMenuId }) => (
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
      {navItems.map(({ path, label, icon: Icon, children }) => {
        if (children) {
          const childActive = children.some((child) =>
            pathname === child.path || pathname.startsWith(`${child.path}/`)
          );
          const isExaminations = label === 'Examinations';
          const openState = isExaminations ? examinationsOpen : reportsOpen;
          const setOpenState = isExaminations ? setExaminationsOpen : setReportsOpen;
          const menuId = isExaminations ? examinationsMenuId : reportsMenuId;
          const expanded = childActive || (openState ?? false);
          return (
            <div key={label}>
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false);
                    setOpenState(true);
                    return;
                  }
                  setOpenState(!expanded);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                  childActive ? 'bg-indigo-700 text-white font-semibold' : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                aria-expanded={expanded}
                aria-controls={menuId}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <><span className="flex-1 text-left text-sm">{label}</span><ChevronDown size={16} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} /></>}
                {collapsed && <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">{label}</span>}
              </button>
              <div
                id={menuId}
                aria-hidden={!expanded || collapsed}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  expanded && !collapsed ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="ml-5 mt-1 space-y-1 border-l border-indigo-600 pl-3">
                    {children.map((child) => {
                      const activeChild = pathname === child.path || pathname.startsWith(`${child.path}/`);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onNavigate}
                          tabIndex={expanded && !collapsed ? 0 : -1}
                          className={`block rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                            activeChild ? 'bg-white text-indigo-700 shadow font-semibold' : 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        }
        const active = pathname === path || pathname.startsWith(path + '/');
        return (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
              ${
                active
                  ? 'bg-white text-indigo-700 shadow font-semibold'
                  : 'text-indigo-100 hover:bg-indigo-700 hover:text-white'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <Icon size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">{label}</span>}
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

export default Sidebar;
