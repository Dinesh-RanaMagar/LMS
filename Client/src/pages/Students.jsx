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
        {/* Header with Visual Elements */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-8 mb-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <Users size={256} className="absolute -top-16 -right-16" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black mb-2">Students Management</h1>
                <p className="text-white/80 text-lg">{students.length} students enrolled in {selectedAcademicYear || activeAcademicYear}</p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-white/90">Active Session</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-sm text-white/90">Live Data</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/students/import')}
                  className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition font-medium border border-white/30"
                >
                  <Upload size={20} />
                  Import Excel
                </button>
                <button
                  onClick={() => navigate('/students/add')}
                  className="flex items-center justify-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-2xl hover:bg-white/90 transition font-bold shadow-lg"
                >
                  <Plus size={20} />
                  Add Student
                </button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400"></div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}

        {/* Filters with Card Design */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Search size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Search & Filter Students</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white transition-all"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white transition-all"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white transition-all"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm bg-gray-50 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

        {/* Students Grid/Cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animate-reverse" style={{animationDelay: '0.5s'}} />
            </div>
          </div>
        ) : (
          <>
            {filteredStudents.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl py-20 text-center border-2 border-dashed border-gray-300">
                <div className="w-24 h-24 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users size={48} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">No students found</h3>
                <p className="text-gray-500 mb-6">Start by adding your first student to the system</p>
                <button
                  onClick={() => navigate('/students/add')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-2xl font-bold hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105"
                >
                  Add First Student →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2"
                  >
                    <div className="relative p-6">
                      {/* Student Avatar */}
                      <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg">
                            {student.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="text-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{student.name}</h3>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                            {student.className}
                          </span>
                          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                            Sec {student.section}
                          </span>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-2xl inline-block font-bold text-sm">
                          Roll #{student.rollNo}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Father's Name:</span>
                          <span className="font-medium text-gray-700">{student.fatherName || '—'}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/students/edit/${student._id}`)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-2xl font-bold hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(student._id)}
                          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 rounded-2xl font-bold hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
                      <Users size={64} className="absolute -top-4 -right-4 text-indigo-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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

