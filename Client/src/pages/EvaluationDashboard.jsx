import React, { useEffect, useMemo, useState } from 'react';
import { 
  Search, ChevronDown, Download, FileText, Printer, BarChart3, 
  TrendingUp, Award, Target, User, Calendar, Hash, Eye, 
  ArrowUp, ArrowDown, Minus, Zap, RefreshCw, CheckCircle2,
  LineChart, PieChart, Activity, Star, AlertTriangle, Trophy,
  Plus, Minus as MinusIcon, Type
} from 'lucide-react';
import { classAPI, evaluationAPI, examAPI, studentAPI } from '../services/api';
import { generateEvaluationPDF } from '../utils/pdfExport';

const displayModes = [
  { key: 'percentage', label: 'Percentage', icon: BarChart3 },
  { key: 'gpa', label: 'GPA', icon: Target },
  { key: 'grade', label: 'Grade', icon: Award },
  { key: 'raw', label: 'Raw Marks', icon: Hash },
];

const tabs = [
  { key: 'marksheet', label: 'Marksheet', icon: FileText },
  { key: 'analysis', label: 'Analysis', icon: BarChart3 },
  { key: 'reports', label: 'Reports', icon: Download },
];

const exportOptions = [
  { key: 'pdf', label: 'Export PDF', icon: FileText },
  { key: 'excel', label: 'Export Excel', icon: Download },
  { key: 'print', label: 'Print', icon: Printer },
];

const getDisplayValue = (item, mode) => {
  if (!item) return '-';
  if (mode === 'raw') return item.raw ?? '-';
  if (mode === 'percentage') return item.percentage != null ? `${item.percentage}%` : '-';
  if (mode === 'gpa') return item.gpa != null ? item.gpa.toFixed(1) : '-';
  if (mode === 'grade') return item.grade || '-';
  return '-';
};

const formatNumber = (value) => {
  if (value == null || Number.isNaN(value)) return '-';
  return Number(value.toFixed(1));
};

const getGradeColor = (grade) => {
  const colors = {
    'A+': 'text-emerald-700 bg-emerald-50 border-emerald-200',
    'A': 'text-green-700 bg-green-50 border-green-200',
    'B+': 'text-blue-700 bg-blue-50 border-blue-200',
    'B': 'text-indigo-700 bg-indigo-50 border-indigo-200',
    'C': 'text-yellow-700 bg-yellow-50 border-yellow-200',
    'F': 'text-red-700 bg-red-50 border-red-200',
  };
  return colors[grade] || 'text-gray-700 bg-gray-50 border-gray-200';
};

