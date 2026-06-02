import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, Calendar, Clock, Star, Zap, X } from 'lucide-react';
import { academicYearAPI } from '../services/api';
import Layout from '../components/Layout';

function AcademicYears() {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState({
    yearName: '',
    dateFormat: 'AD',
    startDate: '',
    endDate: '',
    nepaliStartDate: '',
    nepaliEndDate: '',
    isActive: false,
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearAPI.getAll();
      setAcademicYears(response.data?.academicYears || response.data || []);
    } catch (error) {
      console.error('Error fetching academic years:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingYear) {
        await academicYearAPI.update(editingYear._id, formData);
      } else {
        await academicYearAPI.create(formData);
      }
      setShowModal(false);
      resetForm();
      fetchAcademicYears();
    } catch (error) {
      console.error('Error saving academic year:', error);
    }
  };

  const handleSetActive = async (id) => {
    try {
      await academicYearAPI.setActive(id);
      fetchAcademicYears();
    } catch (error) {
      console.error('Error setting active year:', error);
    }
  };

  const handleEdit = (year) => {
    setEditingYear(year);
    setFormData({
      yearName: year.yearName,
      dateFormat: year.dateFormat || 'AD',
      startDate: year.startDate ? year.startDate.split('T')[0] : '',
      endDate: year.endDate ? year.endDate.split('T')[0] : '',
      nepaliStartDate: year.nepaliStartDate || '',
      nepaliEndDate: year.nepaliEndDate || '',
      isActive: year.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this academic year?')) {
      try {
        await academicYearAPI.delete(id);
        fetchAcademicYears();
      } catch (error) {
        console.error('Error deleting academic year:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingYear(null);
    setFormData({
      yearName: '',
      dateFormat: 'AD',
      startDate: '',
      endDate: '',
      nepaliStartDate: '',
      nepaliEndDate: '',
      isActive: false,
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-pink-600 rounded-full animate-spin animate-reverse" style={{animationDelay: '0.5s'}} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M20%2020c0-5.5-4.5-10-10-10s-10%204.5-10%2010%204.5%2010%2010%2010%2010-4.5%2010-10zm10%200c0-5.5-4.5-10-10-10s-10%204.5-10%2010%204.5%2010%2010%2010%2010-4.5%2010-10z%22/%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm shadow-2xl">
                  <Calendar size={40} className="text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-black mb-2">Academic Years</h1>
                  <p className="text-purple-100 text-xl">Manage your school's academic timeline</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-white/90">Timeline Management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <span className="text-sm text-white/90">Active Session Tracking</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-3xl hover:bg-white/30 transition font-bold text-lg border border-white/30 shadow-2xl hover:scale-105 transform"
              >
                <Plus size={24} className="inline mr-2" />
                Add Academic Year
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          {/* Timeline Layout */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-pink-400 to-indigo-400 rounded-full"></div>
            
            <div className="space-y-8">
              {academicYears.map((year, index) => (
                <div key={year._id} className="relative flex items-start gap-8">
                  {/* Timeline Node */}
                  <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl ${
                    year.isActive 
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500' 
                      : 'bg-gradient-to-br from-gray-300 to-gray-400'
                  }`}>
                    {year.isActive ? (
                      <Star size={24} className="text-white" />
                    ) : (
                      <Calendar size={24} className="text-white" />
                    )}
                    {year.isActive && (
                      <div className="absolute -inset-2 bg-emerald-400 rounded-full animate-ping opacity-30"></div>
                    )}
                  </div>

                  {/* Year Card */}
                  <div className={`flex-1 group ${
                    year.isActive 
                      ? 'bg-gradient-to-br from-white to-emerald-50 border-2 border-emerald-200 shadow-2xl' 
                      : 'bg-white border border-gray-200 shadow-lg hover:shadow-xl'
                  } rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2`}>
                    
                    {/* Active Badge */}
                    {year.isActive && (
                      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-2xl font-bold text-sm shadow-lg">
                        <Zap size={16} className="inline mr-1" />
                        ACTIVE
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-3xl font-black mb-2 ${
                          year.isActive ? 'text-emerald-700' : 'text-gray-800'
                        }`}>
                          {year.yearName}
                        </h3>
                        
                        <div className="flex items-center gap-6 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Clock size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">DATE FORMAT</p>
                                <p className="font-bold text-gray-800">{year.dateFormat || 'AD'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Calendar size={16} className="text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 font-medium">DATES</p>
                                {year.dateFormat === 'BS' ? (
                                  <>
                                    <p className="font-bold text-gray-800">{year.nepaliStartDate || 'N/A'} → {year.nepaliEndDate || 'N/A'}</p>
                                  </>
                                ) : (
                                  <p className="font-bold text-gray-800">{year.startDate ? new Date(year.startDate).toLocaleDateString() : 'N/A'} → {year.endDate ? new Date(year.endDate).toLocaleDateString() : 'N/A'}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-6">
                        {!year.isActive && (
                          <button
                            onClick={() => handleSetActive(year._id)}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all transform hover:scale-110 shadow-lg"
                            title="Set as Active"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(year)}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-110 shadow-lg"
                          title="Edit"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(year._id)}
                          className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-3 rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-110 shadow-lg"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {academicYears.length === 0 && (
            <div className="text-center py-20">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full flex items-center justify-center mx-auto mb-8">
                <Calendar size={64} className="text-purple-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-700 mb-4">No Academic Years Yet</h3>
              <p className="text-gray-500 text-lg mb-8">Create your first academic year to get started</p>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-3xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-2xl"
              >
                <Plus size={24} className="inline mr-2" />
                Create First Academic Year
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl transform animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <Calendar size={24} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Year Name</label>
                  <input
                    type="text"
                    required
                    value={formData.yearName}
                    onChange={(e) => setFormData({ ...formData, yearName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="e.g., 2082-2083"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dateFormat"
                      value="AD"
                      checked={formData.dateFormat === 'AD'}
                      onChange={() => setFormData({
                        ...formData,
                        dateFormat: 'AD',
                        nepaliStartDate: '',
                        nepaliEndDate: '',
                      })}
                      className="w-4 h-4 text-purple-600 border-gray-300"
                    />
                    <span className="text-sm font-semibold text-gray-700">AD (English) format</span>
                  </label>
                  <label className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 cursor-pointer">
                    <input
                      type="radio"
                      name="dateFormat"
                      value="BS"
                      checked={formData.dateFormat === 'BS'}
                      onChange={() => setFormData({
                        ...formData,
                        dateFormat: 'BS',
                        startDate: '',
                        endDate: '',
                      })}
                      className="w-4 h-4 text-purple-600 border-gray-300"
                    />
                    <span className="text-sm font-semibold text-gray-700">BS (Nepali) format</span>
                  </label>
                </div>

                {formData.dateFormat === 'AD' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Start Date (English)</label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">End Date (English)</label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Start Date (Nepali)</label>
                      <input
                        type="text"
                        required
                        value={formData.nepaliStartDate}
                        onChange={(e) => setFormData({ ...formData, nepaliStartDate: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-all"
                        placeholder="e.g. 2080-01-01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">End Date (Nepali)</label>
                      <input
                        type="text"
                        required
                        value={formData.nepaliEndDate}
                        onChange={(e) => setFormData({ ...formData, nepaliEndDate: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-purple-500 transition-all"
                        placeholder="e.g. 2081-12-30"
                      />
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="font-bold text-gray-700">Set as Active Academic Year</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1 ml-8">Only one academic year can be active at a time</p>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-2xl hover:bg-gray-50 font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 font-bold transition-all transform hover:scale-105 shadow-lg"
                  >
                    {editingYear ? 'Update Year' : 'Create Year'}
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

export default AcademicYears;