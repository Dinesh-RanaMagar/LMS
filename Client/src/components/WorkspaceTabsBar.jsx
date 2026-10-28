import React from 'react';
import { X } from 'lucide-react';
import { useWorkspaceTabs } from '../context/WorkspaceTabsContext';

const WorkspaceTabsBar = () => {
  const { tabs, activePath, openTab, closeTab } = useWorkspaceTabs();

  if (!tabs.length) return null;

  return (
    <nav aria-label="Open pages" className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 pt-2">
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        return (
          <div
            key={tab.path}
            className={`flex max-w-56 flex-shrink-0 items-center rounded-t-lg border border-b-0 ${
              active
                ? 'border-gray-200 bg-gray-50 text-indigo-700'
                : 'border-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <button
              type="button"
              onClick={() => openTab(tab.path)}
              className="truncate px-3 py-2 text-sm font-medium"
              aria-current={active ? 'page' : undefined}
              title={tab.title}
            >
              {tab.title}
            </button>
            <button
              type="button"
              onClick={() => closeTab(tab.path)}
              className="mr-1 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label={`Close ${tab.title} tab`}
              title={`Close ${tab.title}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </nav>
  );
};

export default WorkspaceTabsBar;
