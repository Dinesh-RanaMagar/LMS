import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useWorkspaceTabs } from '../context/WorkspaceTabsContext';
import { isWorkspacePath } from '../context/workspaceTabsUtils';

import Dashboard from '../pages/Dashboard';
import Subjects from '../pages/Subjects';
import Students from '../pages/Students';
import AddEditStudent from '../pages/AddEditStudent';
import BulkImportStudents from '../pages/BulkImportStudents';
import Classes from '../pages/Classes';
import Exams from '../pages/Exams';
import CreateExam from '../pages/CreateExam';
import EditExam from '../pages/EditExam';
import ExamDetail from '../pages/ExamDetail';
import ExamMarkSetup from '../pages/ExamMarkSetup';
import MarksEntry from '../pages/MarksEntry';
import Marksheets from '../pages/Marksheets';
import TabulationReport from '../pages/TabulationReport';
import AcademicYears from '../pages/AcademicYears';
import Promotion from '../pages/Promotion';
import Teachers from '../pages/Teachers';
import Attendance from '../pages/Attendance';
import EvaluationDashboard from '../pages/EvaluationDashboard';
import Notices from '../pages/Notices';
import Settings from '../pages/Settings';

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

const WorkspaceRoutes = () => {
  const { tabs, activePath } = useWorkspaceTabs();
  const location = useLocation();

  if (!isWorkspacePath(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return tabs.map((tab) => (
    <div key={tab.path} hidden={tab.path !== activePath}>
      <Routes location={tab.location}>
        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/subjects" element={<P><Subjects /></P>} />
        <Route path="/students" element={<P><Students /></P>} />
        <Route path="/students/add" element={<P><AddEditStudent /></P>} />
        <Route path="/students/import" element={<P><BulkImportStudents /></P>} />
        <Route path="/students/edit/:id" element={<P><AddEditStudent /></P>} />
        <Route path="/exams" element={<P><Exams /></P>} />
        <Route path="/exams/create" element={<P><CreateExam /></P>} />
        <Route path="/exams/:id/mark-setup" element={<P><ExamMarkSetup /></P>} />
        <Route path="/exams/edit/:id" element={<P><EditExam /></P>} />
        <Route path="/exams/:id" element={<P><ExamDetail /></P>} />
        <Route path="/marks-entry" element={<P><MarksEntry /></P>} />
        <Route path="/marksheets" element={<P><Marksheets /></P>} />
        <Route path="/reports/tabulation" element={<P><TabulationReport /></P>} />
        <Route path="/evaluation" element={<P><EvaluationDashboard /></P>} />
        <Route path="/academic-years" element={<P><AcademicYears /></P>} />
        <Route path="/promotion" element={<P><Promotion /></P>} />
        <Route path="/teachers" element={<P><Teachers /></P>} />
        <Route path="/attendance" element={<P><Attendance /></P>} />
        <Route path="/notices" element={<P><Notices /></P>} />
        <Route path="/settings" element={<P><Settings /></P>} />
        <Route path="/classes/*" element={<P><Classes /></P>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  ));
};

export default WorkspaceRoutes;
