import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import Layout from '../components/Layout';
import { examAPI } from '../services/api';

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white';

const toSetupSubject = (subject) => {
  const hasPractical = Boolean(subject.hasPractical);
  const practicalFullMarks = Number(subject.practicalFullMarks) || 0;
  const fullMarks = Number(subject.fullMarks) || 100;
  return {
    subjectName: subject.subjectName || '',
    theoryFullMarks: hasPractical && Number(subject.theoryFullMarks) > 0
      ? Number(subject.theoryFullMarks)
      : hasPractical && fullMarks > practicalFullMarks
        ? fullMarks - practicalFullMarks
        : fullMarks,
    theoryPassMarks: hasPractical
      ? Number(subject.theoryPassMarks ?? 0)
      : Number(subject.passMarks) || 0,
    practicalFullMarks,
    practicalPassMarks: Number(subject.practicalPassMarks) || 0,
    creditHour: Number(subject.creditHour) || 0,
    hasPractical,
  };
};

const toExamSubject = (subject) => ({
  ...subject,
  fullMarks: subject.hasPractical
    ? Number(subject.theoryFullMarks) + Number(subject.practicalFullMarks)
    : Number(subject.theoryFullMarks),
  passMarks: subject.hasPractical
    ? Number(subject.theoryPassMarks) + Number(subject.practicalPassMarks)
    : Number(subject.theoryPassMarks),
  practicalFullMarks: subject.hasPractical ? Number(subject.practicalFullMarks) : 0,
  practicalPassMarks: subject.hasPractical ? Number(subject.practicalPassMarks) : 0,
  creditHour: Number(subject.creditHour) || 0,
});

const ExamMarkSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [copyExamId, setCopyExamId] = useState('');
  const [copyClass, setCopyClass] = useState('');
  const [copyToAllClasses, setCopyToAllClasses] = useState(false);
  const [copyTargetClasses, setCopyTargetClasses] = useState([]);
  const [classSetupOverrides, setClassSetupOverrides] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchExam = useCallback(async () => {
    try {
      setLoading(true);
      const response = await examAPI.getById(id);
      const examsResponse = await examAPI.getAll({ academicYear: '' });
      const examData = response.data.exam;
      setExam(examData);
      setExams(examsResponse.data.exams || []);
      const firstClass = examData.applicableClasses?.[0] || examData.classExamConfigs?.[0]?.className || '';
      setSelectedClass(firstClass);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  const classNames = exam?.applicableClasses || exam?.classExamConfigs?.map((config) => config.className) || [];
  const selectedConfig = useMemo(() => {
    const config = exam?.classExamConfigs?.find((item) => item.className === selectedClass);
    return config && classSetupOverrides[selectedClass]
      ? { ...config, subjects: classSetupOverrides[selectedClass] }
      : config;
  }, [exam, selectedClass, classSetupOverrides]);

  useEffect(() => {
    setSubjects(
      (selectedConfig?.subjects || []).map(toSetupSubject)
    );
  }, [selectedConfig]);

  const updateSubject = (index, field, value) => {
    setSubjects((current) => current.map((subject, idx) => {
      if (idx !== index) return subject;
      const nextValue = field === 'hasPractical' ? value : Number(value);
      const nextSubject = { ...subject, [field]: nextValue };

      if (field === 'hasPractical' && !value) {
        nextSubject.practicalFullMarks = 0;
        nextSubject.practicalPassMarks = 0;
      }

      return nextSubject;
    }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validate = () => {
    if (!selectedClass) return 'Please select class';
    if (subjects.length === 0) return 'No subjects found for this class';

    for (const subject of subjects) {
      if (!subject.subjectName) return 'Subject name is required';
      if (!subject.theoryFullMarks || subject.theoryFullMarks <= 0) return `${subject.subjectName}: theory full mark must be greater than 0`;
      if (subject.creditHour < 0) return `${subject.subjectName}: credit hour cannot be negative`;
      if (subject.theoryPassMarks < 0) return `${subject.subjectName}: theory pass mark cannot be negative`;
      if (subject.theoryPassMarks > subject.theoryFullMarks) return `${subject.subjectName}: theory pass mark cannot exceed theory full mark`;
      if (subject.hasPractical && subject.practicalFullMarks <= 0) return `${subject.subjectName}: practical full mark must be greater than 0`;
      if (subject.practicalPassMarks < 0) return `${subject.subjectName}: practical pass mark cannot be negative`;
      if (subject.practicalPassMarks > subject.practicalFullMarks) return `${subject.subjectName}: practical pass mark cannot exceed practical full mark`;
    }

    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);

    try {
      setSaving(true);
      const normalizedSubjects = subjects.map(toExamSubject);

      const updatedConfigs = (exam.classExamConfigs || []).map((config) =>
        config.className === selectedClass || classSetupOverrides[config.className]
          ? {
              ...config,
              subjects: config.className === selectedClass
                ? normalizedSubjects
                : classSetupOverrides[config.className].map(toExamSubject),
            }
          : config
      );

      const response = await examAPI.update(id, { classExamConfigs: updatedConfigs });
      setExam(response.data.exam);
      setClassSetupOverrides({});
      setCopyTargetClasses([]);
      setCopyToAllClasses(false);
      setSuccess('Mark setup saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save mark setup');
    } finally {
      setSaving(false);
    }
  };

  const sourceExam = exams.find((item) => item._id === copyExamId);
  const sourceClasses = sourceExam?.classExamConfigs?.map((config) => config.className) || [];

  const handleCopySetup = () => {
    const sourceConfig = sourceExam?.classExamConfigs?.find((config) => config.className === copyClass);
    if (!sourceConfig) return setError('Please select source exam and class to copy');
    if (copyExamId === id && copyClass === selectedClass) return setError('Select a different source class to copy into this class');
    const sourceSubjects = sourceConfig.subjects || [];
    const matchedCount = subjects.filter((targetSubject) =>
      sourceSubjects.some((sourceSubject) => sourceSubject.subjectName === targetSubject.subjectName)
    ).length;
    if (!matchedCount) return setError('The source class has no subject names matching the selected class.');
    setSubjects((currentSubjects) => currentSubjects.map((targetSubject) => {
      const sourceSubject = sourceSubjects.find((subject) => subject.subjectName === targetSubject.subjectName);
      if (!sourceSubject) return targetSubject;
      return {
        ...targetSubject,
        ...toSetupSubject(sourceSubject),
      };
    }));
    setSuccess(`Copied marks setup for ${matchedCount} matching subject(s). Click Save Mark Setup to apply it.`);
    setError('');
  };

  const handleCopyToClasses = () => {
    const targets = copyToAllClasses
      ? classNames.filter((className) => className !== selectedClass)
      : copyTargetClasses.filter((className) => className !== selectedClass);
    if (!selectedClass || subjects.length === 0) return setError('Select a class with subjects to copy from.');
    if (!targets.length) return setError('Select at least one other class to copy the setup to.');

    const targetConfigs = {};
    const skippedClasses = [];
    targets.forEach((className) => {
      const targetConfig = exam.classExamConfigs?.find((config) => config.className === className);
      const targetSubjects = targetConfig?.subjects || [];
      let matchedCount = 0;
      const copiedSubjects = targetSubjects.map((targetSubject) => {
        const sourceSubject = subjects.find((subject) => subject.subjectName === targetSubject.subjectName);
        if (!sourceSubject) return toSetupSubject(targetSubject);
        matchedCount += 1;
        return { ...toSetupSubject(targetSubject), ...sourceSubject, subjectName: targetSubject.subjectName };
      });
      if (matchedCount) targetConfigs[className] = copiedSubjects;
      else skippedClasses.push(className);
    });
    const copiedClasses = Object.keys(targetConfigs);
    if (!copiedClasses.length) return setError('No target classes have matching subject names.');
    setClassSetupOverrides((current) => ({ ...current, ...targetConfigs }));
    setSuccess(`Copied setup to ${copiedClasses.length} class(es) for matching subject names. Save Mark Setup to apply.`);
    setError(skippedClasses.length ? `Skipped classes without matching subject names: ${skippedClasses.join(', ')}.` : '');
  };

  const toggleCopyTarget = (className) => {
    setCopyTargetClasses((current) => current.includes(className)
      ? current.filter((item) => item !== className)
      : [...current, className]);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <button onClick={() => navigate('/exams')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium">
          <ArrowLeft size={18} /> Back to Exams
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Mark Setup</h1>
          <p className="text-sm text-gray-400 mt-1">{exam?.examName} - setup marks and credit hours by class.</p>
        </div>

        {error && <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        {success && <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputClass}>
              <option value="">Select class</option>
              {(exam?.applicableClasses || []).map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-3 gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="md:col-span-3 text-xs text-indigo-700">Copies component marks and credit hours for subject names shared by the selected classes.</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Copy From Exam / Year</label>
              <select value={copyExamId} onChange={(e) => { setCopyExamId(e.target.value); setCopyClass(''); }} className={inputClass}>
                <option value="">Select source exam</option>
                {exams.map((item) => (
                  <option key={item._id} value={item._id}>{item.examName} - {item.academicYear}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Copy From Class</label>
              <select value={copyClass} onChange={(e) => setCopyClass(e.target.value)} className={inputClass} disabled={!copyExamId}>
                <option value="">Select class</option>
                {sourceClasses
                  .filter((className) => copyExamId !== id || className !== selectedClass)
                  .map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
            </div>
            <button type="button" onClick={handleCopySetup} disabled={!copyExamId || !copyClass} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              <Copy size={16} /> Copy Setup
            </button>
          </div>

          <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-violet-900">Copy this class setup to other classes</h2>
              <p className="mt-1 text-xs text-violet-700">Uses the selected class’s current values. Matching subject names are updated; subject names are never changed.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={copyToAllClasses}
                onChange={(event) => setCopyToAllClasses(event.target.checked)}
              />
              Apply to all other classes
            </label>
            {!copyToAllClasses && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {classNames.filter((className) => className !== selectedClass).map((className) => (
                  <label key={className} className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={copyTargetClasses.includes(className)}
                      onChange={() => toggleCopyTarget(className)}
                    />
                    {className}
                  </label>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={handleCopyToClasses}
              disabled={!selectedClass || subjects.length === 0 || classNames.length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Copy size={16} /> Copy Setup to Classes
            </button>
          </section>

          {subjects.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No subjects found for selected class.</div>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject, index) => (
                <div key={subject.subjectName} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject (fixed)</p>
                      <p className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800">{subject.subjectName}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={subject.hasPractical} onChange={(e) => updateSubject(index, 'hasPractical', e.target.checked)} />
                      Has practical component
                    </label>
                  </div>
                  <div className={`grid grid-cols-1 gap-4 ${subject.hasPractical ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <h3 className="mb-3 text-sm font-bold text-blue-900">THEORY MARKS</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <NumberField label="Theory Full Marks" value={subject.theoryFullMarks} onChange={(value) => updateSubject(index, 'theoryFullMarks', value)} />
                        <NumberField label="Theory Pass Marks" value={subject.theoryPassMarks} onChange={(value) => updateSubject(index, 'theoryPassMarks', value)} />
                      </div>
                    </div>
                    <div className={`rounded-xl border p-4 ${subject.hasPractical ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-100 opacity-70'}`}>
                      <h3 className="mb-3 text-sm font-bold text-amber-900">PRACTICAL MARKS</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <NumberField label="Practical Full Marks" value={subject.practicalFullMarks} disabled={!subject.hasPractical} onChange={(value) => updateSubject(index, 'practicalFullMarks', value)} />
                        <NumberField label="Practical Pass Marks" value={subject.practicalPassMarks} disabled={!subject.hasPractical} onChange={(value) => updateSubject(index, 'practicalPassMarks', value)} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <h3 className="mb-3 text-sm font-bold text-gray-700">OTHER</h3>
                      <NumberField label="Credit Hour" value={subject.creditHour} step="0.1" onChange={(value) => updateSubject(index, 'creditHour', value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleSave} disabled={saving || !selectedClass || subjects.length === 0} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving...' : <><Save size={18} /> Save Mark Setup</>}
          </button>
        </div>
      </div>
    </Layout>
  );
};

const NumberField = ({ label, value, onChange, disabled = false, step = '1' }) => (
  <div className="flex-1 min-w-[120px]">
    <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
    <input type="number" min="0" step={step} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`} />
  </div>
);

export default ExamMarkSetup;
