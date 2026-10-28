import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { attendanceAPI, classAPI, examAPI, studentAPI } from '../services/api';
import { Download, FileUp } from 'lucide-react';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const getStudentId = (student) => String(student?._id || student || '');
const getAdmissionNumber = (student) => student?.emisCode || student?.studentCode || student?.symbolNo || '-';
const getDateRangeDays = (startDate, endDate) => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
  if (start.toISOString().slice(0, 10) !== startDate || end.toISOString().slice(0, 10) !== endDate) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
};

const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [examId, setExamId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState({});
  const [search, setSearch] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyRecords, setDailyRecords] = useState({});
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [classResponse, examResponse] = await Promise.all([classAPI.getAll(), examAPI.getAll()]);
        setClasses(classResponse.data?.classes || []);
        setExams(examResponse.data?.exams || []);
      } catch (loadError) {
        console.error('Unable to load attendance options:', loadError);
        setError(loadError.response?.data?.message || 'Unable to load classes and exams.');
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const selectedExam = exams.find((exam) => exam._id === examId);
  const sections = [...(classes.find((item) => item.className === className)?.sections || [])].sort(collator.compare);
  const availableExams = exams
    .filter((exam) =>
      exam.classExamConfigs?.some((config) => config.className === className)
      || exam.applicableClasses?.includes(className)
      || (exam.classSelectionMode === 'allClasses' && className)
    )
    .sort((first, second) => collator.compare(first.examName || '', second.examName || ''));
  const currentSummaryKey = [examId, className, section, fromDate, toDate].join('|');
  const dateRangeDays = getDateRangeDays(fromDate, toDate);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const query = search.trim().toLowerCase();
    return !query
      || student.name?.toLowerCase().includes(query)
      || String(student.rollNo ?? '').toLowerCase().includes(query)
      || String(getAdmissionNumber(student)).toLowerCase().includes(query);
  }), [students, search]);

  useEffect(() => {
    const examAppliesToClass = exams.some((exam) =>
      exam._id === examId && (
        exam.classExamConfigs?.some((config) => config.className === className)
        || exam.applicableClasses?.includes(className)
        || exam.classSelectionMode === 'allClasses'
      )
    );
    if (examId && examAppliesToClass) return;
    if (examId) {
      setExamId('');
      setStudents([]);
      setEntries({});
      setLoadedKey('');
    }
  }, [className, exams, examId]);

  const importRoster = async () => {
    if (!className || !selectedExam) {
      setError('Select a class and exam before importing the class roster.');
      return;
    }
    if (!dateRangeDays) {
      setError('Select a valid start and end date.');
      return;
    }
    setLoadingRoster(true);
    setError('');
    setMessage('');
    try {
      const rosterParams = {
        className,
        academicYear: selectedExam.academicYear,
        ...(section ? { section } : {}),
      };
      const rosterResponse = await studentAPI.getAll(rosterParams);
      const roster = [...(rosterResponse.data?.students || [])].sort((first, second) =>
        (Number(first.rollNo) || Number.MAX_SAFE_INTEGER) - (Number(second.rollNo) || Number.MAX_SAFE_INTEGER)
        || collator.compare(first.name || '', second.name || '')
      );
      if (!roster.length) {
        setStudents([]);
        setEntries({});
        setLoadedKey('');
        setError('No students were found in this class and exam year.');
        return;
      }

      const initialEntries = Object.fromEntries(roster.map((student) => [
        getStudentId(student),
        { presentDays: '', absentDays: '', remarks: '' },
      ]));
      let existingSummary = null;
      if (dateRangeDays) {
        const summaryResponse = await attendanceAPI.getSummary({
          examId,
          className,
          section,
          fromDate,
          toDate,
        });
        existingSummary = summaryResponse.data?.summary;
      }
      if (existingSummary) {
        setWorkingDays(String(existingSummary.workingDays));
        existingSummary.records?.forEach((record) => {
          const studentId = getStudentId(record.person);
          if (initialEntries[studentId]) {
            initialEntries[studentId] = {
              presentDays: String(record.presentDays),
              absentDays: String(record.absentDays),
              remarks: record.remarks || '',
            };
          }
        });
        setMessage('Saved attendance summary loaded. You can edit and save it again.');
      } else {
        setMessage(`Imported ${roster.length} student${roster.length === 1 ? '' : 's'}. Enter present days for each student.`);
      }
      setStudents(roster);
      setEntries(initialEntries);
      setLoadedKey(currentSummaryKey);
    } catch (loadError) {
      console.error('Unable to import attendance roster:', loadError);
      setError(loadError.response?.data?.message || 'Unable to import students for attendance.');
    } finally {
      setLoadingRoster(false);
    }
  };

  const updateDayCount = (studentId, field, rawValue) => {
    const value = rawValue === '' ? '' : Number(rawValue);
    const otherField = field === 'presentDays' ? 'absentDays' : 'presentDays';
    const numericWorkingDays = Number(workingDays);
    setEntries((previous) => {
      const current = previous[studentId] || { presentDays: '', absentDays: '', remarks: '' };
      let otherValue = current[otherField];
      if (rawValue === '') {
        otherValue = '';
      } else if (Number.isInteger(value) && Number.isInteger(numericWorkingDays)
        && value >= 0 && value <= numericWorkingDays) {
        otherValue = String(numericWorkingDays - value);
      }
      return {
        ...previous,
        [studentId]: { ...current, [field]: rawValue === '' ? '' : String(value), [otherField]: otherValue },
      };
    });
  };

  const setAllPresent = () => {
    const days = Number(workingDays);
    if (!Number.isInteger(days) || days < 1 || days > dateRangeDays) {
      setError('Enter a positive whole number of working days first.');
      return;
    }
    setEntries((previous) => Object.fromEntries(students.map((student) => [
      getStudentId(student),
      { ...(previous[getStudentId(student)] || {}), presentDays: String(days), absentDays: '0' },
    ])));
    setError('');
  };

  const resetSummary = () => {
    setEntries(Object.fromEntries(students.map((student) => [
      getStudentId(student),
      { presentDays: '', absentDays: '', remarks: '' },
    ])));
    setSearch('');
    setError('');
    setMessage('Attendance entries reset. Enter each student attendance before saving.');
  };

  const saveSummary = async () => {
    if (!students.length || loadedKey !== currentSummaryKey) {
      setError('Import the student roster for the selected class, exam, and date range before saving.');
      return;
    }
    if (!dateRangeDays) {
      setError('Select a valid start and end date.');
      return;
    }
    const totalDays = Number(workingDays);
    if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > dateRangeDays) {
      setError(`Working days must be between 1 and ${dateRangeDays}.`);
      return;
    }
    const records = students.map((student) => {
      const entry = entries[getStudentId(student)] || {};
      return {
        person: student._id,
        presentDays: entry.presentDays === '' ? NaN : Number(entry.presentDays),
        absentDays: entry.absentDays === '' ? NaN : Number(entry.absentDays),
        remarks: entry.remarks || '',
      };
    });
    const invalid = records.find((record) =>
      !Number.isInteger(record.presentDays) || !Number.isInteger(record.absentDays)
      || record.presentDays < 0 || record.absentDays < 0
      || record.presentDays + record.absentDays !== totalDays
    );
    if (invalid) {
      setError(`For every student, present days and absent days must add up to ${totalDays}.`);
      return;
    }

    setSavingSummary(true);
    setError('');
    setMessage('');
    try {
      await attendanceAPI.saveSummary({
        examId,
        className,
        section,
        fromDate,
        toDate,
        workingDays: totalDays,
        records,
      });
      setMessage('Attendance summary saved successfully.');
    } catch (saveError) {
      console.error('Unable to save attendance summary:', saveError);
      setError(saveError.response?.data?.message || 'Unable to save attendance summary.');
    } finally {
      setSavingSummary(false);
    }
  };

  const downloadExcelTemplate = async () => {
    if (!examId || !className) {
      setError('Select a class and exam before downloading the Excel template.');
      return;
    }
    setError('');
    try {
      const response = await attendanceAPI.downloadSummaryTemplate({ examId, className, section });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `attendance-${className}-${section || 'all-sections'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (downloadError) {
      console.error('Unable to download attendance template:', downloadError);
      setError(downloadError.response?.data?.message || 'Unable to download the Excel template.');
    }
  };

  const importAttendanceExcel = async () => {
    if (!attendanceFile) {
      setError('Choose an Excel attendance file first.');
      return;
    }
    if (!className || !examId) {
      setError('Select a class and exam before importing Excel.');
      return;
    }
    if (!dateRangeDays) {
      setError('Select a valid start and end date before importing Excel.');
      return;
    }
    const formData = new FormData();
    formData.append('file', attendanceFile);
    formData.append('examId', examId);
    formData.append('className', className);
    formData.append('section', section);
    formData.append('fromDate', fromDate);
    formData.append('toDate', toDate);
    if (workingDays !== '') formData.append('workingDays', workingDays);

    setImportingExcel(true);
    setError('');
    setMessage('');
    try {
      const response = await attendanceAPI.importSummaryExcel(formData);
      const rosterResponse = await studentAPI.getAll({
        className,
        academicYear: selectedExam.academicYear,
        ...(section ? { section } : {}),
      });
      const roster = [...(rosterResponse.data?.students || [])].sort((first, second) =>
        (Number(first.rollNo) || Number.MAX_SAFE_INTEGER) - (Number(second.rollNo) || Number.MAX_SAFE_INTEGER)
        || collator.compare(first.name || '', second.name || '')
      );
      if (!roster.length) {
        setError('No students were found in this class and exam year.');
        return;
      }
      const importedEntries = Object.fromEntries(roster.map((student) => [
        getStudentId(student),
        { presentDays: '', absentDays: '', remarks: '' },
      ]));
      response.data.records.forEach((record) => {
        const studentId = getStudentId(record.person);
        if (importedEntries[studentId]) {
          importedEntries[studentId] = {
          ...importedEntries[studentId],
          presentDays: String(record.presentDays),
          absentDays: String(record.absentDays),
          };
        }
      });
      setWorkingDays(String(response.data.workingDays));
      setStudents(roster);
      setEntries(importedEntries);
      setLoadedKey(currentSummaryKey);
      setAttendanceFile(null);
      setMessage(`${response.data.message || 'Excel attendance imported.'} Working days: ${response.data.workingDays}. Review and save.`);
    } catch (importError) {
      console.error('Unable to import attendance Excel:', importError);
      const serverErrors = importError.response?.data?.errors;
      setError(serverErrors?.length
        ? `${importError.response?.data?.message || 'Excel import failed.'} ${serverErrors.join(' ')}`
        : importError.response?.data?.message || 'Unable to import attendance Excel.');
    } finally {
      setImportingExcel(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'daily' || !className) {
      setDailyRecords({});
      return undefined;
    }
    let active = true;
    const loadDaily = async () => {
      setDailyLoading(true);
      try {
        const [studentsResponse, attendanceResponse] = await Promise.all([
          studentAPI.getAll({
            className,
            ...(section ? { section } : {}),
          }),
          attendanceAPI.getAll({ type: 'student', className, section, date: dailyDate }),
        ]);
        if (!active) return;
        const dailyStudents = studentsResponse.data?.students || [];
        setStudents(dailyStudents);
        const savedRecords = attendanceResponse.data?.attendance?.[0]?.records || [];
        setDailyRecords(Object.fromEntries(savedRecords.map((record) => [
          getStudentId(record.person),
          record.status,
        ])));
      } catch (loadError) {
        console.error('Unable to load daily attendance:', loadError);
        if (active) setError(loadError.response?.data?.message || 'Unable to load daily attendance.');
      } finally {
        if (active) setDailyLoading(false);
      }
    };
    loadDaily();
    return () => { active = false; };
  }, [activeTab, className, section, dailyDate]);

  const saveDaily = async () => {
    if (!className || !students.length) {
      setError('Select a class with students before saving daily attendance.');
      return;
    }
    setDailySaving(true);
    setError('');
    setMessage('');
    try {
      await attendanceAPI.save({
        date: dailyDate,
        type: 'student',
        className,
        section,
        records: students.map((student) => ({
          person: student._id,
          personModel: 'Student',
          status: dailyRecords[getStudentId(student)] || 'present',
        })),
      });
      setMessage('Daily attendance saved successfully.');
    } catch (saveError) {
      console.error('Unable to save daily attendance:', saveError);
      setError(saveError.response?.data?.message || 'Unable to save daily attendance.');
    } finally {
      setDailySaving(false);
    }
  };

  const updateClass = (value) => {
    setClassName(value);
    setSection('');
    setExamId('');
    setStudents([]);
    setEntries({});
    setLoadedKey('');
    setError('');
    setMessage('');
  };

  const changeSection = (value) => {
    setSection(value);
    setStudents([]);
    setEntries({});
    setLoadedKey('');
    setError('');
    setMessage('');
  };

  const changeExam = (value) => {
    setExamId(value);
    setStudents([]);
    setEntries({});
    setLoadedKey('');
    setError('');
    setMessage('');
  };

  const orderedClasses = [...classes].sort((first, second) =>
    (Number(first.order) || 0) - (Number(second.order) || 0)
    || collator.compare(first.className || '', second.className || '')
  );

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-slate-900">Attendance Entry</h1>
            <p className="mt-1 text-sm text-slate-500">Enter attendance totals by student for an exam date range, or record attendance by day.</p>
          </div>

          <div className="mb-5 flex gap-2 border-b border-slate-200">
            {[
              { key: 'summary', label: 'Period Attendance Entry' },
              { key: 'daily', label: 'Daily Attendance' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setError(''); setMessage(''); }}
                className={`border-b-2 px-4 py-2.5 text-sm font-semibold ${
                  activeTab === tab.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-slate-600">
                Class
                <select className={`${inputClass} mt-1.5`} value={className} onChange={(event) => updateClass(event.target.value)} disabled={loadingOptions}>
                  <option value="">Select class</option>
                  {orderedClasses.map((item) => <option key={item._id} value={item.className}>{item.className}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Section
                <select className={`${inputClass} mt-1.5`} value={section} onChange={(event) => changeSection(event.target.value)} disabled={!className || !sections.length}>
                  <option value="">All sections</option>
                  {sections.map((item) => <option key={item} value={item}>Section {item}</option>)}
                </select>
              </label>
              {activeTab === 'summary' && (
                <label className="text-xs font-semibold text-slate-600">
                  Exam Type
                  <select className={`${inputClass} mt-1.5`} value={examId} onChange={(event) => changeExam(event.target.value)} disabled={!className || loadingOptions}>
                    <option value="">Select exam</option>
                    {availableExams.map((exam) => <option key={exam._id} value={exam._id}>{exam.examName}</option>)}
                  </select>
                </label>
              )}
              {activeTab === 'summary' ? (
                <>
                  <label className="text-xs font-semibold text-slate-600">
                    From Date
                    <input type="date" className={`${inputClass} mt-1.5`} value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setLoadedKey(''); }} />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    To Date
                    <input type="date" className={`${inputClass} mt-1.5`} value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setLoadedKey(''); }} />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Working Days
                    <input type="number" min="1" max={dateRangeDays || undefined} step="1" className={`${inputClass} mt-1.5`} value={workingDays} onChange={(event) => {
                      const nextValue = event.target.value;
                      setWorkingDays(nextValue);
                      if (nextValue === '') return;
                      const nextWorkingDays = Number(nextValue);
                      if (!Number.isInteger(nextWorkingDays) || nextWorkingDays < 1 || nextWorkingDays > dateRangeDays) return;
                      setEntries((previous) => Object.fromEntries(Object.entries(previous).map(([studentId, entry]) => {
                        const presentDays = Number(entry.presentDays);
                        return [
                          studentId,
                          {
                            ...entry,
                            absentDays: Number.isInteger(presentDays) && presentDays <= nextWorkingDays
                              ? String(nextWorkingDays - presentDays)
                              : '',
                          },
                        ];
                      })));
                    }} placeholder={dateRangeDays ? `1–${dateRangeDays}` : 'Select date range first'} />
                    {dateRangeDays > 0 && <span className="mt-1 block text-[11px] font-normal text-slate-400">Maximum for this date range: {dateRangeDays} days</span>}
                  </label>
                </>
              ) : (
                <label className="text-xs font-semibold text-slate-600">
                  Attendance Date
                  <input type="date" className={`${inputClass} mt-1.5`} value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} />
                </label>
              )}
            </div>

            {activeTab === 'summary' ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-500">
                  {students.length ? `${students.length} student${students.length === 1 ? '' : 's'} loaded · Excel Att. accepts present/working days (e.g. 92/92); absent days are calculated. Present + absent must equal working days.` : 'Select class, exam, and dates, then import the Excel file or roster.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={importRoster} disabled={loadingRoster || !className || !examId} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {loadingRoster ? 'Importing...' : 'Import'}
                  </button>
                  <button type="button" onClick={downloadExcelTemplate} disabled={!className || !examId} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    <Download size={15} /> Excel Template
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-50">
                    <FileUp size={15} /> {attendanceFile?.name || 'Choose Excel'}
                    <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(event) => setAttendanceFile(event.target.files?.[0] || null)} />
                  </label>
                  <button type="button" onClick={importAttendanceExcel} disabled={!attendanceFile || !className || !examId || importingExcel} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {importingExcel ? 'Importing Excel...' : 'Import Excel'}
                  </button>
                  <button type="button" onClick={resetSummary} disabled={!students.length} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    Reset
                  </button>
                  <button type="button" onClick={saveSummary} disabled={!students.length || savingSummary || loadedKey !== currentSummaryKey} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {savingSummary ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                <button type="button" onClick={saveDaily} disabled={!students.length || dailyLoading || dailySaving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {dailySaving ? 'Saving...' : 'Save Daily Attendance'}
                </button>
              </div>
            )}
          </section>

          {activeTab === 'summary' ? (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {students.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500">Imported students will appear here.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3">
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, roll, or admission no." className={`${inputClass} max-w-sm`} />
                    <button type="button" onClick={setAllPresent} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Set all present
                    </button>
                  </div>
                  <div className="max-h-[70vh] overflow-auto">
                    <table className="min-w-[900px] w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase text-slate-600">
                        <tr>
                          <th className="border border-slate-200 px-3 py-3">Roll No.</th>
                          {section === '' && sections.length > 1 && <th className="border border-slate-200 px-3 py-3">Section</th>}
                          <th className="border border-slate-200 px-3 py-3">Admission No.</th>
                          <th className="border border-slate-200 px-3 py-3">Name</th>
                          <th className="w-40 border border-slate-200 px-3 py-3">Present Days</th>
                          <th className="w-40 border border-slate-200 px-3 py-3">Absent Days</th>
                          <th className="min-w-72 border border-slate-200 px-3 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => {
                          const studentId = getStudentId(student);
                          const entry = entries[studentId] || { presentDays: '', absentDays: '', remarks: '' };
                          return (
                            <tr key={studentId} className="even:bg-slate-50">
                              <td className="border border-slate-100 px-3 py-2">{student.rollNo ?? '-'}</td>
                              {section === '' && sections.length > 1 && <td className="border border-slate-100 px-3 py-2">{student.section || '-'}</td>}
                              <td className="border border-slate-100 px-3 py-2">{getAdmissionNumber(student)}</td>
                              <td className="border border-slate-100 px-3 py-2 font-medium text-slate-800">{student.name}</td>
                              <td className="border border-slate-100 px-2 py-2">
                                <input aria-label={`${student.name} present days`} type="number" min="0" max={workingDays || undefined} step="1" value={entry.presentDays} onChange={(event) => updateDayCount(studentId, 'presentDays', event.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                              </td>
                              <td className="border border-slate-100 px-2 py-2">
                                <input aria-label={`${student.name} absent days`} type="number" min="0" max={workingDays || undefined} step="1" value={entry.absentDays} onChange={(event) => updateDayCount(studentId, 'absentDays', event.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                              </td>
                              <td className="border border-slate-100 px-2 py-2">
                                <input aria-label={`${student.name} remarks`} value={entry.remarks} onChange={(event) => setEntries((previous) => ({
                                  ...previous,
                                  [studentId]: { ...entry, remarks: event.target.value },
                                }))} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStudents.length === 0 && <tr><td colSpan={sections.length > 1 && !section ? 7 : 6} className="px-4 py-8 text-center text-slate-500">No matching students.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {!className ? (
                <div className="py-16 text-center text-sm text-slate-500">Select a class to load its students.</div>
              ) : dailyLoading ? (
                <div className="py-16 text-center text-sm text-slate-500">Loading daily attendance...</div>
              ) : students.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500">No students found for this class.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3 text-left">Roll</th><th className="p-3 text-left">Student</th><th className="p-3 text-left">Admission No.</th><th className="p-3 text-center">Status</th></tr></thead>
                    <tbody>{students.map((student) => {
                      const studentId = getStudentId(student);
                      return (
                        <tr key={studentId} className="border-t border-slate-100">
                          <td className="p-3">{student.rollNo ?? '-'}</td>
                          <td className="p-3 font-medium">{student.name}</td>
                          <td className="p-3">{getAdmissionNumber(student)}</td>
                          <td className="p-3 text-center">
                            <select className="rounded-lg border border-slate-200 px-3 py-1.5" value={dailyRecords[studentId] || 'present'} onChange={(event) => setDailyRecords((previous) => ({ ...previous, [studentId]: event.target.value }))}>
                              <option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="leave">Leave</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;
