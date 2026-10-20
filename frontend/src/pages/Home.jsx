import React from 'react';
import ResearchForm from '../components/research/ResearchForm';
import ResearchActivity from '../components/research/ResearchActivity';
import ReportViewer from '../components/research/ReportViewer';
import QuickStats from '../components/dashboard/QuickStats';
import RecentResearches from '../components/dashboard/RecentResearches';
import ResearchDetails from '../components/dashboard/ResearchDetails';

export default function Home() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Central Column (approx 68% width: 8 of 12 cols on desktop) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Card 1: Start a New Research */}
        <ResearchForm />

        {/* Card 2: Current Research Activity */}
        <ResearchActivity />

        {/* Card 3: Research Results */}
        <ReportViewer />
      </div>

      {/* Right Sidebar Column (approx 32% width: 4 of 12 cols on desktop) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Quick Stats (2x2 grid) */}
        <QuickStats />

        {/* Recent Researches (5 rows) */}
        <RecentResearches />

        {/* Research Details */}
        <ResearchDetails />
      </div>
    </div>
  );
}
