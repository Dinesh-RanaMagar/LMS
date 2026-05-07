import React, { useState, useEffect } from 'react';
import { subjectAPI } from '../services/api';
import Layout from '../components/Layout';
import { Plus, Trash2, Edit2, Search, BookMarked, X, Check } from 'lucide-react';

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50 focus:bg-white transition';

const emptyForm = { subjectName: '', code: '', description: '' };

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchSubjects(); }, []);

  useEffect(() => {
    if (!searchTerm) return setFiltered(subjects);
    setFiltered(subjects.filter(s =>
      s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
    ));
  }, [subjects, searchTerm]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await subjectAPI.getAll();
      setSubjects(res.data.subjects || []);
    } catch {
      setError('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (subject) => {
    setForm({
      subjectName: subject.subjectName,
      code: subject.code || '',
      description: subject.description || '',
    });
    setEditingId(subject._id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subjectName.trim()) return setError('Subject name is required');
    setSubmitting(true);
    setError('');
    try {
      if (editingId) {
        await subjectAPI.update(editingId, form);
        setSuccess('Subject updated');
      } else {
        await subjectAPI.create(form);
        setSuccess('Subject added');
      }
      setShowModal(false);
      fetchSubjects();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await subjectAPI.delete(id);
      setSubjects(prev => prev.filter(s => s._id !== id));
      setDeleteConfirm(null);
      setSuccess('Subject deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete subject');
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
            <p className="text-gray-400 text-sm mt-1">
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''} defined
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            <Plus size={18} /> Add Subject
          </button>
        </div>

        {/* Alerts */}
        {error && !showModal && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
              placeholder="Search by name or code..."
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <BookMarked size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No subjects yet</p>
            <button onClick={openAdd} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">
              Add your first subject →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map((subject, idx) => (
                <div
                  key={subject._id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Index badge */}
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{subject.subjectName}</p>
                      {subject.code && (
                        <p className="text-xs text-gray-400 mt-0.5">Code: {subject.code}</p>
                      )}
                      {subject.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{subject.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(subject)}
                      className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(subject._id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editingId ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.subjectName}
                  onChange={e => setForm(f => ({ ...f, subjectName: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g., Mathematics"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject Code <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g., MATH101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows="2"
                  className={inputClass}
                  placeholder="Short description..."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                    : editingId ? 'Update' : 'Add Subject'
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Subject?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">This will permanently remove the subject.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Subjects;
