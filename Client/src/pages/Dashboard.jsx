import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  BookOpen,
  PlusCircle,
  ClipboardList,
  TrendingUp,
  Award,
  ArrowRight,
  GraduationCap,
  Calendar,
  Settings,
} from 'lucide-react';
import { studentAPI, examAPI, marksheetAPI, academicYearAPI } from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, icon: Icon, gradient, loading }) => (
  <div className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${gradient}`}>
    <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
      <Icon size={96} className="absolute -top-6 -right-6" />
    </div>
    <div className="relative z-10">
      <p className="text-white/80 text-sm font-medium uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="h-10 w-20 bg-white/20 animate-pulse rounded-lg mt-2" />
      ) : (
        <p className="text-4xl font-black mt-2">{value}</p>
      )}
    </div>
    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30"></div>
  </div>
);

const QuickAction = ({ to, icon: Icon, label, description, gradient }) => (
  <Link
    to={to}
    className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`}></div>
    <div className="relative z-10">
      <div className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} className="text-white" />
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{label}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
    <div className="absolute bottom-0 right-0 w-20 h-20 opacity-5">
      <Icon size={80} className="absolute -bottom-4 -right-4 text-gray-400" />
    </div>
  </Link>
);

const Dashboard = () => {
  const { admin } = useAuth();
  const [stats, setStats] = useState({ students: 0, exams: 0, marksheets: 0, academicYears: 0 });
  const [recentMarksheets, setRecentMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!admin) {
      return;
    }

    const fetchData = async () => {
      try {
        const [studentsRes, examsRes, marksheetsRes, academicYearsRes] = await Promise.allSettled([
          studentAPI.getAll(),
          examAPI.getAll(),
          marksheetAPI.getAll(),
          academicYearAPI.getAll(),
        ]);

        const students =
          studentsRes.status === 'fulfilled'
            ? studentsRes.value.data?.students || studentsRes.value.data || []
            : [];
        const exams =
          examsRes.status === 'fulfilled'
            ? examsRes.value.data?.exams || examsRes.value.data || []
            : [];
        const marksheets =
          marksheetsRes.status === 'fulfilled'
            ? marksheetsRes.value.data?.marksheets || marksheetsRes.value.data || []
            : [];
        const academicYears =
          academicYearsRes.status === 'fulfilled'
            ? academicYearsRes.value.data?.academicYears || academicYearsRes.value.data || []
            : [];

        setStats({
          students: students.length,
          exams: exams.length,
          marksheets: marksheets.length,
          academicYears: academicYears.length,
        });

        setRecentMarksheets(marksheets.slice(0, 5));

        // Check for specific errors
        let errorMessage = '';
        if (studentsRes.status === 'rejected' && studentsRes.reason?.response?.data?.message?.includes('active academic year')) {
          errorMessage = 'No active academic year set. Please create and activate an academic year in Settings.';
        } else if (
          studentsRes.status === 'rejected' ||
          examsRes.status === 'rejected' ||
          marksheetsRes.status === 'rejected' ||
          academicYearsRes.status === 'rejected'
        ) {
          errorMessage = 'Some dashboard data could not be loaded. Please check your settings.';
        }
        setError(errorMessage);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [admin]);

  const gradeColor = (grade) => {
    const map = { 'A+': 'text-emerald-600 bg-emerald-50', A: 'text-green-600 bg-green-50', B: 'text-blue-600 bg-blue-50', C: 'text-yellow-600 bg-yellow-50', D: 'text-orange-600 bg-orange-50', F: 'text-red-600 bg-red-50' };
    return map[grade] || 'text-gray-600 bg-gray-100';
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <GraduationCap size={18} className="text-indigo-600" />
            </div>
            <p className="text-gray-500 text-sm">{greeting}, <span className="font-semibold text-gray-700">{admin?.name || 'Admin'}</span></p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening in your school today.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            label="Total Students" 
            value={stats.students} 
            icon={Users} 
            gradient="bg-gradient-to-br from-purple-500 to-pink-500" 
            loading={loading} 
          />
          <StatCard 
            label="Total Exams" 
            value={stats.exams} 
            icon={BookOpen} 
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500" 
            loading={loading} 
          />
          <StatCard 
            label="Marksheets" 
            value={stats.marksheets} 
            icon={FileText} 
            gradient="bg-gradient-to-br from-emerald-500 to-teal-500" 
            loading={loading} 
          />
          <StatCard 
            label="Academic Years" 
            value={stats.academicYears} 
            icon={Calendar} 
            gradient="bg-gradient-to-br from-orange-500 to-red-500" 
            loading={loading} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <QuickAction 
                to="/academic-years" 
                icon={Calendar} 
                label="Academic Years" 
                description="Manage academic sessions" 
                gradient="bg-gradient-to-r from-indigo-500 to-purple-600" 
              />
              <QuickAction 
                to="/students/add" 
                icon={PlusCircle} 
                label="Add New Student" 
                description="Register a student" 
                gradient="bg-gradient-to-r from-emerald-500 to-teal-600" 
              />
              <QuickAction 
                to="/students" 
                icon={Users} 
                label="Manage Students" 
                description="View & edit students" 
                gradient="bg-gradient-to-r from-blue-500 to-cyan-600" 
              />
              <QuickAction 
                to="/exams/add" 
                icon={PlusCircle} 
                label="Create Exam" 
                description="Set up a new exam" 
                gradient="bg-gradient-to-r from-pink-500 to-rose-600" 
              />
              <QuickAction 
                to="/marks-entry" 
                icon={ClipboardList} 
                label="Enter Marks" 
                description="Record student marks" 
                gradient="bg-gradient-to-r from-amber-500 to-orange-600" 
              />
              <QuickAction 
                to="/promotion" 
                icon={TrendingUp} 
                label="Promote Students" 
                description="Promote to next class" 
                gradient="bg-gradient-to-r from-violet-500 to-purple-600" 
              />
              <QuickAction 
                to="/settings" 
                icon={Settings} 
                label="School Settings" 
                description="Name, logo, address & signature" 
                gradient="bg-gradient-to-r from-slate-500 to-gray-600" 
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">Recent Marksheets</h2>
              <Link to="/marksheets" className="text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentMarksheets.length === 0 ? (
                <div className="p-10 text-center">
                  <Award size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No marksheets yet.</p>
                  <Link to="/marks-entry" className="mt-3 inline-block text-indigo-600 text-sm font-medium hover:underline">
                    Enter marks →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recentMarksheets.map((ms) => (
                        <tr key={ms._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                                {ms.student?.name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{ms.student?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{ms.student?.className || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">{ms.exam?.examName || ''}</td>
                          <td className="px-5 py-3.5 font-semibold text-gray-700">{ms.percentage?.toFixed(1)}%</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${gradeColor(ms.finalGrade || ms.grade)}`}>
                              {ms.finalGrade || ms.grade}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ms.result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {ms.result}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
