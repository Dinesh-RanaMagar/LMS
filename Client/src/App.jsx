import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { SettingsProvider } from './context/SettingsContext';
import { WorkspaceTabsProvider } from './context/WorkspaceTabsContext';
import NotificationViewport from './components/NotificationViewport';
import WorkspaceRoutes from './components/WorkspaceRoutes';

import Login from './pages/Login';
import Register from './pages/Register';
import PublicWebsite from './pages/PublicWebsite';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <WorkspaceTabsProvider>
          <SettingsProvider>
            <AcademicYearProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/website" element={<PublicWebsite />} />
                <Route path="/about" element={<PublicWebsite />} />
                <Route path="/principal-message" element={<PublicWebsite />} />
                <Route path="/academics" element={<PublicWebsite />} />
                <Route path="/facilities" element={<PublicWebsite />} />
                <Route path="/teachers-public" element={<PublicWebsite />} />
                <Route path="/gallery" element={<PublicWebsite />} />
                <Route path="/notice-board" element={<PublicWebsite />} />
                <Route path="/admission" element={<PublicWebsite />} />
                <Route path="/result-verification" element={<PublicWebsite />} />
                <Route path="/contact" element={<PublicWebsite />} />
                <Route path="/" element={<PublicWebsite />} />
                <Route path="/class/*" element={<Navigate to="/classes" replace />} />
                <Route path="/Class/*" element={<Navigate to="/classes" replace />} />
                <Route path="/*" element={<WorkspaceRoutes />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <NotificationViewport />
            </AcademicYearProvider>
          </SettingsProvider>
        </WorkspaceTabsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
