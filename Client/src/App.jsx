import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Students from './pages/Students';
import AddEditStudent from './pages/AddEditStudent';
import BulkImportStudents from './pages/BulkImportStudents';
import Classes from './pages/Classes';

// Exam pages
import Exams from './pages/Exams';
import CreateExam from './pages/CreateExam';
import EditExam from './pages/EditExam';
import ExamDetail from './pages/ExamDetail';
import ExamMarkSetup from './pages/ExamMarkSetup';

import MarksEntry from './pages/MarksEntry';
import Marksheets from './pages/Marksheets';

// Academic Year and Promotion pages
import AcademicYears from './pages/AcademicYears';
import Promotion from './pages/Promotion';
import Teachers from './pages/Teachers';
import Attendance from './pages/Attendance';
import EvaluationDashboard from './pages/EvaluationDashboard';
import Notices from './pages/Notices';
import Settings from './pages/Settings';
import PublicWebsite from './pages/PublicWebsite';

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <AuthProvider>
        <SettingsProvider>
          <AcademicYearProvider>
            <Routes>
          <Route path="/login"    element={<Login />} />
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

          <Route path="/dashboard"          element={<P><Dashboard /></P>} />
          <Route path="/subjects"           element={<P><Subjects /></P>} />
          <Route path="/students"           element={<P><Students /></P>} />
          <Route path="/students/add"       element={<P><AddEditStudent /></P>} />
          <Route path="/students/import"    element={<P><BulkImportStudents /></P>} />
          <Route path="/students/edit/:id"  element={<P><AddEditStudent /></P>} />

          {/* Exam routes */}
          <Route path="/exams"              element={<P><Exams /></P>} />
          <Route path="/exams/create"       element={<P><CreateExam /></P>} />
          <Route path="/exams/:id/mark-setup" element={<P><ExamMarkSetup /></P>} />
          <Route path="/exams/:id"          element={<P><ExamDetail /></P>} />
          <Route path="/exams/edit/:id"     element={<P><EditExam /></P>} />

          <Route path="/marks-entry"        element={<P><MarksEntry /></P>} />
          <Route path="/marksheets"         element={<P><Marksheets /></P>} />
          <Route path="/evaluation"         element={<P><EvaluationDashboard /></P>} />

          {/* Academic Year and Promotion routes */}
          <Route path="/academic-years"     element={<P><AcademicYears /></P>} />
          <Route path="/promotion"           element={<P><Promotion /></P>} />
          <Route path="/teachers"            element={<P><Teachers /></P>} />
          <Route path="/attendance"          element={<P><Attendance /></P>} />
          <Route path="/notices"             element={<P><Notices /></P>} />
          <Route path="/settings"            element={<P><Settings /></P>} />

          <Route path="/class/*" element={<Navigate to="/classes" replace />} />
          <Route path="/Class/*" element={<Navigate to="/classes" replace />} />
          <Route path="/classes/*" element={<P><Classes /></P>} />
          <Route path="/"  element={<PublicWebsite />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AcademicYearProvider>
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
