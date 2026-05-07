import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main id="main-scroll-container" className="flex-1 min-w-0 md:overflow-auto">
        {/* Mobile top padding for fixed header */}
        <div className="md:hidden h-14" />
        {children}
      </main>
    </div>
  );
};

export default Layout;
