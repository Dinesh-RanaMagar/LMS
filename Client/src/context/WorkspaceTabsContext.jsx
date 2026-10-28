import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getWorkspaceTabTitle, isWorkspacePath } from './workspaceTabsUtils';

const WorkspaceTabsContext = createContext(null);

export const WorkspaceTabsProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [tabs, setTabs] = useState([]);
  const activePath = location.pathname;

  useEffect(() => {
    if (!isAuthenticated) {
      setTabs([]);
      return;
    }
    if (!isWorkspacePath(location.pathname)) return;

    const path = location.pathname;
    const nextLocation = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
    };
    setTabs((current) => {
      const existing = current.find((tab) => tab.path === path);
      if (existing) {
        return current.map((tab) => tab.path === path
          ? { ...tab, location: nextLocation, title: getWorkspaceTabTitle(path) }
          : tab);
      }
      return [...current, {
        path,
        title: getWorkspaceTabTitle(path),
        location: nextLocation,
      }];
    });
  }, [isAuthenticated, location.pathname, location.search, location.hash, location.state]);

  const openTab = useCallback((path) => {
    const tab = tabs.find((item) => item.path === path);
    if (tab) navigate(tab.location);
  }, [navigate, tabs]);

  const closeTab = useCallback((path) => {
    const index = tabs.findIndex((tab) => tab.path === path);
    if (index < 0) return;
    const remaining = tabs.filter((tab) => tab.path !== path);
    setTabs(remaining);

    if (location.pathname === path) {
      const nextTab = remaining[index - 1] || remaining[index] || null;
      navigate(nextTab ? nextTab.location : '/dashboard');
    }
  }, [location.pathname, navigate, tabs]);

  const value = useMemo(() => ({
    tabs,
    activePath,
    openTab,
    closeTab,
  }), [tabs, activePath, openTab, closeTab]);

  return (
    <WorkspaceTabsContext.Provider value={value}>
      {children}
    </WorkspaceTabsContext.Provider>
  );
};

export const useWorkspaceTabs = () => {
  const context = useContext(WorkspaceTabsContext);
  if (!context) throw new Error('useWorkspaceTabs must be used within WorkspaceTabsProvider');
  return context;
};
