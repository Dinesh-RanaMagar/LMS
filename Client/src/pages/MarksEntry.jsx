import React, { useState, useEffect, useRef } from 'react';
import { marksheetAPI, examAPI, studentAPI } from '../services/api';
import Layout from '../components/Layout';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition';
const markInputClass = 'w-20 px-2.5 py-1.5 border border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed';

const MarksEntry = () => {
  const [mode, setMode] = useState('single');
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [singleClass, setSingleClass] = useState('');
  const [singleSection, setSingleSection] = useState('');
  const [singleSearchTerm, setSingleSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [bulkSearchTerm, setBulkSearchTerm] = useState('');
  const [selectedBulkSubjects, setSelectedBulkSubjects] = useState([]);
  const [marks, setMarks] = useState([]);
  const [bulkMarks, setBulkMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRefs = useRef({});

  const selectedExamObj = exams.find((e) => e._id === selectedExam);
  const selectedClassConfig = selectedExamObj?.classExamConfigs?.find((cfg) => cfg.className === selectedClass);
  const subjects = selectedClassConfig?.subjects || [];
  const selectedSubjectConfigs = selectedBulkSubjects.map((name) => subjects.find((subject) => subject.subjectName === name)).filter(Boolean);

  useEffect(() => {
    fetchExams();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedExam) fetchExamDetails(selectedExam);
    else setMarks([]);
  }, [selectedExam]);

  useEffect(() => {
    if (mode === 'single' && selectedExam && selectedStudent && selectedExamObj) {
      loadStudentMarks();
    }
  }, [mode, selectedExam, selectedStudent, selectedExamObj]);

  useEffect(() => {
    setSelectedSection('');
    setSelectedBulkSubjects([]);
    setBulkMarks({});
  }, [selectedClass]);

  useEffect(() => {
    setBulkMarks({});
  }, [selectedSection, selectedBulkSubjects]);

  useEffect(() => {
    if (mode === 'bulk' && selectedExam && selectedClass && selectedBulkSubjects.length > 0) {
      loadBulkMarks();
    }
  }, [mode, selectedExam, selectedClass, selectedSection, selectedBulkSubjects.join('|')]);

  const fetchExams = async () => {
    try {
      const response = await examAPI.getAll();
      setExams(response.data.exams || []);
    } catch (err) {
      console.error('Failed to fetch exams', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await studentAPI.getAll();
      setStudents(response.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const toMarkItem = (subject) => ({
    subject: subject.subjectName,
    theory: 0,
    practical: 0,
    fullMarks: subject.fullMarks,
    passMarks: subject.passMarks,
    hasPractical: subject.hasPractical,
    theoryFullMarks: subject.theoryFullMarks || subject.fullMarks,
    theoryPassMarks: subject.theoryPassMarks || subject.passMarks,
    practicalFullMarks: subject.practicalFullMarks || 0,
    practicalPassMarks: subject.practicalPassMarks || 0,
  });

  const fetchExamDetails = async (examId) => {
    try {
      setLoading(true);
      const response = await examAPI.getById(examId);
      const exam = response.data.exam;
      setExams((current) => current.map((item) => item._id === exam._id ? exam : item));
      const allSubjects = exam.classExamConfigs?.flatMap((cfg) => cfg.subjects || []) || [];
      const uniqueSubjects = allSubjects.filter(
        (subject, index, arr) => arr.findIndex((item) => item.subjectName === subject.subjectName) === index
      );
      setMarks(uniqueSubjects.map(toMarkItem));
      if (!selectedClass) setSelectedClass(exam.applicableClasses?.[0] || '');
    } catch (err) {
      setError('Failed to fetch exam details');
    } finally {
      setLoading(false);
    }
  };

  const mergeExistingMarks = (defaultMarks, existingMarks = []) =>
    defaultMarks.map((mark) => {
      const existing = existingMarks.find((item) => item.subject === mark.subject);
      return existing
        ? {
            ...mark,
            theory: Number(existing.theory || 0),
            practical: mark.hasPractical ? Number(existing.practical || 0) : 0,
          }
        : mark;
    });

  const loadStudentMarks = async () => {
    try {
      setLoading(true);
      const defaultMarks = selectedExamObj.classExamConfigs
        ?.flatMap((cfg) => cfg.subjects || [])
        ?.filter((subject, index, arr) => arr.findIndex((item) => item.subjectName === subject.subjectName) === index)
        ?.map(toMarkItem) || [];
      try {
        const response = await marksheetAPI.getByStudentExam(selectedStudent, selectedExam);
        setMarks(mergeExistingMarks(defaultMarks, response.data.marksheet.marks || []));
      } catch (err) {
        if (err.response?.status === 404) setMarks(defaultMarks);
        else throw err;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load existing marks');
    } finally {
      setLoading(false);
    }
  };

  const loadBulkMarks = async () => {
    try {
      const nextBulkMarks = {};
      await Promise.all(filteredStudents.map(async (student) => {
        try {
          const response = await marksheetAPI.getByStudentExam(student._id, selectedExam);
          const existingMarks = response.data.marksheet.marks || [];
          selectedBulkSubjects.forEach((subjectName) => {
            const existing = existingMarks.find((mark) => mark.subject === subjectName);
            if (!existing) return;
            nextBulkMarks[student._id] = {
              ...nextBulkMarks[student._id],
              [subjectName]: {
                theory: Number(existing.theory || 0),
                practical: Number(existing.practical || 0),
              },
            };
          });
        } catch (err) {
          if (err.response?.status !== 404) throw err;
        }
      }));
      setBulkMarks(nextBulkMarks);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load existing bulk marks');
    }
  };

  const classOptions = selectedExamObj?.applicableClasses || [];
  const sectionOptions = [...new Set(students
    .filter((student) => student.className === selectedClass)
    .map((student) => student.section)
    .filter(Boolean))].sort();

  const filteredStudents = selectedExam
    ? students.filter((student) => {
        const classMatch = selectedClass ? student.className === selectedClass : selectedExamObj?.applicableClasses?.includes(student.className);
        const sectionMatch = selectedSection ? student.section === selectedSection : true;
        const searchMatch = bulkSearchTerm
          ? student.name.toLowerCase().includes(bulkSearchTerm.toLowerCase()) || String(student.rollNo || '').includes(bulkSearchTerm)
          : true;
        return classMatch && sectionMatch && searchMatch;
      }).sort((a, b) => Number(a.rollNo || 99999) - Number(b.rollNo || 99999) || a.name.localeCompare(b.name))
    : students;

  const singleClassOptions = selectedExamObj?.applicableClasses || [];
  const singleSectionOptions = [...new Set(students
    .filter((student) => student.className === singleClass)
    .map((student) => student.section)
    .filter(Boolean))].sort();
  const singleFilteredStudents = selectedExam
    ? students.filter((student) => {
        const classMatch = singleClass ? student.className === singleClass : selectedExamObj?.applicableClasses?.includes(student.className);
        const sectionMatch = singleSection ? student.section === singleSection : true;
        const searchMatch = singleSearchTerm
          ? student.name.toLowerCase().includes(singleSearchTerm.toLowerCase()) || String(student.rollNo || '').includes(singleSearchTerm)
          : true;
        return classMatch && sectionMatch && searchMatch;
      }).sort((a, b) => Number(a.rollNo || 99999) - Number(b.rollNo || 99999) || a.name.localeCompare(b.name))
    : students;

  const validateDate = () => {
    if (selectedExamObj?.marksEntryLastDate && new Date() > new Date(selectedExamObj.marksEntryLastDate)) {
      setError('Marks entry last date has passed for this exam');
      return false;
    }
    return true;
  };

  const handleSingleMarkChange = (index, field, value) => {
    const numberValue = Number(value);
    const mark = marks[index];
    const max = field === 'theory'
      ? (mark.hasPractical ? mark.theoryFullMarks : mark.fullMarks)
      : mark.practicalFullMarks;

    if (numberValue > max) {
      setError(`${mark.subject}: ${field} mark cannot be more than full mark (${max})`);
      return;
    }

    setError('');
    setMarks((current) => current.map((item, idx) => idx === index ? { ...item, [field]: numberValue } : item));
  };

  const addBulkSubject = (subjectName) => {
    if (!subjectName || selectedBulkSubjects.includes(subjectName)) return;
    setSelectedBulkSubjects((current) => [...current, subjectName]);
  };

  const addAllBulkSubjects = () => {
    setSelectedBulkSubjects(subjects.map((subject) => subject.subjectName));
  };

  const removeBulkSubject = (subjectName) => {
    setSelectedBulkSubjects((current) => current.filter((item) => item !== subjectName));
    setBulkMarks((current) => {
      const next = { ...current };
      Object.keys(next).forEach((studentId) => {
        if (next[studentId]) {
          const row = { ...next[studentId] };
          delete row[subjectName];
          next[studentId] = row;
        }
      });
      return next;
    });
  };

  const handleBulkMarkChange = (studentId, subjectName, field, value) => {
    const subjectConfig = subjects.find((subject) => subject.subjectName === subjectName);
    if (!subjectConfig) return;
    const numberValue = Number(value);
    const max = field === 'theory'
      ? (subjectConfig.hasPractical ? subjectConfig.theoryFullMarks : subjectConfig.fullMarks)
      : subjectConfig.practicalFullMarks;

    if (numberValue > max) {
      setError(`${subjectName}: ${field} mark cannot be more than full mark (${max})`);
      return;
    }

    setError('');
    setBulkMarks((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [subjectName]: {
          theory: field === 'theory' ? numberValue : Number(current[studentId]?.[subjectName]?.theory || 0),
          practical: field === 'practical' ? numberValue : Number(current[studentId]?.[subjectName]?.practical || 0),
        },
      },
    }));
  };

  const focusCell = (rowIndex, subjectIndex, field) => {
    const key = `${rowIndex}-${subjectIndex}-${field}`;
    inputRefs.current[key]?.focus();
    inputRefs.current[key]?.select();
  };

  const handleBulkKeyDown = (event, rowIndex, subjectIndex, field) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const subjectConfig = selectedSubjectConfigs[subjectIndex];
    if (field === 'theory' && subjectConfig?.hasPractical) {
      focusCell(rowIndex, subjectIndex, 'practical');
      return;
    }

    const nextSubjectIndex = subjectIndex + 1;
    if (nextSubjectIndex < selectedSubjectConfigs.length) {
      focusCell(rowIndex, nextSubjectIndex, 'theory');
      return;
    }

    focusCell(rowIndex + 1, 0, 'theory');
  };

  const buildDefaultMarks = () => subjects.map(toMarkItem);

  const saveStudentMarks = async (studentId, subjectMarksBySubject) => {
    let payloadMarks = buildDefaultMarks();
    let marksheetId = null;

    try {
      const existing = await marksheetAPI.getByStudentExam(studentId, selectedExam);
      payloadMarks = existing.data.marksheet.marks || payloadMarks;
      marksheetId = existing.data.marksheet._id;
    } catch (err) {
      if (err.response?.status !== 404) throw err;
    }

    Object.entries(subjectMarksBySubject).forEach(([subjectName, subjectMarks]) => {
      const subjectConfig = subjects.find((subject) => subject.subjectName === subjectName);
      if (!subjectConfig) return;

      const nextMark = {
        ...toMarkItem(subjectConfig),
        theory: Number(subjectMarks.theory || 0),
        practical: subjectConfig.hasPractical ? Number(subjectMarks.practical || 0) : 0,
      };

      const existingIndex = payloadMarks.findIndex((mark) => mark.subject === subjectName);
      if (existingIndex >= 0) payloadMarks[existingIndex] = nextMark;
      else payloadMarks.push(nextMark);
    });

    if (marksheetId) await marksheetAPI.update(marksheetId, { marks: payloadMarks });
    else await marksheetAPI.create({ studentId, examId: selectedExam, marks: payloadMarks });
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedExam || !selectedStudent || marks.length === 0) return setError('Please select both an exam and a student');
    if (!validateDate()) return;

    for (const mark of marks) {
      if (mark.theory < 0 || mark.practical < 0) return setError('Marks cannot be negative');
      if (mark.theory + mark.practical > mark.fullMarks) return setError(`Total marks for "${mark.subject}" exceed full marks (${mark.fullMarks})`);
    }

    setSubmitting(true);
    try {
      try {
        const existing = await marksheetAPI.getByStudentExam(selectedStudent, selectedExam);
        await marksheetAPI.update(existing.data.marksheet._id, { marks });
      } catch (err) {
        if (err.response?.status === 404) await marksheetAPI.create({ studentId: selectedStudent, examId: selectedExam, marks });
        else throw err;
      }
      setSuccess('Marks saved successfully. You can update them again if needed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedExam || !selectedClass || selectedBulkSubjects.length === 0) return setError('Please select exam, class, and at least one subject');
    if (!validateDate()) return;

    const rows = filteredStudents.filter((student) => bulkMarks[student._id]);
    if (rows.length === 0) return setError('Enter marks for at least one student');

    setSubmitting(true);
    try {
      for (const student of rows) {
        await saveStudentMarks(student._id, bulkMarks[student._id]);
      }
      setSuccess(`Saved marks for ${rows.length} student${rows.length !== 1 ? 's' : ''}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save bulk marks');
    } finally {
      setSubmitting(false);
    }
  };

  const totalObtained = marks.reduce((sum, mark) => sum + mark.theory + mark.practical, 0);
  const totalFull = marks.reduce((sum, mark) => sum + mark.fullMarks, 0);
  const percentage = totalFull > 0 ? ((totalObtained / totalFull) * 100).toFixed(1) : 0;

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-gray-400 text-sm mt-1">Use single student entry or fast bulk class entry.</p>
        </div>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Marks Entry Method</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
              <option value="single">Single Student Entry</option>
              <option value="bulk">Bulk Class Entry</option>
            </select>
          </div>
        </div>

        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="space-y-5">
            <SelectionCard selectedExam={selectedExam} setSelectedExam={(value) => { setSelectedExam(value); setSelectedStudent(''); setSingleClass(''); setSingleSection(''); }} exams={exams}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
                <select value={singleClass} onChange={(e) => { setSingleClass(e.target.value); setSingleSection(''); setSelectedStudent(''); }} className={inputClass} disabled={!selectedExam}>
                  <option value="">All classes</option>
                  {singleClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Section</label>
                <select value={singleSection} onChange={(e) => { setSingleSection(e.target.value); setSelectedStudent(''); }} className={inputClass} disabled={!singleClass}>
                  <option value="">All sections</option>
                  {singleSectionOptions.map((section) => <option key={section} value={section}>Section {section}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Search student</label>
                <input
                  type="text"
                  value={singleSearchTerm}
                  onChange={(e) => setSingleSearchTerm(e.target.value)}
                  className={inputClass}
                  placeholder="Name or roll number"
                  disabled={!selectedExam}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Student <span className="text-red-500">*</span></label>
                <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className={inputClass} required disabled={!selectedExam}>
                  <option value="">{selectedExam ? 'Choose a student...' : 'Select exam first'}</option>
                  {singleFilteredStudents.map((student) => <option key={student._id} value={student._id}>{student.name} {student.rollNo ? `- Roll ${student.rollNo}` : ''}</option>)}
                </select>
              </div>
            </SelectionCard>

            {loading ? <LoadingCard /> : marks.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Enter Marks</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Total: <span className="font-bold text-gray-800">{totalObtained}/{totalFull}</span></span>
                    <span className={`font-bold ${parseFloat(percentage) >= 40 ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</span>
                  </div>
                </div>
                <MarksTable marks={marks} onChange={handleSingleMarkChange} />
              </div>
            )}

            <SubmitButton disabled={!selectedExam || !selectedStudent || submitting || marks.length === 0} submitting={submitting} text="Save Marks" />
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="space-y-5">
            <SelectionCard selectedExam={selectedExam} setSelectedExam={(value) => { setSelectedExam(value); setSelectedClass(''); setSelectedSection(''); setSelectedBulkSubjects([]); }} exams={exams}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class <span className="text-red-500">*</span></label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputClass} required disabled={!selectedExam}>
                  <option value="">Select class</option>
                  {classOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Section</label>
                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className={inputClass} disabled={!selectedClass}>
                  <option value="">All sections</option>
                  {sectionOptions.map((section) => <option key={section} value={section}>Section {section}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Search students</label>
                <input
                  type="text"
                  value={bulkSearchTerm}
                  onChange={(e) => setBulkSearchTerm(e.target.value)}
                  className={inputClass}
                  placeholder="Name or roll number"
                  disabled={!selectedClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <button type="button" onClick={addAllBulkSubjects} disabled={!selectedClass || subjects.length === 0} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold disabled:opacity-50">
                    All Subjects
                  </button>
                </div>
                <div className="min-h-[46px] rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:ring-2 focus-within:ring-indigo-500">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedBulkSubjects.map((subjectName, index) => (
                      <span key={subjectName} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {index + 1}. {subjectName}
                        <button type="button" onClick={() => removeBulkSubject(subjectName)} className="text-red-400 hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                  <select value="" onChange={(e) => addBulkSubject(e.target.value)} className="w-full bg-transparent outline-none text-sm text-gray-700" disabled={!selectedClass}>
                    <option value="">{selectedBulkSubjects.length ? 'Add another subject' : 'Select subject to add'}</option>
                    {subjects
                      .filter((subject) => !selectedBulkSubjects.includes(subject.subjectName))
                      .map((subject) => <option key={subject.subjectName} value={subject.subjectName}>{subject.subjectName}</option>)}
                  </select>
                </div>
              </div>
            </SelectionCard>

            {selectedSubjectConfigs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Bulk Entry</h2>
                  <p className="text-xs text-gray-400 mt-1">{selectedBulkSubjects.length} subject column group{selectedBulkSubjects.length !== 1 ? 's' : ''} selected.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Roll</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                        {selectedSubjectConfigs.map((subject) => (
                          <th key={subject.subjectName} className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={subject.hasPractical ? 3 : 2}>
                            <div className="flex items-center justify-center gap-2">
                              {subject.subjectName}
                              <button type="button" onClick={() => removeBulkSubject(subject.subjectName)} className="text-red-400 hover:text-red-600">×</button>
                            </div>
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th />
                        <th />
                        {selectedSubjectConfigs.map((subject) => (
                          <React.Fragment key={`${subject.subjectName}-sub`}>
                            <th className="px-3 py-2 text-center text-xs text-gray-400">Theory/{subject.hasPractical ? subject.theoryFullMarks : subject.fullMarks}</th>
                            {subject.hasPractical && <th className="px-3 py-2 text-center text-xs text-gray-400">Practical/{subject.practicalFullMarks}</th>}
                            <th className="px-3 py-2 text-center text-xs text-gray-400">Total</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredStudents.map((student, rowIndex) => {
                        const row = bulkMarks[student._id] || {};
                        return (
                          <tr key={student._id} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-gray-500">{student.rollNo || '-'}</td>
                            <td className="px-5 py-3 font-medium text-gray-800">{student.name}</td>
                            {selectedSubjectConfigs.map((subject, subjectIndex) => {
                              const subjectRow = row[subject.subjectName] || { theory: 0, practical: 0 };
                              return (
                                <React.Fragment key={`${student._id}-${subject.subjectName}`}>
                                  <td className="px-3 py-3 text-center">
                                    <input ref={(el) => { inputRefs.current[`${rowIndex}-${subjectIndex}-theory`] = el; }} type="number" min="0" max={subject.hasPractical ? subject.theoryFullMarks : subject.fullMarks} value={subjectRow.theory} onKeyDown={(e) => handleBulkKeyDown(e, rowIndex, subjectIndex, 'theory')} onChange={(e) => handleBulkMarkChange(student._id, subject.subjectName, 'theory', e.target.value)} className={markInputClass} />
                                  </td>
                                  {subject.hasPractical && (
                                    <td className="px-3 py-3 text-center">
                                      <input ref={(el) => { inputRefs.current[`${rowIndex}-${subjectIndex}-practical`] = el; }} type="number" min="0" max={subject.practicalFullMarks} value={subjectRow.practical} onKeyDown={(e) => handleBulkKeyDown(e, rowIndex, subjectIndex, 'practical')} onChange={(e) => handleBulkMarkChange(student._id, subject.subjectName, 'practical', e.target.value)} className={markInputClass} />
                                    </td>
                                  )}
                                  <td className="px-3 py-3 text-center font-bold text-gray-700">{Number(subjectRow.theory || 0) + Number(subjectRow.practical || 0)}</td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No students found for selected class/section.</div>}
              </div>
            )}

            <SubmitButton disabled={!selectedExam || !selectedClass || selectedBulkSubjects.length === 0 || submitting} submitting={submitting} text="Save Bulk Marks" />
          </form>
        )}
      </div>
    </Layout>
  );
};

const Alert = ({ type, message }) => (
  <div className={`mb-5 p-3.5 rounded-xl flex items-start gap-2.5 ${type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
    {type === 'error' ? <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" /> : <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />}
    <p className={`text-sm ${type === 'error' ? 'text-red-700' : 'text-green-700 font-medium'}`}>{message}</p>
  </div>
);

const SelectionCard = ({ selectedExam, setSelectedExam, exams, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Selection</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Term / Exam <span className="text-red-500">*</span></label>
        <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)} className={inputClass} required>
          <option value="">Choose exam...</option>
          {exams.map((exam) => <option key={exam._id} value={exam._id}>{exam.examName}</option>)}
        </select>
      </div>
      {children}
    </div>
  </div>
);

const LoadingCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex justify-center">
    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const MarksTable = ({ marks, onChange }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Theory</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Practical</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Full</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Pass</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {marks.map((mark, index) => {
          const total = mark.theory + mark.practical;
          const passed = total >= mark.passMarks;
          return (
            <tr key={mark.subject} className="hover:bg-gray-50">
              <td className="px-5 py-3.5 font-medium text-gray-800">{mark.subject}</td>
              <td className="px-5 py-3.5 text-center"><input type="number" min="0" max={mark.hasPractical ? mark.theoryFullMarks : mark.fullMarks} value={mark.theory} onChange={(e) => onChange(index, 'theory', e.target.value)} className={markInputClass} /></td>
              <td className="px-5 py-3.5 text-center"><input type="number" min="0" max={mark.practicalFullMarks} value={mark.practical} disabled={!mark.hasPractical} onChange={(e) => onChange(index, 'practical', e.target.value)} className={markInputClass} /></td>
              <td className="px-5 py-3.5 text-center"><span className={`font-bold text-base ${passed ? 'text-green-600' : 'text-red-500'}`}>{total}</span></td>
              <td className="px-5 py-3.5 text-center text-gray-500">{mark.fullMarks}</td>
              <td className="px-5 py-3.5 text-center text-gray-500">{mark.passMarks}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const SubmitButton = ({ disabled, submitting, text }) => (
  <button type="submit" disabled={disabled} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
    {submitting ? 'Saving...' : <><Save size={18} />{text}</>}
  </button>
);

export default MarksEntry;

