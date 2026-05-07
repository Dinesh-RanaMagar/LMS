import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI, academicYearAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  Plus, Search, BookOpen, Trash2, Edit2, Eye,
  Lock, Unlock, CheckCircle, Clock, AlertCircle,
  Filter, X, ChevronDown,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXAM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'regular',  label: 'Regular' },
  { value: 'custom',   label: 'Custom' },
  { value: 'unit-test',label: 'Unit Test' },
  { value: 'practical',label: 'Practical' },
  { value: 're-exam',  label: 'Re-exam' },
  { value: 'internal', label: 'Internal' },
];

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  active:    { label: 'Active',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  locked:    { label: 'Locked',    color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
};

const TYPE_COLOR = {
  regular:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  custom:    'bg-violet-50 text-violet-700 border-violet-200',
  'unit-test':'bg-amber-50 text-amber-700 border-amber-200',
  practical: 'bg-teal-50 text-teal-700 border-teal-200',
  're-exam': 'bg-orange-50 text-orange-700 border-orange-200',
  internal:  'bg-pink-50 text-pink-700 border-pink-200',
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Confirm Modal ────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = true }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className={`w-12 h-12 ${danger ? 'bg-red-100' : 'bg-amber-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
        <AlertCircle size={22} className={danger ? 'text-red-500' : 'text-amber-500'} />
      </div>
      <h3 className="text-base font-bold text-gray-900 text-center mb-2">{title}</h3>
      <p className="text-gray-500 text-sm text-center mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition">Cancel</button>
        <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-xl text-sm font-medium transition`}>Confirm</button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Exams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active academic year
  const [activeYear, setActiveYear] = useState('');

  // Filters — year defaults to active year
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);

  useEffect(() => {
    fetchActiveYear();
  }, []);

  useEffect(() => {
    if (activeYear) fetchExams(activeYear);
  }, [activeYear]);

  const fetchActiveYear = async () => {
    try {
      const res = await academicYearAPI.getAll();
      const years = res.data.academicYears || res.data || [];
      const active = years.find(y => y.isActive);
      if (active) {
        setActiveYear(active.yearName);
        setFilterYear(active.yearName); // default filter to active year
        return;
      }
    } catch {
      // silently fail — exams will load once active year is available
    }

    // If no active year is found, still load exams with fallback behavior.
    fetchExams();
  };

  useEffect(() => {
    let result = exams;
    if (search)       result = result.filter(e => e.examName.toLowerCase().includes(search.toLowerCase()));
    if (filterYear)   result = result.filter(e => e.academicYear === filterYear);
    if (filterType)   result = result.filter(e => e.examType === filterType);
    if (filterStatus) result = result.filter(e => e.status === filterStatus);
    setFiltered(result);
  }, [exams, search, filterYear, filterType, filterStatus]);

  const fetchExams = async (year) => {
    try {
      setLoading(true);
      const params = {};
      if (year) params.academicYear = year;
      const res = await examAPI.getAll(params);
      setExams(res.data.exams || []);
    } catch {
      setError('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleDelete = async () => {
    try {
      await examAPI.delete(deleteTarget._id);
      setExams(prev => prev.filter(e => e._id !== deleteTarget._id));
      setDeleteTarget(null);
      flash('Exam deleted');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete exam');
      setDeleteTarget(null);
    }
  };

  const handleLock = async () => {
    try {
      const res = await examAPI.lock(lockTarget._id);
      setExams(prev => prev.map(e => e._id === lockTarget._id ? res.data.exam : e));
      setLockTarget(null);
      flash('Exam locked');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to lock exam');
      setLockTarget(null);
    }
  };

  const handleUnlock = async () => {
    try {
      const res = await examAPI.unlock(unlockTarget._id);
      setExams(prev => prev.map(e => e._id === unlockTarget._id ? res.data.exam : e));
      setUnlockTarget(null);
      flash('Exam unlocked');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unlock exam');
      setUnlockTarget(null);
    }
  };

  const handleStatusChange = async (examId, newStatus) => {
    try {
      const res = await examAPI.updateStatus(examId, newStatus);
      setExams(prev => prev.map(e => e._id === examId ? res.data.exam : e));
      flash(`Status updated to "${newStatus}"`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const activeFilters = [filterType, filterStatus].filter(Boolean).length;

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-400 text-sm">{filtered.length} exam{filtered.length !== 1 ? 's' : ''}</p>
              {activeYear && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Active Year: {activeYear}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/exams/create')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
          >
            <Plus size={18} /> Create Exam
          </button>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            {error} <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* ── Search + Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                placeholder="Search exams..."
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${showFilters || activeFilters > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={16} />
              Filters
              {activeFilters > 0 && <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center">{activeFilters}</span>}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          )}
        </div>


        {/* ── Exam Cards ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
            <BookOpen size={44} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No exams found</p>
            <button onClick={() => navigate('/exams/create')} className="mt-4 text-indigo-600 text-sm font-medium hover:underline">
              Create your first exam →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(exam => (
              <ExamCard
                key={exam._id}
                exam={exam}
                onEdit={() => navigate(`/exams/edit/${exam._id}`)}
                onView={() => navigate(`/exams/${exam._id}`)}
                onMarkSetup={() => navigate(`/exams/${exam._id}/mark-setup`)}
                onDelete={() => setDeleteTarget(exam)}
                onLock={() => setLockTarget(exam)}
                onUnlock={() => setUnlockTarget(exam)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Exam?"
          message={`"${deleteTarget.examName}" will be permanently deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {lockTarget && (
        <ConfirmModal
          title="Lock Exam?"
          message="Locked exams cannot be edited or accept new marks."
          onConfirm={handleLock}
          onCancel={() => setLockTarget(null)}
          danger={false}
        />
      )}
      {unlockTarget && (
        <ConfirmModal
          title="Unlock Exam?"
          message="This will set the exam back to Active status."
          onConfirm={handleUnlock}
          onCancel={() => setUnlockTarget(null)}
          danger={false}
        />
      )}
    </Layout>
  );
};

// ─── Exam Card ────────────────────────────────────────────────────────────────
const ExamCard = ({ exam, onEdit, onView, onMarkSetup, onDelete, onLock, onUnlock, onStatusChange }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const typeClass = TYPE_COLOR[exam.examType] || TYPE_COLOR.regular;
  const isLocked = exam.status === 'locked';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Top accent bar */}
      <div className={`h-1 w-full ${exam.isFinalExam ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${typeClass}`}>
                {exam.examType?.replace('-', ' ').toUpperCase()}
              </span>
              {exam.isFinalExam && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  FINAL
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{exam.examName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Academic Year: {exam.academicYear}</p>
          </div>
          <StatusBadge status={exam.status} />
        </div>

        {/* Classes */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(exam.applicableClasses || []).slice(0, 5).map(cls => (
            <span key={cls} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium">{cls}</span>
          ))}
          {(exam.applicableClasses || []).length > 5 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
              +{exam.applicableClasses.length - 5} more
            </span>
          )}
        </div>

        {/* Dates */}
        {(exam.startDate || exam.endDate) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            <Clock size={12} />
            {exam.startDate && new Date(exam.startDate).toLocaleDateString()}
            {exam.startDate && exam.endDate && ' → '}
            {exam.endDate && new Date(exam.endDate).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-gray-50">
          <button onClick={onView} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition text-xs font-semibold">
            <Eye size={14} /> View
          </button>
          <button onClick={onMarkSetup} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-600 transition text-xs font-semibold">
            <BookOpen size={14} /> Setup
          </button>
          {!isLocked && (
            <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition text-xs font-semibold">
              <Edit2 size={14} /> Edit
            </button>
          )}
          {isLocked ? (
            <button onClick={onUnlock} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition text-xs font-semibold">
              <Unlock size={14} /> Unlock
            </button>
          ) : (
            <button onClick={onLock} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition text-xs font-semibold">
              <Lock size={14} /> Lock
            </button>
          )}

          {/* Status quick-change */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition"
            >
              <ChevronDown size={14} />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden">
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <button
                    key={val}
                    onClick={() => { onStatusChange(exam._id, val); setShowStatusMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition flex items-center gap-2 ${exam.status === val ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
                  </button>
                ))}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => { onDelete(); setShowStatusMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exams;
