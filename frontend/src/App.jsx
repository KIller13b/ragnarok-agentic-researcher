import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ResearchProvider } from './context/ResearchContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/Home';
import NewResearch from './pages/NewResearch';
import MyResearches from './pages/MyResearches';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ThemeProvider>
      <ResearchProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Home />} />
              <Route path="new-research" element={<NewResearch />} />
              <Route path="my-researches" element={<MyResearches />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ResearchProvider>
    </ThemeProvider>
  );
}
