import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import Layout from '../components/Layout';
import { examAPI } from '../services/api';

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white';

const ExamMarkSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [copyExamId, setCopyExamId] = useState('');
  const [copyClass, setCopyClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
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
  };

  const selectedConfig = useMemo(
    () => exam?.classExamConfigs?.find((config) => config.className === selectedClass),
    [exam, selectedClass]
  );

  useEffect(() => {
    setSubjects(
      (selectedConfig?.subjects || []).map((subject) => ({
        subjectName: subject.subjectName || '',
        theoryFullMarks: Number(subject.theoryFullMarks) || Number(subject.fullMarks) || 100,
        theoryPassMarks: Number(subject.theoryPassMarks) || Number(subject.passMarks) || 40,
        practicalFullMarks: Number(subject.practicalFullMarks) || 0,
        practicalPassMarks: Number(subject.practicalPassMarks) || 0,
        creditHour: Number(subject.creditHour) || 0,
        hasPractical: Boolean(subject.hasPractical),
      }))
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
      if (subject.theoryPassMarks > subject.theoryFullMarks) return `${subject.subjectName}: theory pass mark cannot exceed theory full mark`;
      if (subject.practicalPassMarks > subject.practicalFullMarks) return `${subject.subjectName}: practical pass mark cannot exceed practical full mark`;
    }

    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);

    try {
      setSaving(true);
      const normalizedSubjects = subjects.map((subject) => ({
        ...subject,
        fullMarks: subject.theoryFullMarks + (subject.hasPractical ? subject.practicalFullMarks : 0),
        passMarks: subject.theoryPassMarks + (subject.hasPractical ? subject.practicalPassMarks : 0),
        practicalFullMarks: subject.hasPractical ? subject.practicalFullMarks : 0,
        practicalPassMarks: subject.hasPractical ? subject.practicalPassMarks : 0,
        creditHour: Number(subject.creditHour) || 0,
      }));

      const updatedConfigs = (exam.classExamConfigs || []).map((config) =>
        config.className === selectedClass
          ? { ...config, subjects: normalizedSubjects }
          : config
      );

      const response = await examAPI.update(id, { classExamConfigs: updatedConfigs });
      setExam(response.data.exam);
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
    setSubjects((currentSubjects) => currentSubjects.map((targetSubject) => {
      const sourceSubject = (sourceConfig.subjects || []).find((subject) => subject.subjectName === targetSubject.subjectName);
      if (!sourceSubject) return targetSubject;
      return {
        ...targetSubject,
        theoryFullMarks: Number(sourceSubject.theoryFullMarks) || Number(sourceSubject.fullMarks) || 100,
        theoryPassMarks: Number(sourceSubject.theoryPassMarks) || Number(sourceSubject.passMarks) || 40,
        practicalFullMarks: Number(sourceSubject.practicalFullMarks) || 0,
        practicalPassMarks: Number(sourceSubject.practicalPassMarks) || 0,
        creditHour: Number(sourceSubject.creditHour) || 0,
        hasPractical: Boolean(sourceSubject.hasPractical),
      };
    }));
    setSuccess('Setup copied. Click Save Mark Setup to apply it.');
    setError('');
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

          {subjects.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No subjects found for selected class.</div>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject, index) => (
                <div key={subject.subjectName} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                    <div className="lg:w-48">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
                      <div className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-800">{subject.subjectName}</div>
                    </div>
                    <NumberField label="Theory Full" value={subject.theoryFullMarks} onChange={(value) => updateSubject(index, 'theoryFullMarks', value)} />
                    <NumberField label="Theory Pass" value={subject.theoryPassMarks} onChange={(value) => updateSubject(index, 'theoryPassMarks', value)} />
                    <NumberField label="Practical Full" value={subject.practicalFullMarks} disabled={!subject.hasPractical} onChange={(value) => updateSubject(index, 'practicalFullMarks', value)} />
                    <NumberField label="Practical Pass" value={subject.practicalPassMarks} disabled={!subject.hasPractical} onChange={(value) => updateSubject(index, 'practicalPassMarks', value)} />
                    <NumberField label="Credit Hour" value={subject.creditHour} step="0.1" onChange={(value) => updateSubject(index, 'creditHour', value)} />
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 pb-2">
                      <input type="checkbox" checked={subject.hasPractical} onChange={(e) => updateSubject(index, 'hasPractical', e.target.checked)} />
                      Practical
                    </label>
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
