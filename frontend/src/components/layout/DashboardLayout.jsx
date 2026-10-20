import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return 'Home Dashboard';
      case '/new-research':
        return 'Start New Research';
      case '/my-researches':
        return 'My Researches';
      case '/reports':
        return 'Generated Reports';
      case '/settings':
        return 'Application Settings';
      default:
        return 'Autonomous Research Agent';
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-primary flex transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Workspace Column */}
      <div className="flex-1 lg:pl-[238px] flex flex-col min-w-0">
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          title={getPageTitle(location.pathname)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
