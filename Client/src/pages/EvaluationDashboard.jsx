import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, ChevronDown, Download, FileText, Printer, BarChart3,
  Award, Target, User, Calendar, Hash,
  ArrowUp, ArrowDown, Minus, Zap, RefreshCw, CheckCircle2,
  LineChart, Activity, AlertTriangle, Trophy,
  Plus, Minus as MinusIcon, Type, Maximize2, Minimize2,
  BookOpen, TrendingUp, TrendingDown, Sparkles, ChevronRight,
} from 'lucide-react';
import { classAPI, evaluationAPI, examAPI, studentAPI } from '../services/api';
import { generateEvaluationPDF } from '../utils/pdfExport';
import { formatDecimal } from '../utils/numberFormat';

// ─── Constants ────────────────────────────────────────────────────────────────

const displayModes = [
  { key: 'percentage', label: 'Percentage', icon: BarChart3 },
  { key: 'gpa',        label: 'GPA',        icon: Target },
  { key: 'grade',      label: 'Grade',      icon: Award },
  { key: 'raw',        label: 'Raw Marks',  icon: Hash },
];

const markComponents = [
  { key: 'whole', label: 'Whole Marks' },
  { key: 'theory', label: 'TH Marks' },
];

const tabs = [
  { key: 'marksheet', label: 'Marksheet',  icon: FileText },
  { key: 'analysis',  label: 'Analysis',   icon: BarChart3 },
  { key: 'reports',   label: 'Reports',    icon: Download },
];

const exportOptions = [
  { key: 'pdf',   label: 'Export PDF',  icon: FileText },
  { key: 'excel', label: 'Export Excel', icon: Download },
  { key: 'print', label: 'Print',        icon: Printer },
];

