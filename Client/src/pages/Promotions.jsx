import React, { useState, useEffect } from 'react';
import { TrendingUp, History, User, GraduationCap, ArrowRight } from 'lucide-react';
import { studentAPI, academicYearAPI, promotionAPI, examAPI, marksheetAPI } from '../services/api';
import Layout from '../components/Layout';

function Promotions() {
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    toAcademicYear: '',
    toClass: '',
    newRollNo: '',
    newSection: '',
    remarks: '',
  });
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [activeAcademicYear, setActiveAcademicYear] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchPromotionHistory();
  }, [filterAcademicYear]);

  const fetchData = async () => {
    try {
      const [yearsRes] = await Promise.all([
        academicYearAPI.getAll(),
      ]);
      const years = yearsRes.data?.academicYears || yearsRes.data || [];
      setAcademicYears(years);
      const activeYear = years.find(y => y.isActive);
      setActiveAcademicYear(activeYear);
      if (activeYear) {
        setFilterAcademicYear(activeYear._id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!filterAcademicYear) return;
    try {
      const response = await studentAPI.getAll({ academicYear: filterAcademicYear, status: 'active' });
      setStudents(response.data?.students || response.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPromotionHistory = async () => {
    try {
      const response = await promotionAPI.getAllHistory();
      setPromotionHistory(response.data?.history || response.data || []);
    } catch (error) {
      console.error('Error fetching promotion history:', error);
    }
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await promotionAPI.promoteStudent({
        studentId: selectedStudent._id,
        ...formData,
      });
      setShowPromoteModal(false);
      setSelectedStudent(null);
      setFormData({
        toAcademicYear: '',
        toClass: '',
        newRollNo: '',
        newSection: '',
        remarks: '',
      });
      fetchStudents();
      fetchPromotionHistory();
    } catch (error) {
      console.error('Error promoting student:', error);
    }
  };

  const openPromoteModal = (student) => {
    setSelectedStudent(student);
    const nextYear = academicYears.find(y => 
      y.yearName === String(Number(student.academicYear?.yearName || 0) + 1)
    );
    setFormData({
      toAcademicYear: nextYear?._id || '',
      toClass: getNextClass(student.className),
      newRollNo: student.rollNo,
      newSection: student.section,
      remarks: '',
    });
    setShowPromoteModal(true);
  };

  const getNextClass = (currentClass) => {
    const match = currentClass.match(/Class (\d+)/);
    if (match) {
      return `Class ${Number(match[1]) + 1}`;
    }
    return currentClass;
  };

  const classes = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const sections = ['A', 'B', 'C', 'D'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Promotions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-lg font-semibold">Eligible Students for Promotion</h2>
          </div>
          
          <div className="mb-4">
            <select
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((year) => (
                <option key={year._id} value={year._id}>{year.yearName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {students.map((student) => (
              <div key={student._id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-500">
                      {student.className} - {student.section} (Roll: {student.rollNo})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openPromoteModal(student)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <GraduationCap size={16} />
                  Promote
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="text-purple-600" size={24} />
            <h2 className="text-lg font-semibold">Promotion History</h2>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {promotionHistory.map((record) => (
              <div key={record._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-gray-500" />
                  <span className="font-medium">{record.student?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{record.fromAcademicYear?.yearName}</span>
                  <span>{record.fromClass}</span>
                  <ArrowRight size={14} />
                  <span>{record.toAcademicYear?.yearName}</span>
                  <span>{record.toClass}</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    record.resultStatus === 'promoted' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.resultStatus.charAt(0).toUpperCase() + record.resultStatus.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(record.promotedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPromoteModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Promote Student</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="font-medium">{selectedStudent.name}</div>
              <div className="text-sm text-gray-500">
                Current: {selectedStudent.className} - {selectedStudent.section} ({selectedStudent.academicYear?.yearName})
              </div>
            </div>

            <form onSubmit={handlePromote}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Academic Year</label>
                <select
                  required
                  value={formData.toAcademicYear}
                  onChange={(e) => setFormData({ ...formData, toAcademicYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((year) => (
                    <option key={year._id} value={year._id}>{year.yearName}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">To Class</label>
                <select
                  required
                  value={formData.toClass}
                  onChange={(e) => setFormData({ ...formData, toClass: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Roll No</label>
                  <input
                    type="number"
                    required
                    value={formData.newRollNo}
                    onChange={(e) => setFormData({ ...formData, newRollNo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Section</label>
                  <select
                    required
                    value={formData.newSection}
                    onChange={(e) => setFormData({ ...formData, newSection: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Section</option>
                    {sections.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any remarks..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}

export default Promotions;
