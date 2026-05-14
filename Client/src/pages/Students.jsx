import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { academicYearAPI, classAPI, studentAPI } from '../services/api';
import Layout from '../components/Layout';
import { Edit2, Trash2, Plus, Search, Users, X, Upload } from 'lucide-react';

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [activeAcademicYear, setActiveAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchData(); }, [selectedAcademicYear]);
  useEffect(() => { filterStudents(); }, [students, searchTerm, filterClass, filterSection]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentResponse, classResponse, yearResponse] = await Promise.all([
        studentAPI.getAll(selectedAcademicYear ? { academicYear: selectedAcademicYear } : undefined),
        classAPI.getAll(),
        academicYearAPI.getAll(),
      ]);
      setStudents(studentResponse.data?.students || studentResponse.data || []);
      setClasses(classResponse.data?.classes || classResponse.data || []);
      setAcademicYears(yearResponse.data?.academicYears || yearResponse.data || []);
      setActiveAcademicYear(studentResponse.data?.activeAcademicYear || '');
      setSelectedAcademicYear((current) => current || studentResponse.data?.selectedAcademicYear || studentResponse.data?.activeAcademicYear || '');
    } catch (err) {
      setError('Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;
    if (searchTerm) {
      const rawQuery = searchTerm.trim();
      const query = rawQuery.toLowerCase();
      const isNumericQuery = /^\d+$/.test(rawQuery);
      filtered = filtered.filter(
        (s) =>
          (isNumericQuery && String(s.rollNo || '') === rawQuery) ||
          (!isNumericQuery && (
          String(s.name || '').toLowerCase().includes(query) ||
          String(s.studentCode || '').toLowerCase().includes(query) ||
          String(s.emisCode || '').toLowerCase().includes(query)
          ))
      );
    }
    if (filterClass) filtered = filtered.filter((s) => s.className === filterClass);
    if (filterSection) filtered = filtered.filter((s) => s.section === filterSection);
    setFilteredStudents(filtered);
  };

  const handleDelete = async (id) => {
    try {
      await studentAPI.delete(id);
      setStudents(students.filter((s) => s._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete student');
    }
  };

  const selectedClass = classes.find((cls) => cls.className === filterClass);
  const sectionOptions = (selectedClass?.sections || []).filter(Boolean);

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-400 text-sm mt-1">{students.length} total students enrolled in {selectedAcademicYear || activeAcademicYear}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/students/import')}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition font-medium text-sm shadow-sm"
            >
              <Upload size={18} />
              Import Excel
            </button>
            <button
              onClick={() => navigate('/students/add')}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
            >
              <Plus size={18} />
              Add Student
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                placeholder="Search by name or roll no..."
              />
            </div>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                setFilterClass('');
                setFilterSection('');
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
            >
              <option value="">Active Academic Year</option>
              {academicYears.map((year) => (
                <option key={year._id || year.yearName} value={year.yearName}>{year.yearName}{year.isActive ? ' (Active)' : ''}</option>
              ))}
            </select>
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setFilterSection('');
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls.className}>{cls.className}</option>
              ))}
            </select>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              disabled={!filterClass || sectionOptions.length === 0}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">
                {!filterClass
                  ? 'Select class first'
                  : sectionOptions.length === 0
                    ? 'No sections'
                    : 'All Sections'}
              </option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No students found</p>
                <button
                  onClick={() => navigate('/students/add')}
                  className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
                >
                  Add your first student →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Student', 'Class', 'Section', 'Roll No', "Father's Name", 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                              {student.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{student.className}</td>
                        <td className="px-5 py-3.5 text-gray-600">{student.section}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">{student.rollNo}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{student.fatherName || '—'}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/students/edit/${student._id}`)}
                              className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(student._id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Student?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">This action cannot be undone. The student record will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Students;

