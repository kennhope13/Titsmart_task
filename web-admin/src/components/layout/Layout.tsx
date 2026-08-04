import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen flex-1">
        <main className="flex-1 bg-slate-50 flex flex-col w-full max-w-full overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