const CHART_COLORS = [
  { bar: 'bg-indigo-500',  hex: '#6366f1' },
  { bar: 'bg-violet-500',  hex: '#8b5cf6' },
  { bar: 'bg-emerald-500', hex: '#10b981' },
  { bar: 'bg-amber-500',   hex: '#f59e0b' },
  { bar: 'bg-rose-500',    hex: '#f43f5e' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDisplayValue = (item, mode, markComponent = 'whole') => {
  if (!item) return '—';
  const theory = markComponent === 'theory';
  if (mode === 'raw')        return (theory ? item.theoryRaw : item.raw) ?? '—';
  if (mode === 'percentage') {
    const percentage = theory ? item.theoryPercentage : item.percentage;
    return percentage != null ? `${formatDecimal(percentage)}%` : '—';
  }
  if (mode === 'gpa') {
    const gpa = theory ? item.theoryGpa : item.gpa;
    return gpa != null ? formatDecimal(gpa) : '—';
  }
  if (mode === 'grade') return (theory ? item.theoryGrade : item.grade) || '—';
  return '—';
};

const getRawValue = (item, markComponent = 'whole') =>
  item ? (markComponent === 'theory' ? item.theoryRaw : item.raw) ?? null : null;

const getComponentResult = (item, markComponent = 'whole') =>
  markComponent === 'theory' ? item?.theoryResult : item?.result;

const getComponentGrade = (item, markComponent = 'whole') =>
  markComponent === 'theory' ? item?.theoryGrade : item?.grade;

const gradeConfig = {
  Failed: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  F:      { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  'A+': { text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'A':  { text: 'text-green-700',   bg: 'bg-green-50',    border: 'border-green-200',   dot: 'bg-green-500'   },
  'B+': { text: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    dot: 'bg-blue-500'    },
  'B':  { text: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  'C':  { text: 'text-yellow-700',  bg: 'bg-yellow-50',   border: 'border-yellow-200',  dot: 'bg-yellow-500'  },
  'D':  { text: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  dot: 'bg-orange-500'  },
};

const getGradeClasses = (grade) =>
  gradeConfig[grade] || { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' };

const getChangeIndicator = (change) => {
  if (change > 0)  return { icon: ArrowUp,   color: 'text-emerald-600', bg: 'bg-emerald-50',  ring: 'ring-emerald-200' };
  if (change < 0)  return { icon: ArrowDown,  color: 'text-red-500',    bg: 'bg-red-50',      ring: 'ring-red-200'     };
  return             { icon: Minus,     color: 'text-gray-400',   bg: 'bg-gray-100',    ring: 'ring-gray-200'    };
};

const fontSizes = {
  small:  { tableHeader: 'text-xs',  tableCell: 'text-sm',  subjectName: 'text-sm',  marks: 'text-sm',  grade: 'text-xs', iconSize: 'h-7 w-7',  iconText: 'text-xs' },
  medium: { tableHeader: 'text-sm',  tableCell: 'text-base',subjectName: 'text-base',marks: 'text-base',grade: 'text-sm', iconSize: 'h-9 w-9',  iconText: 'text-sm' },
  large:  { tableHeader: 'text-sm',  tableCell: 'text-lg',  subjectName: 'text-lg',  marks: 'text-lg',  grade: 'text-base',iconSize:'h-10 w-10',iconText: 'text-base'},
  xlarge: { tableHeader: 'text-base',tableCell: 'text-xl',  subjectName: 'text-xl',  marks: 'text-xl',  grade: 'text-lg', iconSize: 'h-12 w-12',iconText: 'text-lg' },
};

// ─── Mini badge chip ──────────────────────────────────────────────────────────
const GradeChip = ({ grade, size = 'sm' }) => {
  const cfg = getGradeClasses(grade);
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-bold ${sizeClass} ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {grade || 'N/A'}
    </span>
  );
};

// ─── Subject Performance Chart ────────────────────────────────────────────────
const SubjectPerformanceChart = ({ subjects, exams, markComponent }) => {
  const chartSubjects = subjects.filter((s) =>
    s.stats?.some((stat) => stat && Number.isFinite(Number(markComponent === 'theory' ? stat.theoryPercentage : stat.percentage)))
  );

  if (!chartSubjects.length) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-gray-400">
        No subject marks available for these exams.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {exams.map((exam, i) => (
          <div key={exam._id} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`h-2 w-2 rounded-sm flex-shrink-0 ${CHART_COLORS[i % CHART_COLORS.length].bar}`} />
            <span className="font-medium">{exam.examName}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="space-y-2.5">
        {chartSubjects.map((subject) => (
          <div key={subject.subject}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 truncate mr-3" title={subject.subject}>
                {subject.subject}
              </span>
            </div>
            <div className="space-y-1">
              {exams.map((exam, i) => {
                const pct    = markComponent === 'theory'
                  ? subject.stats?.[i]?.theoryPercentage
                  : subject.stats?.[i]?.percentage;
                const valid  = pct != null && Number.isFinite(Number(pct));
                const value  = valid ? Math.min(100, Math.max(0, Number(pct))) : 0;
                const color  = CHART_COLORS[i % CHART_COLORS.length];
                return (
                  <div key={exam._id} className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      {valid && (
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                          style={{ width: `${value}%` }}
                        />
                      )}
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs tabular-nums font-medium text-gray-500">
                      {valid ? `${formatDecimal(pct)}%` : 'N/A'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scale */}
      <div className="flex justify-between border-t border-gray-100 pt-1.5 text-xs text-gray-400">
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  );
};

// ─── GPA Trend Chart ──────────────────────────────────────────────────────────
const GpaTrendChart = ({ averages }) => {
  const data = (averages || []).map((item) => ({
    ...item,
    value: item.gpa == null || item.gpa === '' ? null : Number(item.gpa),
  }));
  const validData = data.some((d) => Number.isFinite(d.value));

  if (!validData) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-gray-400">
        No GPA data available for these exams.
      </p>
    );
  }

  const W      = 480;
  const H      = 180;
  const left   = 44;
  const right  = W - 20;
  const top    = 16;
  const bottom = 138;
  const plotW  = right - left;
  const plotH  = bottom - top;

  const points = data.map((item, i) => ({
    ...item,
    x: data.length > 1 ? left + (plotW * i) / (data.length - 1) : left + plotW / 2,
    y: Number.isFinite(item.value)
      ? bottom - (Math.min(4, Math.max(0, item.value)) / 4) * plotH
      : null,
  }));

  // Build smooth polyline path
  const linePoints = points.filter((p) => p.y != null);
  const polyline   = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Gradient area path
  let areaPath = '';
  if (linePoints.length >= 2) {
    areaPath = `M ${linePoints[0].x},${bottom} `;
    linePoints.forEach((p) => { areaPath += `L ${p.x},${p.y} `; });
    areaPath += `L ${linePoints[linePoints.length - 1].x},${bottom} Z`;
  }

  return (
    <div className="w-full">
      <svg
        role="img"
        aria-label="GPA trend across selected exams"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="auto"
        className="block"
      >
        <defs>
          <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"    />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = bottom - (tick / 4) * plotH;
          return (
            <g key={tick}>
              <line
                x1={left} x2={right} y1={y} y2={y}
                stroke={tick === 0 ? '#d1d5db' : '#e5e7eb'}
                strokeDasharray={tick === 0 ? undefined : '4 4'}
              />
              <text x={left - 10} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="11">
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#gpaGradient)" />}

        {/* Line */}
        {linePoints.length >= 2 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Points */}
        {points.map((p, i) => (
          <g key={p.examId || i}>
            {p.y != null && (
              <>
                <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#6366f1" strokeWidth="2.5">
                  <title>{`${p.examName}: ${formatDecimal(p.value)} GPA`}</title>
                </circle>
                <circle cx={p.x} cy={p.y} r="3" fill="#6366f1" />
                <text x={p.x} y={p.y - 13} textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="700">
                  {formatDecimal(p.value)}
                </text>
              </>
            )}
            <text x={p.x} y={bottom + 22} textAnchor="middle" fill="#6b7280" fontSize="11">
              {p.examName?.length > 14 ? `${p.examName.slice(0, 13)}…` : p.examName}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── Stat Card for Analysis tab ───────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, gradient, iconBg }) => (
  <div className="relative overflow-hidden rounded-xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-black tabular-nums ${gradient}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400 leading-snug">{sub}</p>}
      </div>
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${iconBg}`} />
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 ring-1 ring-indigo-100">
      <Icon className="h-9 w-9 text-indigo-300" />
    </div>
    <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
    <p className="max-w-xs text-sm text-gray-400 leading-relaxed">{description}</p>
  </div>
);

// ─── Step Indicator (used in empty state header) ──────────────────────────────
const StepBadge = ({ n, label, done }) => (
  <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border ${done ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</span>
    {label}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EvaluationDashboard = () => {
  const evaluationRef = useRef(null);

  // Data
  const [classes,  setClasses]  = useState([]);
  const [students, setStudents] = useState([]);
  const [exams,    setExams]    = useState([]);

  // Selections
  const [selectedClass,     setSelectedClass]     = useState('');
  const [selectedSection,   setSelectedSection]   = useState('');
  const [searchTerm,        setSearchTerm]        = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedExamIds,   setSelectedExamIds]   = useState([]);
  const [markComponent,     setMarkComponent]     = useState('whole');
  const [displayMode,       setDisplayMode]       = useState('percentage');

  // UI
  const [activeTab,           setActiveTab]           = useState('marksheet');
  const [loading,             setLoading]             = useState(false);
  const [error,               setError]               = useState('');
  const [dashboard,           setDashboard]           = useState(null);
  const [isFullscreen,        setIsFullscreen]        = useState(false);
  const [fontSize,            setFontSize]            = useState('medium');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showTermDropdown,    setShowTermDropdown]    = useState(false);
  const [showExportDropdown,  setShowExportDropdown]  = useState(false);

  const fs = fontSizes[fontSize];

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const close = () => {
      setShowStudentDropdown(false);
      setShowTermDropdown(false);
      setShowExportDropdown(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === evaluationRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, eRes] = await Promise.all([classAPI.getAll(), examAPI.getAll()]);
        setClasses(cRes.data?.classes || cRes.data || []);
        setExams(eRes.data?.exams    || eRes.data    || []);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const params = { className: selectedClass };
        if (selectedSection) params.section = selectedSection;
        const res = await studentAPI.getAll(params);
        setStudents(res.data?.students || res.data || []);
      } catch (err) { console.error(err); setStudents([]); }
    };
    if (selectedClass) fetchStudents();
    else setStudents([]);
  }, [selectedClass, selectedSection]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() =>
    students
      .filter((s) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return s.name?.toLowerCase().includes(q)
          || String(s.rollNo   || '').includes(q)
          || String(s.symbolNo || '').includes(q);
      })
      .sort((a, b) => Number(a.rollNo || 99999) - Number(b.rollNo || 99999) || a.name.localeCompare(b.name)),
  [students, searchTerm]);

  const selectedStudent = useMemo(
    () => students.find((s) => s._id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const sectionOptions = useMemo(
    () => [...new Set(classes.find((c) => c.className === selectedClass)?.sections || [])],
    [classes, selectedClass]
  );

  const selectedExams = useMemo(
    () => selectedExamIds.map((id) => exams.find((e) => e._id === id)).filter(Boolean),
    [exams, selectedExamIds]
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleExam = (id) => {
    setSelectedExamIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setDashboard(null);
  };

  const generateAnalysis = async () => {
    setError('');
    if (!selectedStudent) { setError('Please select a student first.'); return; }
    if (selectedExamIds.length < 2) { setError('Please select at least two terms to compare.'); return; }
    setLoading(true);
    try {
      const res = await evaluationAPI.compare({ studentId: selectedStudent._id, examIds: selectedExamIds });
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load evaluation results.');
      setDashboard(null);
    } finally { setLoading(false); }
  };

  const exportToPDF = () => {
    if (!dashboard || !selectedStudent) { setError('Please generate analysis first.'); return; }
    generateEvaluationPDF(dashboard, selectedStudent, selectedExams, displayMode, markComponent);
  };
  const exportToExcel = () => console.log('Excel export to be implemented');
  const handleExport  = (type) => {
    setShowExportDropdown(false);
    if      (type === 'pdf')   exportToPDF();
    else if (type === 'excel') exportToExcel();
    else if (type === 'print') window.print();
  };

  const toggleFullscreen = async () => {
    setError('');
    try {
      if (document.fullscreenElement === evaluationRef.current) await document.exitFullscreen();
      else await evaluationRef.current?.requestFullscreen();
    } catch (e) {
      console.error(e);
      setError('Unable to change fullscreen mode. Please check your browser permissions.');
    }
  };

  const increaseFontSize = () => {
    const s = ['small', 'medium', 'large', 'xlarge'];
    const i = s.indexOf(fontSize);
    if (i < s.length - 1) setFontSize(s[i + 1]);
  };
  const decreaseFontSize = () => {
    const s = ['small', 'medium', 'large', 'xlarge'];
    const i = s.indexOf(fontSize);
    if (i > 0) setFontSize(s[i - 1]);
  };

  // ── Shorthand dashboard data ───────────────────────────────────────────────
  const latestAvg    = dashboard?.summary?.averages?.[dashboard.summary.averages.length - 1];
  const improvement  = dashboard?.summary?.improvement;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={evaluationRef}
      className={`flex flex-col bg-[#f4f6fb] ${isFullscreen ? 'h-screen overflow-y-auto' : 'min-h-screen'}`}
    >
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">

        {/* Title row */}
        <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <BookOpen className="h-4.5 w-4.5 text-white h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Student Evaluation</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Comprehensive academic performance analysis</p>
            </div>
          </div>

          {/* Right-side utility buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Font size */}
            <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-gray-200 p-1 bg-gray-50">
              <button
                onClick={decreaseFontSize}
                disabled={fontSize === 'small'}
                title="Smaller text"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <MinusIcon className="h-3 w-3" />
              </button>
              <Type className="h-3.5 w-3.5 text-gray-400 mx-0.5" />
              <button
                onClick={increaseFontSize}
                disabled={fontSize === 'xlarge'}
                title="Larger text"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Export */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowExportDropdown(!showExportDropdown); setShowStudentDropdown(false); setShowTermDropdown(false); }}
                disabled={!dashboard}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>
              {showExportDropdown && dashboard && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl ring-1 ring-black/5 z-[999]">
                  {exportOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button key={opt.key} onClick={() => handleExport(opt.key)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3">

          {/* Class */}
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); setSelectedStudentId(''); setDashboard(null); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer hover:border-gray-300 transition"
          >
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c._id} value={c.className}>{c.className}</option>)}
          </select>

          {/* Section */}
          <select
            value={selectedSection}
            onChange={(e) => { setSelectedSection(e.target.value); setSelectedStudentId(''); setDashboard(null); }}
            disabled={!selectedClass}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>Section {s}</option>)}
          </select>

          {/* Student dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowStudentDropdown(!showStudentDropdown); setShowTermDropdown(false); setShowExportDropdown(false); }}
              disabled={!selectedClass}
              className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {selectedStudent ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold flex-shrink-0">
                    {selectedStudent.name?.charAt(0)?.toUpperCase()}
                  </span>
                  <span className="max-w-[140px] truncate">{selectedStudent.name}</span>
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">Select Student</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 ml-0.5" />
            </button>

            {showStudentDropdown && selectedClass && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 z-[999]">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or roll no…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">No students found</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student._id}
                        onClick={() => { setSelectedStudentId(student._id); setShowStudentDropdown(false); setDashboard(null); }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-indigo-50 ${selectedStudentId === student._id ? 'bg-indigo-50' : ''}`}
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold">
                          {student.name?.charAt(0)?.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
                          <p className="text-xs text-gray-400">Roll {student.rollNo} · Section {student.section}</p>
                        </div>
                        {selectedStudentId === student._id && <CheckCircle2 className="ml-auto h-4 w-4 text-indigo-500 flex-shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terms dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowTermDropdown(!showTermDropdown); setShowStudentDropdown(false); setShowExportDropdown(false); }}
              className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition max-w-[220px]"
            >
              <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {selectedExamIds.length === 0
                  ? 'Select Terms'
                  : selectedExamIds.length === 1
                  ? selectedExams[0]?.examName
                  : `${selectedExamIds.length} terms selected`}
              </span>
              {selectedExamIds.length > 0 && (
                <span className="flex-shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                  {selectedExamIds.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0 ml-0.5" />
            </button>

            {showTermDropdown && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5 z-[999]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Select Terms</p>
                  <button
                    onClick={() => { setSelectedExamIds(selectedExamIds.length === exams.length ? [] : exams.map((e) => e._id)); setDashboard(null); }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    {selectedExamIds.length === exams.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto py-1.5">
                  {exams.map((exam) => {
                    const checked = selectedExamIds.includes(exam._id);
                    return (
                      <label
                        key={exam._id}
                        onClick={(e) => e.stopPropagation()}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-indigo-50 ${checked ? 'bg-indigo-50/60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExam(exam._id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{exam.examName}</p>
                          <p className="text-xs text-gray-400">{exam.academicYear}</p>
                        </div>
                        {checked && <CheckCircle2 className="ml-auto h-4 w-4 text-indigo-500 flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
                {selectedExamIds.length > 0 && selectedExamIds.length < 2 && (
                  <div className="border-t border-gray-100 px-4 py-2.5">
                    <p className="text-xs text-amber-600 font-medium">Select at least 2 terms to compare</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mark component */}
          <select
            value={markComponent}
            onChange={(e) => setMarkComponent(e.target.value)}
            aria-label="Select mark component"
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer hover:border-gray-300 transition"
          >
            {markComponents.map((component) => (
              <option key={component.key} value={component.key}>{component.label}</option>
            ))}
          </select>

          {/* Display mode */}
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer hover:border-gray-300 transition"
          >
            {displayModes.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Generate button */}
          <button
            onClick={generateAnalysis}
            disabled={loading || !selectedStudent || selectedExamIds.length < 2}
            className="flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Analyzing…</span></>
              : <><Zap className="h-3.5 w-3.5" /><span>Generate</span></>}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-6 gap-0">
          {tabs.map((tab) => {
            const Icon    = tab.icon;
            const active  = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 ${
                  active
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-indigo-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600 transition">
            <Minus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Page Body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 pb-5 pt-4 space-y-3">

        {/* ── Student Identity Card ──────────────────────────────────────── */}
        {selectedStudent && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Identity */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-black shadow-md shadow-indigo-200">
                    {selectedStudent.name?.charAt(0)?.toUpperCase()}
                  </div>
                  {dashboard && (
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{selectedStudent.name}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {[
                      selectedStudent.className && `Class ${selectedStudent.className}`,
                      selectedStudent.section   && `Section ${selectedStudent.section}`,
                      selectedStudent.rollNo    && `Roll #${selectedStudent.rollNo}`,
                      selectedStudent.symbolNo  && `Symbol ${selectedStudent.symbolNo}`,
                    ].filter(Boolean).map((info, i) => (
                      <span key={i} className="text-xs text-gray-500 font-medium">{info}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick KPIs */}
              {dashboard ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-5">
                  {[
                    {
                      label: 'Latest Avg',
                      value: latestAvg?.average != null ? `${formatDecimal(latestAvg.average)}%` : 'N/A',
                      color: 'text-indigo-600',
                      bg:    'bg-indigo-50',
                    },
                    {
                      label: 'GPA',
                      value: latestAvg?.gpa != null ? formatDecimal(latestAvg.gpa) : 'N/A',
                      color: 'text-violet-600',
                      bg:    'bg-violet-50',
                    },
                    {
                      label: 'Class Rank',
                      value: latestAvg?.rank != null ? `#${latestAvg.rank}` : 'N/A',
                      color: 'text-emerald-600',
                      bg:    'bg-emerald-50',
                    },
                    {
                      label: 'Attendance',
                      value: dashboard.attendance?.percentage != null
                        ? `${formatDecimal(dashboard.attendance.percentage)}%`
                        : 'N/A',
                      color: 'text-orange-600',
                      bg:    'bg-orange-50',
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className={`rounded-xl ${kpi.bg} px-4 py-3 text-center`}>
                      <p className={`text-xl font-black tabular-nums ${kpi.color}`}>{kpi.value}</p>
                      <p className="mt-0.5 text-xs font-medium text-gray-500">{kpi.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <StepBadge n="1" label="Student selected" done />
                  <StepBadge n="2" label="Select 2+ terms" done={selectedExamIds.length >= 2} />
                  <StepBadge n="3" label="Click Generate"  done={false} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MARKSHEET TAB ─────────────────────────────────────────────── */}
        {activeTab === 'marksheet' && (
          dashboard ? (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              {/* Table header accent */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/70">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-700">Subject Marks</span>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600">
                    {dashboard.subjects.length} subjects
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Showing:</span>
                  {displayModes.find((m) => m.key === displayMode) && (
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 border border-indigo-100">
                      {displayModes.find((m) => m.key === displayMode).label}
                    </span>
                  )}
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-600 border border-violet-100">
                    {markComponents.find((component) => component.key === markComponent)?.label}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-100">
                  <colgroup>
                    <col style={{ width: '25%' }} />
                    {selectedExams.map((e) => <col key={e._id} style={{ width: `${52 / selectedExams.length}%` }} />)}
                    <col style={{ width: '23%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50">
                      <th className={`px-4 py-3 text-left ${fs.tableHeader} font-bold uppercase tracking-wider text-gray-500`}>
                        Subject
                      </th>
                      {selectedExams.map((exam, i) => (
                        <th key={exam._id} className={`px-3 py-3 text-left ${fs.tableHeader} font-bold uppercase tracking-wider text-gray-500`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${CHART_COLORS[i % CHART_COLORS.length].bar}`} />
                            <span className="truncate">{exam.examName}</span>
                          </div>
                        </th>
                      ))}
                      <th className={`px-3 py-3 text-left ${fs.tableHeader} font-bold uppercase tracking-wider text-gray-500`}>
                        {displayMode === 'raw' ? 'Change' : 'Total'} ({displayModes.find((m) => m.key === displayMode)?.label})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dashboard.subjects.map((subject, index) => {
                      const latestStat = subject.stats[subject.stats.length - 1];
                      const change     = getChangeIndicator((markComponent === 'theory' ? subject.theoryChange : subject.change) || 0);
                      const ChangeIcon = change.icon;
                      const isSubjectFailed = subject.stats.some((s) => getComponentResult(s, markComponent) === 'Fail');
                      const validStats = subject.stats.filter(Boolean);
                      const lastRaw    = getRawValue(validStats[validStats.length - 1], markComponent);
                      const prevRaw    = getRawValue(validStats[validStats.length - 2], markComponent);
                      const rawDiff    = lastRaw != null && prevRaw != null ? lastRaw - prevRaw : null;

                      return (
                        <tr
                          key={subject.subject}
                          className={`group transition-colors ${
                            isSubjectFailed
                              ? 'bg-red-50/60 hover:bg-red-50'
                              : `hover:bg-indigo-50/30 ${index % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`
                          }`}
                        >
                          {/* Subject name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`hidden sm:flex flex-shrink-0 ${fs.iconSize} items-center justify-center rounded-xl text-white ${fs.iconText} font-black shadow-sm ${isSubjectFailed ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                {subject.subject.charAt(0)}
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`${fs.subjectName} font-bold truncate ${isSubjectFailed ? 'text-red-800' : 'text-gray-800'}`} title={subject.subject}>
                                  {subject.subject}
                                </span>
                                {isSubjectFailed && (
                                  <span className="flex-shrink-0 rounded-full bg-red-100 border border-red-200 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-600">
                                    Fail
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Per-exam values */}
                          {subject.stats.map((stat, idx) => {
                            const isFail = getComponentResult(stat, markComponent) === 'Fail';
                            return (
                              <td key={idx} className="px-3 py-3">
                                <div className="flex items-center gap-1">
                                  <span className={`${fs.tableCell} font-semibold tabular-nums ${isFail ? 'text-red-600' : 'text-gray-700'}`}>
                                    {getDisplayValue(stat, displayMode, markComponent)}
                                  </span>
                                  {isFail && (
                                    <span className="flex-shrink-0 rounded-full bg-red-100 border border-red-200 px-1 py-0.5 text-[9px] font-black uppercase text-red-500 leading-none">F</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* Raw-mark change (raw mode) / latest value (other modes) + trend */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {displayMode === 'raw' ? (
                                <span className={`${fs.marks} font-black tabular-nums ${rawDiff == null ? 'text-gray-400' : rawDiff > 0 ? 'text-emerald-600' : rawDiff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                  {rawDiff == null ? '—' : `${rawDiff > 0 ? '+' : ''}${rawDiff}`}
                                </span>
                              ) : (
                                <span className={`${fs.marks} font-black tabular-nums ${isSubjectFailed ? 'text-red-700' : 'text-gray-900'}`}>
                                  {getDisplayValue(latestStat, displayMode, markComponent)}
                                </span>
                              )}
                              <span className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ring-1 ${change.bg} ${change.ring}`}>
                                <ChangeIcon className={`h-3 w-3 ${change.color}`} />
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer summary */}
              {latestAvg && (
                <div className="flex flex-wrap items-center justify-end gap-4 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
                  <span className="text-xs text-gray-400 font-medium mr-auto">Overall summary (latest term)</span>
                  {[
                    { label: 'Average', value: latestAvg.average != null ? `${formatDecimal(latestAvg.average)}%` : 'N/A' },
                    { label: 'GPA',     value: latestAvg.gpa     != null ? formatDecimal(latestAvg.gpa)           : 'N/A' },
                    { label: 'Grade',   value: latestAvg.grade   || 'N/A' },
                    { label: 'Rank',    value: latestAvg.rank    != null ? `#${latestAvg.rank} / ${latestAvg.totalStudents}` : 'N/A' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">{item.label}:</span>
                      <span className="text-sm font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
              <EmptyState
                icon={FileText}
                title="No Marksheet Data"
                description="Select a student and at least two exam terms, then click Generate to view the comparison marksheet."
              />
            </div>
          )
        )}

        {/* ── ANALYSIS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'analysis' && (
          dashboard ? (
            <div className="space-y-3">

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                  label="Average Score"
                  value={latestAvg?.average != null ? `${formatDecimal(latestAvg.average)}%` : 'N/A'}
                  sub={
                    improvement != null
                      ? improvement > 0
                        ? `↑ +${formatDecimal(improvement)}% from first term`
                        : improvement < 0
                        ? `↓ ${formatDecimal(improvement)}% from first term`
                        : 'Stable across all terms'
                      : undefined
                  }
                  icon={BarChart3}
                  gradient="text-indigo-600"
                  iconBg="bg-indigo-100 text-indigo-600"
                />
                <StatCard
                  label="Current GPA"
                  value={latestAvg?.gpa != null ? formatDecimal(latestAvg.gpa) : 'N/A'}
                  sub={`Grade: ${latestAvg?.grade || 'N/A'}`}
                  icon={Target}
                  gradient="text-violet-600"
                  iconBg="bg-violet-100 text-violet-600"
                />
                <StatCard
                  label="Class Rank"
                  value={latestAvg?.rank != null ? `#${latestAvg.rank}` : 'N/A'}
                  sub={latestAvg?.totalStudents ? `Out of ${latestAvg.totalStudents} students` : undefined}
                  icon={Trophy}
                  gradient="text-emerald-600"
                  iconBg="bg-emerald-100 text-emerald-600"
                />
                <StatCard
                  label="Attendance"
                  value={dashboard.attendance?.percentage != null ? `${formatDecimal(dashboard.attendance.percentage)}%` : 'N/A'}
                  sub={
                    dashboard.attendance
                      ? `${dashboard.attendance.present} present · ${dashboard.attendance.absent} absent · ${dashboard.attendance.workingDays ?? dashboard.attendance.records} days`
                      : undefined
                  }
                  icon={Activity}
                  gradient="text-orange-600"
                  iconBg="bg-orange-100 text-orange-600"
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* GPA Trend + Exam Overview (merged) */}
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-50">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">GPA Trend</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Performance across selected exams</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{selectedExams.length} terms</span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                        <LineChart className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="px-4 py-3">
                    <GpaTrendChart averages={dashboard.summary?.averages} />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Exam-by-exam table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                        <th className="px-4 py-2.5 text-left">Exam</th>
                        <th className="px-3 py-2.5 text-right">Avg</th>
                        <th className="px-3 py-2.5 text-right">GPA</th>
                        <th className="px-3 py-2.5 text-center">Grade</th>
                        <th className="px-3 py-2.5 text-center">Rank</th>
                        <th className="px-3 py-2.5 text-right">Class Avg</th>
                        <th className="px-3 py-2.5 text-center">vs Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dashboard.summary?.averages?.map((avg, i) => {
                        const diff    = avg.average != null && avg.classAverage != null ? avg.average - avg.classAverage : null;
                        const isFirst = i === 0;
                        const prevAvg = i > 0 ? dashboard.summary.averages[i - 1]?.average : null;
                        const trend   = prevAvg != null && avg.average != null ? avg.average - prevAvg : null;
                        return (
                          <tr key={avg.examId} className={`hover:bg-indigo-50/20 transition ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${CHART_COLORS[i % CHART_COLORS.length].bar}`} />
                                <span className="font-semibold text-gray-800 truncate max-w-[140px]" title={avg.examName}>{avg.examName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-gray-900 whitespace-nowrap">
                              {avg.average != null ? `${formatDecimal(avg.average)}%` : '—'}
                              {!isFirst && trend != null && (
                                <span className={`ml-1 text-xs font-semibold ${trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                  {trend > 0 ? `+${formatDecimal(trend)}` : formatDecimal(trend)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-700 whitespace-nowrap">
                              {avg.gpa != null ? formatDecimal(avg.gpa) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <GradeChip grade={avg.grade} />
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-gray-800 whitespace-nowrap">
                              {avg.rank != null ? `#${avg.rank}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-600 whitespace-nowrap">
                              {avg.classAverage != null ? `${formatDecimal(avg.classAverage)}%` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {diff != null ? (
                                <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                  {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {diff >= 0 ? '+' : ''}{formatDecimal(diff)}%
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Subject Performance */}
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-50">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Subject Performance</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Comparative marks per subject</p>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                      <BarChart3 className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <SubjectPerformanceChart subjects={dashboard.subjects || []} exams={selectedExams} markComponent={markComponent} />
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              {dashboard.aiSummary && (
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Performance Insights</h3>
                      <p className="text-xs text-gray-400">Automated academic performance analysis</p>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Summary paragraph */}
                    <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 px-3 py-2.5">
                      <p className="text-sm text-gray-700 leading-relaxed">{dashboard.aiSummary}</p>
                    </div>

                    {/* Subject categories */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {dashboard.strongSubjects?.length > 0 && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                          <div className="mb-2 flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Strong</h4>
                          </div>
                          <div className="space-y-1">
                            {dashboard.strongSubjects.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                                <ChevronRight className="h-3 w-3 flex-shrink-0 text-emerald-400" />{s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dashboard.weakSubjects?.length > 0 && (
                        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                          <div className="mb-2 flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-wide text-red-700">Needs Attention</h4>
                          </div>
                          <div className="space-y-1">
                            {dashboard.weakSubjects.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-red-800">
                                <ChevronRight className="h-3 w-3 flex-shrink-0 text-red-400" />{s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dashboard.stableSubjects?.length > 0 && (
                        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                          <div className="mb-2 flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
                              <Minus className="h-3 w-3 text-blue-500" />
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-wide text-blue-700">Stable</h4>
                          </div>
                          <div className="space-y-1">
                            {dashboard.stableSubjects.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
                                <ChevronRight className="h-3 w-3 flex-shrink-0 text-blue-400" />{s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
              <EmptyState
                icon={BarChart3}
                title="No Analysis Available"
                description="Select a student and at least two exam terms, then click Generate to view detailed performance analytics."
              />
            </div>
          )
        )}

        {/* ── REPORTS TAB ───────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          dashboard ? (
            <div className="space-y-5">

              {/* Export options */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <h3 className="mb-4 text-sm font-bold text-gray-800">Export Report</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'pdf',   label: 'PDF Report',   desc: 'Complete evaluation document',  icon: FileText,  bg: 'bg-red-50   hover:bg-red-100   border-red-100',   iconBg: 'bg-red-100   text-red-600'   },
                    { key: 'excel', label: 'Excel Export', desc: 'Spreadsheet with marks data',   icon: Download,  bg: 'bg-green-50 hover:bg-green-100 border-green-100', iconBg: 'bg-green-100 text-green-600' },
                    { key: 'print', label: 'Print',        desc: 'Print-ready formatted report',  icon: Printer,   bg: 'bg-blue-50  hover:bg-blue-100  border-blue-100',  iconBg: 'bg-blue-100  text-blue-600'  },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleExport(opt.key)}
                        className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all hover:shadow-sm ${opt.bg}`}
                      >
                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${opt.iconBg}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{opt.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Report Preview */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                  <h3 className="text-sm font-bold text-gray-800">Report Preview</h3>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                    {selectedExams.length} term{selectedExams.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  {/* Student header */}
                  <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-black shadow-md shadow-indigo-200">
                      {selectedStudent?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{selectedStudent?.name}</h2>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                        {selectedStudent?.className && <span>Class {selectedStudent.className}</span>}
                        {selectedStudent?.section   && <span>Section {selectedStudent.section}</span>}
                        {selectedStudent?.rollNo    && <span>Roll #{selectedStudent.rollNo}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Average Score', value: latestAvg?.average != null ? `${formatDecimal(latestAvg.average)}%` : 'N/A', color: 'text-indigo-600' },
                      { label: 'GPA',           value: latestAvg?.gpa     != null ? formatDecimal(latestAvg.gpa)           : 'N/A', color: 'text-violet-600' },
                      { label: 'Class Rank',    value: latestAvg?.rank    != null ? `#${latestAvg.rank}`                   : 'N/A', color: 'text-emerald-600' },
                      {
                        label: 'Attendance',
                        value: dashboard.attendance?.percentage != null ? `${formatDecimal(dashboard.attendance.percentage)}%` : 'N/A',
                        color: 'text-orange-600',
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-gray-50 p-4 text-center border border-gray-100">
                        <p className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value}</p>
                        <p className="mt-1 text-xs text-gray-500 font-medium">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subject table */}
                  <div>
                    <h4 className="mb-3 text-sm font-bold text-gray-700">Subject Performance</h4>
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full table-fixed text-sm divide-y divide-gray-100">
                        <colgroup>
                          <col style={{ width: '28%' }} />
                          {selectedExams.map((e) => <col key={e._id} style={{ width: `${60 / selectedExams.length}%` }} />)}
                          <col style={{ width: '12%' }} />
                        </colgroup>
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Subject</th>
                            {selectedExams.map((e) => (
                              <th key={e._id} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500">{e.examName}</th>
                            ))}
                            <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dashboard.subjects.map((subject, i) => {
                            const latestStat = subject.stats[subject.stats.length - 1];
                            return (
                              <tr key={subject.subject} className={i % 2 === 1 ? 'bg-gray-50/40' : ''}>
                                <td className="px-4 py-2.5 font-semibold text-gray-800">{subject.subject}</td>
                                {subject.stats.map((stat, idx) => (
                                  <td key={idx} className="px-3 py-2.5 tabular-nums text-gray-700">
                                    {getDisplayValue(stat, displayMode, markComponent)}
                                  </td>
                                ))}
                                <td className="px-3 py-2.5 text-center">
                                  <GradeChip grade={getComponentGrade(latestStat, markComponent)} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* AI summary */}
                  {dashboard.aiSummary && (
                    <div>
                      <h4 className="mb-2 text-sm font-bold text-gray-700">Performance Analysis</h4>
                      <div className="rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-4 py-3.5">
                        <p className="text-sm text-gray-700 leading-relaxed">{dashboard.aiSummary}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm">
              <EmptyState
                icon={Download}
                title="No Reports Available"
                description="Generate analysis first to access report generation and export options."
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default EvaluationDashboard;
