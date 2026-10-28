import React from 'react';
import Sidebar from './Sidebar';
import WorkspaceTabsBar from './WorkspaceTabsBar';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#f4f6fb] overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 bg-[#f4f6fb] md:overflow-auto overflow-x-hidden">
        {/* Mobile top padding for fixed header */}
        <div className="md:hidden h-14" />
        <WorkspaceTabsBar />
        {children}
      </main>
    </div>
  );
};

export default Layout;