const getChangeIndicator = (change) => {
  if (change > 0) return { icon: ArrowUp, color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (change < 0) return { icon: ArrowDown, color: 'text-red-600', bg: 'bg-red-50' };
  return { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-50' };
};

// Font size configurations
const fontSizes = {
  small: {
    tableHeader: 'text-xs',
    tableCell: 'text-sm',
    subjectName: 'text-base',
    marks: 'text-sm',
    grade: 'text-xs',
    icon: 'h-8 w-8 text-sm',
    iconText: 'text-sm'
  },
  medium: {
    tableHeader: 'text-sm',
    tableCell: 'text-lg',
    subjectName: 'text-lg',
    marks: 'text-lg',
    grade: 'text-lg',
    icon: 'h-12 w-12 text-lg',
    iconText: 'text-lg'
  },
  large: {
    tableHeader: 'text-base',
    tableCell: 'text-xl',
    subjectName: 'text-xl',
    marks: 'text-xl',
    grade: 'text-xl',
    icon: 'h-14 w-14 text-xl',
    iconText: 'text-xl'
  },
  xlarge: {
    tableHeader: 'text-lg',
    tableCell: 'text-2xl',
    subjectName: 'text-2xl',
    marks: 'text-2xl',
    grade: 'text-2xl',
    icon: 'h-16 w-16 text-2xl',
    iconText: 'text-2xl'
  }
};
const EvaluationDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedExamIds, setSelectedExamIds] = useState([]);
  const [displayMode, setDisplayMode] = useState('percentage');
  const [activeTab, setActiveTab] = useState('marksheet');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fontSize, setFontSize] = useState('medium'); // Font size state
  
  // UI State
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Close custom dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowStudentDropdown(false);
      setShowTermDropdown(false);
      setShowExportDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesRes, examsRes] = await Promise.all([classAPI.getAll(), examAPI.getAll()]);
        setClasses(classesRes.data?.classes || classesRes.data || []);
        setExams(examsRes.data?.exams || examsRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const params = { className: selectedClass };
        // Only add section filter if a specific section is selected
        if (selectedSection) {
          params.section = selectedSection;
        }
        const response = await studentAPI.getAll(params);
        setStudents(response.data?.students || response.data || []);
      } catch (err) {
        console.error(err);
        setStudents([]);
      }
    };
    if (selectedClass) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedClass, selectedSection]);
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return (
          student.name?.toLowerCase().includes(lower) ||
          String(student.rollNo || '').includes(lower) ||
          String(student.symbolNo || '').includes(lower)
        );
      })
      .sort((a, b) => Number(a.rollNo || 99999) - Number(b.rollNo || 99999) || a.name.localeCompare(b.name));
  }, [students, searchTerm]);

  const selectedStudent = useMemo(
    () => students.find((student) => student._id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const sectionOptions = useMemo(() => {
    return [...new Set(classes.find((cls) => cls.className === selectedClass)?.sections || [])];
  }, [classes, selectedClass]);

  // Preserve user's selection order so columns appear in the order terms were selected
  const selectedExams = useMemo(
    () => selectedExamIds.map((id) => exams.find((exam) => exam._id === id)).filter(Boolean),
    [exams, selectedExamIds]
  );

  const toggleExam = (examId) => {
    setSelectedExamIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]
    );
    setDashboard(null);
  };

  const generateAnalysis = async () => {
    setError('');
    if (!selectedStudent) {
      setError('Please select a student first.');
      return;
    }
    if (selectedExamIds.length < 2) {
      setError('Please select at least two terms to compare.');
      return;
    }

    setLoading(true);
    try {
      const response = await evaluationAPI.compare({ studentId: selectedStudent._id, examIds: selectedExamIds });
      setDashboard(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to load evaluation results.');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };
  const exportToPDF = () => {
    if (!dashboard || !selectedStudent) {
      setError('Please generate analysis first.');
      return;
    }
    generateEvaluationPDF(dashboard, selectedStudent, selectedExams, displayMode);
  };

  const exportToExcel = () => {
    console.log('Excel export functionality to be implemented');
  };

  const handleExport = (type) => {
    setShowExportDropdown(false);
    if (type === 'pdf') exportToPDF();
    else if (type === 'excel') exportToExcel();
    else if (type === 'print') window.print();
  };

  // Font size adjustment functions
  const increaseFontSize = () => {
    const sizes = ['small', 'medium', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const sizes = ['small', 'medium', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1]);
    }
  };

  // Get current font size configuration
  const currentFontConfig = fontSizes[fontSize];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Control Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-3">
          {/* Title */}
          <div className="mb-3">
            <h1 className="text-xl font-semibold text-gray-900">Student Evaluation</h1>
            <p className="text-xs text-gray-500">Comprehensive academic performance analysis</p>
          </div>
          {/* Controls — single row */}
          <div className="flex items-center gap-2 flex-wrap">

              {/* Class — native select */}
              <select
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); setSelectedStudentId(''); setDashboard(null); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls.className}>{cls.className}</option>
                ))}
              </select>

              {/* Section — native select */}
              <select
                value={selectedSection}
                onChange={(e) => { setSelectedSection(e.target.value); setSelectedStudentId(''); setDashboard(null); }}
                disabled={!selectedClass}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Sections</option>
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>Section {section}</option>
                ))}
              </select>

              {/* Student — custom dropdown (needs search) */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowStudentDropdown(!showStudentDropdown); setShowTermDropdown(false); setShowExportDropdown(false); }}
                  disabled={!selectedClass}
                  className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedStudent ? (
                    <>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-semibold flex-shrink-0">
                        {selectedStudent.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span>{selectedStudent.name}</span>
                    </>
                  ) : (
                    <><User className="h-3.5 w-3.5 text-gray-400" /><span className="text-gray-500">Select Student</span></>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {showStudentDropdown && selectedClass && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-[999]">
                    <div className="p-3 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" placeholder="Search students..." value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredStudents.map((student) => (
                        <button key={student._id}
                          onClick={() => { setSelectedStudentId(student._id); setShowStudentDropdown(false); setDashboard(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-semibold flex-shrink-0">
                            {student.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                            <div className="text-xs text-gray-500">Roll {student.rollNo} · Section {student.section}</div>
                          </div>
                        </button>
                      ))}
                      {filteredStudents.length === 0 && <div className="px-4 py-6 text-center text-gray-400 text-sm">No students found</div>}
                    </div>
                  </div>
                )}
              </div>
              {/* Terms — custom dropdown (needs checkboxes) */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowTermDropdown(!showTermDropdown); setShowStudentDropdown(false); setShowExportDropdown(false); }}
                  className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap max-w-[200px]"
                >
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  <span className="truncate">{selectedExamIds.length === 0 ? 'Select Terms' : selectedExams.map((e) => e.examName).join(', ')}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                </button>
                {showTermDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-[999]" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 text-sm">Select Terms</h3>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedExamIds(selectedExamIds.length === exams.length ? [] : exams.map((exam) => exam._id)); setDashboard(null); }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                          {selectedExamIds.length === exams.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {exams.map((exam) => (
                          <label key={exam._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedExamIds.includes(exam._id)} onChange={() => toggleExam(exam._id)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{exam.examName}</div>
                              <div className="text-xs text-gray-500">{exam.academicYear}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* Display Mode — native select */}
              <select
                value={displayMode}
                onChange={(e) => setDisplayMode(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {displayModes.map((mode) => (
                  <option key={mode.key} value={mode.key}>{mode.label}</option>
                ))}
              </select>

              {/* Font Size Controls */}
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <button onClick={decreaseFontSize} disabled={fontSize === 'small'} title="Smaller"
                  className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <MinusIcon className="h-3.5 w-3.5 text-gray-600" />
                </button>
                <Type className="h-3.5 w-3.5 text-gray-400 mx-1" />
                <button onClick={increaseFontSize} disabled={fontSize === 'xlarge'} title="Larger"
                  className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus className="h-3.5 w-3.5 text-gray-600" />
                </button>
              </div>

              {/* Generate Button */}
              <button onClick={generateAnalysis} disabled={loading || !selectedStudent || selectedExamIds.length < 2}
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                {loading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Analyzing...</span></> : <><Zap className="h-3.5 w-3.5" /><span>Generate</span></>}
              </button>

              {/* Export — custom dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowExportDropdown(!showExportDropdown); setShowStudentDropdown(false); setShowTermDropdown(false); }}
                  disabled={!dashboard}
                  className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-3.5 w-3.5" /><span>Export</span><ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {showExportDropdown && dashboard && (
                  <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-[999]">
                    <div className="py-2">
                      {exportOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button key={option.key} onClick={() => handleExport(option.key)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                            <IconComponent className="h-4 w-4" /><span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

          </div>
        </div>
        {/* Tab Navigation */}
        <div className="px-6">
          <div className="flex space-x-8 border-b border-gray-200">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 pb-6">
        {/* Student Info Bar (when selected) */}
        {selectedStudent && (
          <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg font-semibold">
                  {selectedStudent.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedStudent.name}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{selectedStudent.className}</span>
                    <span>•</span>
                    <span>Section {selectedStudent.section}</span>
                    <span>•</span>
                    <span>Roll {selectedStudent.rollNo}</span>
                    {selectedStudent.symbolNo && (
                      <>
                        <span>•</span>
                        <span>Symbol {selectedStudent.symbolNo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {dashboard && (
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.average || 'N/A'}%
                    </div>
                    <div className="text-xs text-gray-500">Latest Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.gpa?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">GPA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      #{dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.rank || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Class Rank</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Tab Content */}
        {activeTab === 'marksheet' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {dashboard ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className={`px-6 py-4 text-left ${currentFontConfig.tableHeader} font-bold text-gray-700 uppercase tracking-wider`}>
                        Subject
                      </th>
                      {selectedExams.map((exam) => (
                        <th key={exam._id} className={`px-6 py-4 text-left ${currentFontConfig.tableHeader} font-bold text-gray-700 uppercase tracking-wider`}>
                          {exam.examName}
                        </th>
                      ))}
                      <th className={`px-6 py-4 text-left ${currentFontConfig.tableHeader} font-bold text-gray-700 uppercase tracking-wider`}>
                        Final Score
                      </th>
                      <th className={`px-6 py-4 text-left ${currentFontConfig.tableHeader} font-bold text-gray-700 uppercase tracking-wider`}>
                        GPA
                      </th>
                      <th className={`px-6 py-4 text-left ${currentFontConfig.tableHeader} font-bold text-gray-700 uppercase tracking-wider`}>
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboard.subjects.map((subject, index) => {
                      const latestStat = subject.stats[subject.stats.length - 1];
                      const change = getChangeIndicator(subject.change || 0);
                      const ChangeIcon = change.icon;
                      
                      return (
                        <tr key={subject.subject} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className={`flex ${currentFontConfig.icon} items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white ${currentFontConfig.iconText} font-bold`}>
                                {subject.subject.charAt(0)}
                              </div>
                              <div className={`${currentFontConfig.subjectName} font-bold text-gray-900`}>{subject.subject}</div>
                            </div>
                          </td>
                          {subject.stats.map((stat, idx) => (
                            <td key={idx} className="px-6 py-5 whitespace-nowrap">
                              <div className={`${currentFontConfig.marks} font-bold text-gray-900`}>
                                {getDisplayValue(stat, displayMode)}
                              </div>
                            </td>
                          ))}
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <span className={`${currentFontConfig.marks} font-bold text-gray-900`}>
                                {getDisplayValue(latestStat, displayMode)}
                              </span>
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${change.bg}`}>
                                <ChangeIcon className={`w-4 h-4 ${change.color}`} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`${currentFontConfig.marks} font-bold text-gray-900`}>
                              {latestStat?.gpa?.toFixed(1) || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full ${currentFontConfig.grade} font-bold border ${getGradeColor(latestStat?.grade)}`}>
                              {latestStat?.grade || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Select a student and at least two terms, then click "Generate Analysis" to view the marksheet.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {dashboard ? (
              <>
                {/* Performance Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Average Score</p>
                        <p className="text-3xl font-bold text-indigo-600 mt-2">
                          {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.average || 'N/A'}%
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                        <BarChart3 className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 text-sm">
                        {dashboard.summary?.improvement > 0 ? (
                          <>
                            <ArrowUp className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 font-medium">+{dashboard.summary.improvement}%</span>
                          </>
                        ) : dashboard.summary?.improvement < 0 ? (
                          <>
                            <ArrowDown className="h-4 w-4 text-red-500" />
                            <span className="text-red-600 font-medium">{dashboard.summary.improvement}%</span>
                          </>
                        ) : (
                          <span className="text-gray-500">No change</span>
                        )}
                        <span className="text-gray-500">from first term</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Current GPA</p>
                        <p className="text-3xl font-bold text-purple-600 mt-2">
                          {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.gpa?.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                        <Target className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-sm text-gray-500">
                        Grade: {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.grade || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Class Rank</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                          #{dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.rank || 'N/A'}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                        <Trophy className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-sm text-gray-500">
                        Out of {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.totalStudents || 'N/A'} students
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Attendance</p>
                        <p className="text-3xl font-bold text-orange-600 mt-2">
                          {dashboard.attendance?.percentage || 'N/A'}%
                        </p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                        <Activity className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <span className="text-sm text-gray-500">
                        {dashboard.attendance?.present || 0}/{dashboard.attendance?.records || 0} days present
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* GPA Trend Chart */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">GPA Trend</h3>
                      <div className="flex items-center space-x-2">
                        <LineChart className="h-5 w-5 text-indigo-500" />
                      </div>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">GPA trend chart will be displayed here</p>
                        <p className="text-sm text-gray-400 mt-1">Chart component integration needed</p>
                      </div>
                    </div>
                  </div>

                  {/* Subject Performance Chart */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Subject Performance</h3>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Subject comparison chart will be displayed here</p>
                        <p className="text-sm text-gray-400 mt-1">Chart component integration needed</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Star className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">AI Performance Insights</h3>
                      <p className="text-sm text-gray-500">Automated analysis of academic performance</p>
                    </div>
                  </div>
                  
                  {dashboard.aiSummary ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                        <p className="text-gray-700 leading-relaxed">{dashboard.aiSummary}</p>
                      </div>
                      
                      {/* Performance Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {dashboard.strongSubjects?.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <h4 className="font-medium text-green-800">Strong Subjects</h4>
                            </div>
                            <div className="space-y-1">
                              {dashboard.strongSubjects.map((subject, idx) => (
                                <div key={idx} className="text-sm text-green-700">{subject}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {dashboard.weakSubjects?.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <h4 className="font-medium text-red-800">Needs Attention</h4>
                            </div>
                            <div className="space-y-1">
                              {dashboard.weakSubjects.map((subject, idx) => (
                                <div key={idx} className="text-sm text-red-700">{subject}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {dashboard.stableSubjects?.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Minus className="h-4 w-4 text-blue-600" />
                              <h4 className="font-medium text-blue-800">Stable Performance</h4>
                            </div>
                            <div className="space-y-1">
                              {dashboard.stableSubjects.map((subject, idx) => (
                                <div key={idx} className="text-sm text-blue-700">{subject}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">AI insights will be generated after analysis</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Select a student and at least two terms, then click "Generate Analysis" to view detailed performance analysis.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {dashboard ? (
              <>
                {/* Report Generation Options */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Generate Reports</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button
                      onClick={exportToPDF}
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">PDF Report</div>
                        <div className="text-sm text-gray-500">Complete evaluation report</div>
                      </div>
                    </button>

                    <button
                      onClick={exportToExcel}
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                        <Download className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Excel Export</div>
                        <div className="text-sm text-gray-500">Spreadsheet format</div>
                      </div>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                        <Printer className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Print Report</div>
                        <div className="text-sm text-gray-500">Direct printing</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Report Preview */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Preview</h3>
                  
                  <div className="space-y-6">
                    {/* Student Header */}
                    <div className="border-b border-gray-200 pb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold">
                          {selectedStudent?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{selectedStudent?.name}</h2>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>Class: {selectedStudent?.className}</span>
                            <span>Section: {selectedStudent?.section}</span>
                            <span>Roll: {selectedStudent?.rollNo}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-600">
                          {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.average || 'N/A'}%
                        </div>
                        <div className="text-sm text-gray-500">Average Score</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.gpa?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">GPA</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          #{dashboard.summary?.averages?.[dashboard.summary.averages.length - 1]?.rank || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Class Rank</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {dashboard.attendance?.percentage || 'N/A'}%
                        </div>
                        <div className="text-sm text-gray-500">Attendance</div>
                      </div>
                    </div>

                    {/* Subject Performance Table */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Subject Performance</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">Subject</th>
                              {selectedExams.map((exam) => (
                                <th key={exam._id} className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">
                                  {exam.examName}
                                </th>
                              ))}
                              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {dashboard.subjects.map((subject) => {
                              const latestStat = subject.stats[subject.stats.length - 1];
                              return (
                                <tr key={subject.subject}>
                                  <td className="px-4 py-3 text-base font-bold text-gray-900">{subject.subject}</td>
                                  {subject.stats.map((stat, idx) => (
                                    <td key={idx} className="px-4 py-3 text-base font-semibold text-gray-900">
                                      {getDisplayValue(stat, displayMode)}
                                    </td>
                                  ))}
                                  <td className="px-4 py-3 text-sm">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(latestStat?.grade)}`}>
                                      {latestStat?.grade || 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* AI Summary */}
                    {dashboard.aiSummary && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Performance Analysis</h4>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                          <p className="text-gray-700">{dashboard.aiSummary}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <Download className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Available</h3>
                <p className="text-gray-500 text-center max-w-md">
                  Generate analysis first to access report generation and export options.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationDashboard;