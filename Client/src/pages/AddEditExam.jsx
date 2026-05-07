import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examAPI, subjectAPI } from '../services/api';
import Layout from '../components/Layout';
import { ArrowLeft, Plus, Trash2, BookOpen, AlertCircle, ChevronDown } from 'lucide-react';

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition';

const AddEditExam = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    examName: '',
    className: '',
    year: new Date().getFullYear().toString(),
    subjects: [],
  });

  // All subjects from backend (global list, no class)
  const [allSubjects, setAllSubjects] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchAllSubjects();
    if (isEdit) fetchExam();
  }, []);

  const fetchAllSubjects = async () => {
    try {
      const res = await subjectAPI.getAll();
      setAllSubjects(res.data.subjects || []);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const fetchExam = async () => {
    try {
      const res = await examAPI.getById(id);
      setFormData(res.data.exam);
    } catch {
      setError('Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Add a subject from the global list into the exam
  const addSubject = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        { subjectName: subject.subjectName, fullMarks: 100, passMarks: 40 },
      ],
    }));
    setShowDropdown(false);
  };

  const removeSubject = (index) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index),
    }));
  };

  const handleSubjectField = (index, field, value) => {
    const updated = [...formData.subjects];
    updated[index] = {
      ...updated[index],
      [field]: Number(value),
    };
    setFormData(prev => ({ ...prev, subjects: updated }));
  };

  // Subjects not yet added to this exam
  const unusedSubjects = allSubjects.filter(
    s => !formData.subjects.some(fs => fs.subjectName === s.subjectName)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.examName || !formData.className || !formData.year)
      return setError('Exam name, class, and year are required');
    if (formData.subjects.length === 0)
      return setError('Add at least one subject');
    if (!formData.subjects.every(s => s.subjectName && s.fullMarks > 0 && s.passMarks >= 0))
      return setError('All subjects need a name, full marks, and pass marks');

    setSubmitting(true);
    try {
      if (isEdit) {
        await examAPI.update(id, formData);
      } else {
        await examAPI.create(formData);
      }
      navigate('/exams');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save exam');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">

        <button
          onClick={() => navigate('/exams')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition"
        >
          <ArrowLeft size={18} /> Back to Exams
        </button>

        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Exam' : 'Create New Exam'}
            </h1>
            <p className="text-gray-400 text-sm">
              Fill exam details, then pick subjects from your subject list
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Exam Details ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Exam Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Exam Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="examName"
                    value={formData.examName}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g., Final Exam"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g., Grade 10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="2025"
                    required
                  />
                </div>
              </div>
            </div>

            {/* ── Subjects ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subjects</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formData.subjects.length} subject{formData.subjects.length !== 1 ? 's' : ''} added
                  </p>
                </div>

                {/* Add subject dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(v => !v)}
                    disabled={unusedSubjects.length === 0}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-100 transition text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Add Subject
                    <ChevronDown size={13} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showDropdown && unusedSubjects.length > 0 && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[200px] max-h-60 overflow-y-auto">
                      <p className="px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-100 sticky top-0 bg-white">
                        Select a subject
                      </p>
                      {unusedSubjects.map(s => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => addSubject(s)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-between gap-2"
                        >
                          <span>{s.subjectName}</span>
                          {s.code && <span className="text-xs text-gray-400">{s.code}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* No subjects in global list */}
              {allSubjects.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No subjects defined yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/subjects')}
                    className="mt-2 text-indigo-600 text-sm font-medium hover:underline"
                  >
                    Go to Subjects page to add them →
                  </button>
                </div>
              )}

              {/* Subjects added to exam */}
              {allSubjects.length > 0 && formData.subjects.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No subjects added yet. Click <span className="font-semibold text-indigo-600">"Add Subject"</span> to pick from your list.
                </div>
              )}

              {formData.subjects.length > 0 && (
                <div className="space-y-3">
                  {formData.subjects.map((subject, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {index + 1}
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{subject.subjectName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSubject(index)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Full Marks <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={subject.fullMarks}
                            onChange={e => handleSubjectField(index, 'fullMarks', e.target.value)}
                            className={inputClass}
                            min="1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Pass Marks <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={subject.passMarks}
                            onChange={e => handleSubjectField(index, 'passMarks', e.target.value)}
                            className={inputClass}
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Actions ── */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || formData.subjects.length === 0}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                ) : isEdit ? 'Update Exam' : 'Create Exam'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/exams')}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default AddEditExam;
