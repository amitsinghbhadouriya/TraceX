import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex h-full w-full bg-navy overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace section */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Glow pattern backing */}
        <div className="absolute top-0 right-0 left-0 h-64 bg-radial-glow pointer-events-none z-0" />
        
        {/* Scrollable content layer */}
        <div className="flex-1 overflow-y-auto relative z-10 p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
