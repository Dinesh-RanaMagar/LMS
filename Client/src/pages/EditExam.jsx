import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { examAPI } from "../services/api";
import Layout from "../components/Layout";
import { ArrowLeft, BookOpen, AlertCircle, Plus, Trash2, Check, Copy } from "lucide-react";

const ic = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition";

const EditExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copySourceClass, setCopySourceClass] = useState("");
  const [copyTargetClasses, setCopyTargetClasses] = useState([]);
  const [copyToAllClasses, setCopyToAllClasses] = useState(false);
  const [form, setForm] = useState({
    examName: "", examType: "regular", description: "",
    startDate: "", endDate: "", isFinalExam: false, status: "draft",
    classExamConfigs: [],
  });

  useEffect(() => {
    examAPI.getById(id).then((examRes) => {
      const e = examRes.data.exam;
      setForm({
        examName: e.examName || "",
        examType: e.examType || "regular",
        description: e.description || "",
        startDate: e.startDate ? e.startDate.split("T")[0] : "",
        endDate: e.endDate ? e.endDate.split("T")[0] : "",
        isFinalExam: e.isFinalExam || false,
        status: e.status || "draft",
        classExamConfigs: e.classExamConfigs || [],
      });
    }).catch(() => setError("Failed to load exam"))
    .finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateSubject = (cfgIdx, subIdx, field, val) => {
    const configs = [...form.classExamConfigs];
    const subjects = [...configs[cfgIdx].subjects];
    const updated = {
      ...subjects[subIdx],
      [field]: field === "subjectName" || field === "hasPractical" ? val : Number(val),
    };
    if (field === "hasPractical" && !val) {
      updated.practicalFullMarks = 0;
      updated.practicalPassMarks = 0;
      updated.fullMarks = Number(updated.theoryFullMarks || updated.fullMarks || 0);
      updated.passMarks = Number(updated.theoryPassMarks ?? updated.passMarks ?? 0);
    }
    if (updated.hasPractical && ["theoryFullMarks", "theoryPassMarks", "practicalFullMarks", "practicalPassMarks"].includes(field)) {
      updated.fullMarks = Number(updated.theoryFullMarks || 0) + Number(updated.practicalFullMarks || 0);
      updated.passMarks = Number(updated.theoryPassMarks || 0) + Number(updated.practicalPassMarks || 0);
    }
    subjects[subIdx] = updated;
    configs[cfgIdx] = { ...configs[cfgIdx], subjects };
    set("classExamConfigs", configs);
  };

  const addSubjectToConfig = (cfgIdx) => {
    const configs = [...form.classExamConfigs];
    configs[cfgIdx] = { ...configs[cfgIdx], subjects: [...configs[cfgIdx].subjects, {
      subjectName: "",
      fullMarks: 100,
      passMarks: 40,
      theoryFullMarks: 100,
      theoryPassMarks: 40,
      practicalFullMarks: 0,
      practicalPassMarks: 0,
      creditHour: 0,
      hasPractical: false,
    }] };
    set("classExamConfigs", configs);
  };

  const removeSubjectFromConfig = (cfgIdx, subIdx) => {
    const configs = [...form.classExamConfigs];
    configs[cfgIdx] = { ...configs[cfgIdx], subjects: configs[cfgIdx].subjects.filter((_, i) => i !== subIdx) };
    set("classExamConfigs", configs);
  };

  const toggleCopyTarget = (className) => {
    setCopyTargetClasses((current) => current.includes(className)
      ? current.filter((item) => item !== className)
      : [...current, className]);
  };

  const copyClassSetup = () => {
    const sourceConfig = form.classExamConfigs.find((config) => config.className === copySourceClass);
    if (!sourceConfig) return setError("Select a class to copy setup from.");

    const targets = copyToAllClasses
      ? form.classExamConfigs.map((config) => config.className).filter((className) => className !== copySourceClass)
      : copyTargetClasses.filter((className) => className !== copySourceClass);
    if (!targets.length) return setError("Select at least one other class to copy setup to.");

    let updatedClassCount = 0;
    const skippedClasses = [];
    const updatedConfigs = form.classExamConfigs.map((config) => {
      if (!targets.includes(config.className)) return config;
      let matchedCount = 0;
      const sourceSubjects = sourceConfig.subjects || [];
      const subjects = (config.subjects || []).map((targetSubject) => {
        const sourceSubject = sourceSubjects.find((subject) => subject.subjectName === targetSubject.subjectName);
        if (!sourceSubject) return targetSubject;
        matchedCount += 1;
        const hasPractical = Boolean(sourceSubject.hasPractical);
        const theoryFullMarks = hasPractical
          ? Number(sourceSubject.theoryFullMarks) || Number(sourceSubject.fullMarks) - Number(sourceSubject.practicalFullMarks || 0)
          : Number(sourceSubject.fullMarks);
        const theoryPassMarks = hasPractical
          ? Number(sourceSubject.theoryPassMarks ?? 0)
          : Number(sourceSubject.passMarks);
        const practicalFullMarks = hasPractical ? Number(sourceSubject.practicalFullMarks || 0) : 0;
        const practicalPassMarks = hasPractical ? Number(sourceSubject.practicalPassMarks || 0) : 0;
        return {
          ...targetSubject,
          hasPractical,
          theoryFullMarks,
          theoryPassMarks,
          practicalFullMarks,
          practicalPassMarks,
          fullMarks: hasPractical ? theoryFullMarks + practicalFullMarks : theoryFullMarks,
          passMarks: hasPractical ? theoryPassMarks + practicalPassMarks : theoryPassMarks,
          creditHour: Number(sourceSubject.creditHour) || 0,
          practicalCreditHour: hasPractical ? Number(sourceSubject.practicalCreditHour) || 0 : 0,
          subjectName: targetSubject.subjectName,
        };
      });
      if (!matchedCount) {
        skippedClasses.push(config.className);
        return config;
      }
      updatedClassCount += 1;
      return { ...config, subjects };
    });

    if (!updatedClassCount) return setError("No target classes have matching subject names.");
    setForm((current) => ({ ...current, classExamConfigs: updatedConfigs }));
    setSuccess(`Copied setup for matching subjects to ${updatedClassCount} class(es). Click Update Exam to save.`);
    setError(skippedClasses.length ? `Skipped classes without matching subject names: ${skippedClasses.join(", ")}.` : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.examName.trim()) return setError("Exam name is required");
    const classExamConfigs = form.classExamConfigs.map((config) => ({
      ...config,
      subjects: config.subjects.map((subject) => {
        if (!subject.hasPractical) {
          return {
            ...subject,
            theoryFullMarks: Number(subject.fullMarks),
            theoryPassMarks: Number(subject.passMarks),
            practicalFullMarks: 0,
            practicalPassMarks: 0,
            creditHour: Number(subject.creditHour) || 0,
            practicalCreditHour: 0,
          };
        }
        const theoryFullMarks = Number(subject.theoryFullMarks || subject.fullMarks || 0);
        const theoryPassMarks = Number(subject.theoryPassMarks ?? subject.passMarks ?? 0);
        return {
          ...subject,
          theoryFullMarks,
          theoryPassMarks,
          fullMarks: theoryFullMarks + Number(subject.practicalFullMarks || 0),
          passMarks: theoryPassMarks + Number(subject.practicalPassMarks || 0),
          creditHour: Number(subject.creditHour) || 0,
          practicalCreditHour: Number(subject.practicalCreditHour) || 0,
        };
      }),
    }));
    for (const config of classExamConfigs) {
      for (const subject of config.subjects) {
        if (!subject.subjectName.trim()) return setError(`${config.className}: every subject needs a name`);
        if (!Number.isFinite(Number(subject.creditHour)) || Number(subject.creditHour) < 0) {
          return setError(`${config.className} ${subject.subjectName}: credit hour cannot be negative`);
        }
        if (!Number.isFinite(Number(subject.practicalCreditHour)) || Number(subject.practicalCreditHour) < 0) {
          return setError(`${config.className} ${subject.subjectName}: practical credit hour cannot be negative`);
        }
        if (subject.hasPractical) {
          const theoryFullMarks = Number(subject.theoryFullMarks || subject.fullMarks || 0);
          const theoryPassMarks = Number(subject.theoryPassMarks || 0);
          const practicalFullMarks = Number(subject.practicalFullMarks || 0);
          const practicalPassMarks = Number(subject.practicalPassMarks || 0);
          if (theoryFullMarks <= 0 || practicalFullMarks <= 0) return setError(`${subject.subjectName}: theory and practical full marks must be greater than 0`);
          if (theoryPassMarks < 0 || theoryPassMarks > theoryFullMarks) return setError(`${subject.subjectName}: theory pass marks must not exceed theory full marks`);
          if (practicalPassMarks < 0 || practicalPassMarks > practicalFullMarks) return setError(`${subject.subjectName}: practical pass marks must not exceed practical full marks`);
        } else if (subject.fullMarks <= 0 || subject.passMarks < 0 || subject.passMarks > subject.fullMarks) {
          return setError(`${subject.subjectName}: enter valid full and pass marks`);
        }
      }
    }
    setSubmitting(true);
    try {
      await examAPI.update(id, { ...form, classExamConfigs });
      navigate(`/exams/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update exam");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/exams/${id}`)} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition">
          <ArrowLeft size={18} /> Back to Exam
        </button>

        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
            <p className="text-gray-400 text-sm">Update exam details and subject configurations</p>
          </div>
        </div>

        {error && <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        {success && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Exam Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Name *</label>
                <input type="text" value={form.examName} onChange={e => set("examName", e.target.value)} className={ic} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Type</label>
                <select value={form.examType} onChange={e => set("examType", e.target.value)} className={ic}>
                  {["regular","unit-test","practical","internal","re-exam","custom"].map(t => (
                    <option key={t} value={t}>{t.replace("-"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value)} className={ic}>
                  {["draft","active","completed"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className={ic} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows="2" className={ic} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <input type="checkbox" id="isFinal" checked={form.isFinalExam} onChange={e => set("isFinalExam", e.target.checked)} className="w-4 h-4 accent-amber-500 cursor-pointer" />
              <label htmlFor="isFinal" className="text-sm font-medium text-amber-800 cursor-pointer">Mark as Final Exam</label>
            </div>
          </div>

          <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-violet-900">Copy mark setup between classes</h2>
              <p className="mt-1 text-xs text-violet-700">Copies theory/practical marks and component settings for matching subjects. Subject names stay unchanged. Click Update Exam to save.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="copy-source-class" className="mb-1.5 block text-sm font-medium text-gray-700">Copy setup from class</label>
                <select id="copy-source-class" value={copySourceClass} onChange={(event) => setCopySourceClass(event.target.value)} className={ic}>
                  <option value="">Select source class</option>
                  {form.classExamConfigs.map((config) => <option key={config.className} value={config.className}>{config.className}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={copyToAllClasses} onChange={(event) => setCopyToAllClasses(event.target.checked)} />
                Copy to all other classes
              </label>
            </div>
            {!copyToAllClasses && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {form.classExamConfigs
                  .filter((config) => config.className !== copySourceClass)
                  .map((config) => (
                    <label key={config.className} className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm text-gray-700">
                      <input type="checkbox" checked={copyTargetClasses.includes(config.className)} onChange={() => toggleCopyTarget(config.className)} />
                      {config.className}
                    </label>
                  ))}
              </div>
            )}
            <button type="button" onClick={copyClassSetup} disabled={!copySourceClass || form.classExamConfigs.length < 2} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Copy size={16} /> Copy Setup to Classes
            </button>
          </section>

          {/* Class Configs */}
          {form.classExamConfigs.map((cfg, cfgIdx) => (
            <div key={cfgIdx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-800">{cfg.className}</span>
                <button type="button" onClick={() => addSubjectToConfig(cfgIdx)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition">
                  <Plus size={12} /> Add Subject
                </button>
              </div>
              <div className="p-4 space-y-2">
                {cfg.subjects.map((s, subIdx) => (
                  <div key={subIdx} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800" aria-label="Fixed subject name">
                        {s.subjectName}
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={Boolean(s.hasPractical)} onChange={e => updateSubject(cfgIdx, subIdx, "hasPractical", e.target.checked)} />
                        Has practical
                      </label>
                      <button type="button" onClick={() => removeSubjectFromConfig(cfgIdx, subIdx)} className="justify-self-end p-2 text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      {s.hasPractical ? (
                        <>
                          <LabeledNumberField label="Theory Full Marks" value={Number(s.theoryFullMarks) > 0 ? s.theoryFullMarks : s.fullMarks} onChange={(value) => updateSubject(cfgIdx, subIdx, "theoryFullMarks", value)} min="1" />
                          <LabeledNumberField label="Theory Pass Marks" value={s.theoryPassMarks ?? s.passMarks} onChange={(value) => updateSubject(cfgIdx, subIdx, "theoryPassMarks", value)} min="0" />
                          <LabeledNumberField label="Practical Full Marks" value={s.practicalFullMarks || 0} onChange={(value) => updateSubject(cfgIdx, subIdx, "practicalFullMarks", value)} min="1" />
                          <LabeledNumberField label="Practical Pass Marks" value={s.practicalPassMarks || 0} onChange={(value) => updateSubject(cfgIdx, subIdx, "practicalPassMarks", value)} min="0" />
                        </>
                      ) : (
                        <>
                          <LabeledNumberField label="Full Marks" value={s.fullMarks} onChange={(value) => updateSubject(cfgIdx, subIdx, "fullMarks", value)} min="1" />
                          <LabeledNumberField label="Pass Marks" value={s.passMarks} onChange={(value) => updateSubject(cfgIdx, subIdx, "passMarks", value)} min="0" />
                        </>
                      )}
                      <LabeledNumberField
                        label="Credit Hour"
                        value={s.creditHour ?? 0}
                        onChange={(value) => updateSubject(cfgIdx, subIdx, "creditHour", value)}
                        min="0"
                        step="0.1"
                      />
                      {s.hasPractical && (
                        <LabeledNumberField
                          label="Practical Credit Hour"
                          value={s.practicalCreditHour ?? 0}
                          onChange={(value) => updateSubject(cfgIdx, subIdx, "practicalCreditHour", value)}
                          min="0"
                          step="0.1"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : <><Check size={16} />Update Exam</>}
            </button>
            <button type="button" onClick={() => navigate(`/exams/${id}`)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

const LabeledNumberField = ({ label, value, onChange, min, step = "1" }) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</label>
    <input
      type="number"
      value={value ?? 0}
      onChange={(event) => onChange(event.target.value)}
      className={ic}
      min={min}
      step={step}
      aria-label={label}
    />
  </div>
);

export default EditExam;
