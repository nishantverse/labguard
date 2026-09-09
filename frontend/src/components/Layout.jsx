import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0a0e17] text-gray-200">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-1 flex-col lg:ml-64">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-700/50 bg-gray-900 px-4 py-3 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold">LabGuard</span>
        </div>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
