import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useEmailReminders } from '../../hooks/useEmailReminders';

export default function Layout({ session }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEmailReminders();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafb]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
