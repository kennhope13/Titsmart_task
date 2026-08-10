import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
      <Sidebar />
      <div className="ml-60 flex flex-col h-screen flex-1 overflow-hidden">
        <main className="flex-1 bg-slate-50 flex flex-col w-full max-w-full overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
