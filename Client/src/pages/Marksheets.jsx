import React, { useState, useEffect } from 'react';
import { marksheetAPI, settingsAPI } from '../services/api';
import Layout from '../components/Layout';
import { Trash2, Printer, Eye, Search, FileText, X } from 'lucide-react';

const gradeColor = (grade) => {
  const map = {
    'A+': 'text-emerald-700 bg-emerald-100',
    A: 'text-green-700 bg-green-100',
    B: 'text-blue-700 bg-blue-100',
    C: 'text-yellow-700 bg-yellow-100',
    D: 'text-orange-700 bg-orange-100',
    F: 'text-red-700 bg-red-100',
  };
  return map[grade] || 'text-gray-700 bg-gray-100';
};

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${url}`;
};

const Marksheets = () => {
  const [marksheets, setMarksheets] = useState([]);
  const [filteredMarksheets, setFilteredMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterExamType, setFilterExamType] = useState('');
  const [filterExamTerm, setFilterExamTerm] = useState('');
  const [minGPA, setMinGPA] = useState('');
  const [maxGPA, setMaxGPA] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedMarksheet, setSelectedMarksheet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [printFormat, setPrintFormat] = useState('gpa');

  useEffect(() => { fetchMarksheets(); }, []);
  useEffect(() => {
    settingsAPI.get().then((res) => setSettings(res.data.settings)).catch(() => {});
  }, []);
  useEffect(() => { filterMarksheets(); }, [marksheets, searchTerm, filterClass, filterSection, filterExam, filterExamType, filterExamTerm, minGPA, maxGPA]);

  const fetchMarksheets = async () => {
    try {
      setLoading(true);
      const response = await marksheetAPI.getAll();
      setMarksheets(response.data.marksheets || []);
    } catch (err) {
      setError('Failed to fetch marksheets');
    } finally {
      setLoading(false);
    }
  };

  const classOptions = [...new Set(marksheets.map((m) => m.student?.className).filter(Boolean))].sort();
  const sectionOptions = [...new Set(
    marksheets
      .filter((m) => !filterClass || m.student?.className === filterClass)
      .map((m) => m.student?.section)
      .filter(Boolean)
  )].sort();
  const examOptions = [...new Map(marksheets
    .map((m) => ({ id: m.exam?._id, name: m.exam?.examName }))
    .filter((e) => e.id && e.name)
    .map((e) => [e.id, e])).values()].map(v => v).sort((a,b) => (a.name||'').localeCompare(b.name||''));

  const examTypeOptions = [...new Set(marksheets.map((m) => m.exam?.examType).filter(Boolean))].sort();
  const examTermOptions = [...new Set(marksheets.map((m) => m.exam?.year).filter(Boolean))].sort();

  const filterMarksheets = () => {
    let filtered = marksheets;
    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.student?.rollNo?.toString().includes(searchTerm) ||
          m.exam?.examName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterClass) {
      filtered = filtered.filter((m) => m.student?.className === filterClass);
    }
    if (filterSection) {
      filtered = filtered.filter((m) => m.student?.section === filterSection);
    }
    if (filterExamType) {
      filtered = filtered.filter((m) => (m.exam?.examType || '').toLowerCase() === (filterExamType || '').toLowerCase());
    }
    if (filterExamTerm) {
      filtered = filtered.filter((m) => String(m.exam?.year) === String(filterExamTerm));
    }
    if (filterExam) {
      filtered = filtered.filter((m) => String(m.exam?._id) === String(filterExam));
    }

    // GPA filtering (allow decimal values)
    const min = parseFloat(minGPA);
    const max = parseFloat(maxGPA);
    if (!Number.isNaN(min)) filtered = filtered.filter((m) => Number(m.gpa || 0) >= min);
    if (!Number.isNaN(max)) filtered = filtered.filter((m) => Number(m.gpa || 0) <= max);
    setFilteredMarksheets(filtered);
  };

  const handleDelete = async (id) => {
    try {
      await marksheetAPI.delete(id);
      setMarksheets(marksheets.filter((m) => m._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete marksheet');
    }
  };

  const getDivision = (percentage = 0) => {
    if (percentage >= 80) return 'Distinction';
    if (percentage >= 60) return 'First Division';
    if (percentage >= 45) return 'Second Division';
    if (percentage >= 35) return 'Third Division';
    return 'Fail';
  };

  const getSubjectGrade = (percentage = 0) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getGradePoint = (percentage = 0) => {
    if (percentage >= 90) return '4.0';
    if (percentage >= 80) return '3.6';
    if (percentage >= 70) return '3.2';
    if (percentage >= 60) return '2.8';
    if (percentage >= 50) return '2.4';
    if (percentage >= 40) return '2.0';
    return '0.0';
  };

  const getExamSubject = (marksheet, subjectName) =>
    marksheet.exam?.classExamConfigs
      ?.flatMap((config) => config.subjects || [])
      ?.find((subject) => subject.subjectName === subjectName);

  const getCreditHour = (marksheet, mark) => {
    const examSubject = getExamSubject(marksheet, mark.subject);
    return Number(mark.creditHour || examSubject?.creditHour || 0) || '-';
  };

  const getPartGradePoint = (obtained = 0, fullMarks = 0) => {
    if (!fullMarks) return '-';
    return getGradePoint((Number(obtained || 0) / Number(fullMarks)) * 100);
  };

  const getFormatTitle = (format) => ({
    gpa: 'GPA GRADE SHEET',
    division: 'DIVISION MARKSHEET',
    marks: 'MARKS ONLY SHEET',
    grade: 'GRADE SHEET',
  }[format] || 'MARKSHEET');

  const buildPrintTable = (marksheet, format) => {
    if (format === 'marks') {
      return `
        <thead><tr><th>Subject</th><th>Theory</th><th>Practical</th><th>Total Marks</th><th>Full Marks</th><th>Pass Marks</th><th>Status</th></tr></thead>
        <tbody>${marksheet.marks?.map((m) => {
          const obtained = m.theory + m.practical;
          return `<tr><td>${m.subject}</td><td>${m.theory}</td><td>${m.practical}</td><td><strong>${obtained}</strong></td><td>${m.fullMarks}</td><td>${m.passMarks}</td><td style="color:${obtained >= m.passMarks ? '#16a34a' : '#dc2626'}; font-weight:600">${obtained >= m.passMarks ? 'Pass' : 'Fail'}</td></tr>`;
        }).join('')}</tbody>
      `;
    }
    if (format === 'division') {
      return `
        <thead><tr><th>Subject</th><th>Obtained</th><th>Full Marks</th><th>Pass Marks</th><th>Percentage</th><th>Division</th><th>Status</th></tr></thead>
        <tbody>${marksheet.marks?.map((m) => {
          const obtained = m.theory + m.practical;
          const percentage = m.fullMarks ? (obtained / m.fullMarks) * 100 : 0;
          return `<tr><td>${m.subject}</td><td><strong>${obtained}</strong></td><td>${m.fullMarks}</td><td>${m.passMarks}</td><td>${percentage.toFixed(1)}%</td><td>${getDivision(percentage)}</td><td style="color:${obtained >= m.passMarks ? '#16a34a' : '#dc2626'}; font-weight:600">${obtained >= m.passMarks ? 'Pass' : 'Fail'}</td></tr>`;
        }).join('')}</tbody>
      `;
    }
    if (format === 'grade') {
      return `
        <thead><tr><th>Subject</th><th>Credit Hour</th><th>Obtained GPA</th><th>Grade</th><th>Grade Point</th><th>Remarks</th></tr></thead>
        <tbody>${marksheet.marks?.map((m) => {
          const obtained = m.theory + m.practical;
          const percentage = m.fullMarks ? (obtained / m.fullMarks) * 100 : 0;
          const grade = getSubjectGrade(percentage);
          return `<tr><td>${m.subject}</td><td>${getCreditHour(marksheet, m)}</td><td>${getGradePoint(percentage)}</td><td><strong>${grade}</strong></td><td>${getGradePoint(percentage)}</td><td>${obtained >= m.passMarks ? 'Satisfactory' : 'Needs Improvement'}</td></tr>`;
        }).join('')}</tbody>
      `;
    }
    return `
      <thead><tr><th>Subject</th><th>Credit Hour</th><th>Theory GPA</th><th>Practical GPA</th><th>Obtained GPA</th><th>Percentage</th><th>Grade</th><th>Subject GPA</th><th>Status</th></tr></thead>
      <tbody>${marksheet.marks?.map((m) => {
        const examSubject = getExamSubject(marksheet, m.subject);
        const obtained = m.theory + m.practical;
        const percentage = m.fullMarks ? (obtained / m.fullMarks) * 100 : 0;
        const theoryFullMarks = examSubject?.theoryFullMarks || (examSubject?.hasPractical ? m.fullMarks - (examSubject?.practicalFullMarks || 0) : m.fullMarks);
        const practicalFullMarks = examSubject?.hasPractical ? (examSubject?.practicalFullMarks || 0) : 0;
        return `<tr><td>${m.subject}</td><td>${getCreditHour(marksheet, m)}</td><td>${getPartGradePoint(m.theory, theoryFullMarks)}</td><td>${practicalFullMarks ? getPartGradePoint(m.practical, practicalFullMarks) : '-'}</td><td><strong>${getGradePoint(percentage)}</strong></td><td>${percentage.toFixed(1)}%</td><td>${getSubjectGrade(percentage)}</td><td>${getGradePoint(percentage)}</td><td style="color:${obtained >= m.passMarks ? '#16a34a' : '#dc2626'}; font-weight:600">${obtained >= m.passMarks ? 'Pass' : 'Fail'}</td></tr>`;
      }).join('')}</tbody>
    `;
  };

  const handlePrint = (marksheet, format = printFormat) => {
    const printWindow = window.open('', '_blank');
    const schoolName = settings?.schoolName || 'EduAdmin School';
    const schoolAddress = settings?.address || 'Academic Excellence Institute';
    const logoUrl = getImageUrl(settings?.logoUrl);
    const signatureUrl = getImageUrl(settings?.headTeacherSignatureUrl);
    const headTeacherName = settings?.headTeacherName || settings?.principalName || 'Head Teacher';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Marksheet - ${marksheet.student?.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1f2937; background: #fff; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #4f46e5; }
            .logo { width: 76px; height: 76px; object-fit: contain; }
            .logo-placeholder { width: 76px; height: 76px; border-radius: 16px; background: #eef2ff; }
            .school-name { font-size: 26px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
            .school-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .title { font-size: 18px; font-weight: 700; margin-top: 12px; color: #111827; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 20px 0; background: #f9fafb; padding: 16px; border-radius: 10px; }
            .info-item { display: flex; gap: 8px; font-size: 13px; }
            .info-label { font-weight: 600; color: #374151; min-width: 110px; }
            .info-value { color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #4f46e5; color: white; padding: 10px 14px; text-align: center; font-weight: 600; }
            th:first-child { text-align: left; }
            td { padding: 9px 14px; border-bottom: 1px solid #e5e7eb; text-align: center; }
            td:first-child { text-align: left; font-weight: 500; }
            tr:hover td { background: #f9fafb; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
            .summary-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; }
            .summary-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-value { font-size: 22px; font-weight: 800; color: #4f46e5; margin-top: 4px; }
            .result { text-align: center; margin: 16px 0; font-size: 18px; font-weight: 800; padding: 12px; border-radius: 10px; }
            .pass { color: #16a34a; background: #f0fdf4; }
            .fail { color: #dc2626; background: #fef2f2; }
            .signature-row { display: flex; justify-content: flex-end; margin-top: 40px; }
            .signature-box { width: 210px; text-align: center; font-size: 12px; color: #374151; }
            .signature-img { height: 54px; object-fit: contain; margin-bottom: 8px; }
            .signature-line { border-top: 1px solid #111827; padding-top: 6px; font-weight: 600; }
            .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>${logoUrl ? `<img src="${logoUrl}" class="logo" />` : '<div class="logo-placeholder"></div>'}</div>
              <div>
                <div class="school-name">${schoolName}</div>
                <div class="school-sub">${schoolAddress}</div>
                <div class="title">${getFormatTitle(format)}</div>
              </div>
              <div></div>
            </div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Student Name:</span><span class="info-value">${marksheet.student?.name}</span></div>
              <div class="info-item"><span class="info-label">Roll Number:</span><span class="info-value">${marksheet.student?.rollNo}</span></div>
              <div class="info-item"><span class="info-label">Class:</span><span class="info-value">${marksheet.student?.className}</span></div>
              <div class="info-item"><span class="info-label">Section:</span><span class="info-value">${marksheet.student?.section}</span></div>
              <div class="info-item"><span class="info-label">Exam:</span><span class="info-value">${marksheet.exam?.examName}</span></div>
              <div class="info-item"><span class="info-label">Year:</span><span class="info-value">${marksheet.exam?.year}</span></div>
            </div>
            <table>
              ${buildPrintTable(marksheet, format)}
            </table>
            <div class="summary">
              <div class="summary-box"><div class="summary-label">Total Marks</div><div class="summary-value">${marksheet.totalMarks}/${marksheet.totalFullMarks}</div></div>
              <div class="summary-box"><div class="summary-label">Percentage</div><div class="summary-value">${marksheet.percentage?.toFixed(2)}%</div></div>
              <div class="summary-box"><div class="summary-label">${format === 'division' ? 'Division' : 'Grade'}</div><div class="summary-value">${format === 'division' ? getDivision(marksheet.percentage) : marksheet.grade}</div></div>
              <div class="summary-box"><div class="summary-label">${format === 'marks' ? 'Result' : 'GPA'}</div><div class="summary-value">${format === 'marks' ? marksheet.result : marksheet.gpa?.toFixed(2)}</div></div>
            </div>
            <div class="result ${marksheet.result === 'Pass' ? 'pass' : 'fail'}">RESULT: ${marksheet.result?.toUpperCase()}</div>
            <div class="signature-row">
              <div class="signature-box">
                ${signatureUrl ? `<img src="${signatureUrl}" class="signature-img" />` : '<div style="height:54px"></div>'}
                <div class="signature-line">${headTeacherName}</div>
                <div>Head Teacher</div>
              </div>
            </div>
            <div class="footer">
              <p>This is an official document. Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Marksheets</h1>
          <p className="text-gray-400 text-sm mt-1">{marksheets.length} marksheets generated</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                placeholder="Search by student, roll, or exam..."
              />
            </div>
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
            >
              <option value="">Filter by class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
              disabled={!filterClass}
            >
              <option value="">Filter by section</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
            >
              <option value="">Filter by exam</option>
              {examOptions.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <select
              value={printFormat}
              onChange={(e) => setPrintFormat(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
            >
              <option value="gpa">GPA System</option>
              <option value="division">Division System</option>
              <option value="marks">Marks Only</option>
              <option value="grade">Grade Sheet Design</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredMarksheets.length === 0 ? (
              <div className="py-16 text-center">
                <FileText size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No marksheets found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Student', 'Class', 'Exam', 'Marks', 'Percentage', 'Grade', 'Result', 'Actions'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMarksheets.map((ms) => (
                      <tr key={ms._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                              {ms.student?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800">{ms.student?.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{ms.student?.className}</td>
                        <td className="px-5 py-3.5 text-gray-600">{ms.exam?.examName}</td>
                        <td className="px-5 py-3.5 text-gray-700 font-medium">{ms.totalMarks}/{ms.totalFullMarks}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-800">{ms.percentage?.toFixed(1)}%</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${gradeColor(ms.grade)}`}>{ms.grade}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ms.result === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {ms.result}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedMarksheet(ms)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="View">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => handlePrint(ms)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition" title="Print">
                              <Printer size={16} />
                            </button>
                            <button onClick={() => setDeleteConfirm(ms._id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition" title="Delete">
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
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Marksheet?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {selectedMarksheet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedMarksheet.student?.name}</h3>
                <p className="text-sm text-gray-400">{selectedMarksheet.exam?.examName} · {selectedMarksheet.student?.className} · {getFormatTitle(printFormat)}</p>
              </div>
              <button onClick={() => setSelectedMarksheet(null)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Roll No', value: selectedMarksheet.student?.rollNo },
                  { label: 'Section', value: selectedMarksheet.student?.section },
                  { label: 'Exam Year', value: selectedMarksheet.exam?.year },
                  { label: 'GPA', value: selectedMarksheet.gpa?.toFixed(2) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="font-bold text-gray-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Marks Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table
                  className="w-full text-sm [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-gray-500 [&_th]:text-center [&_th:first-child]:text-left [&_th]:bg-gray-50 [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-center [&_td:first-child]:text-left [&_td:first-child]:font-medium [&_td:first-child]:text-gray-800 [&_td]:border-t [&_td]:border-gray-50"
                  dangerouslySetInnerHTML={{ __html: buildPrintTable(selectedMarksheet, printFormat) }}
                />
              </div>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total', value: `${selectedMarksheet.totalMarks}/${selectedMarksheet.totalFullMarks}` },
                  { label: 'Percentage', value: `${selectedMarksheet.percentage?.toFixed(1)}%` },
                  { label: 'Grade', value: selectedMarksheet.grade },
                  { label: 'Result', value: selectedMarksheet.result },
                ].map(({ label, value }) => (
                  <div key={label} className={`rounded-xl p-3 text-center border ${label === 'Result' ? (selectedMarksheet.result === 'Pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-indigo-50 border-indigo-100'}`}>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className={`font-bold mt-0.5 ${label === 'Result' ? (selectedMarksheet.result === 'Pass' ? 'text-green-700' : 'text-red-700') : 'text-indigo-700'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => handlePrint(selectedMarksheet)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition text-sm font-semibold"
              >
                <Printer size={16} /> Print Marksheet
              </button>
              <button
                onClick={() => setSelectedMarksheet(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Marksheets;
