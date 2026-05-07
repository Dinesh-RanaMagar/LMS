import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { examAPI, subjectAPI } from "../services/api";
import Layout from "../components/Layout";
import { ArrowLeft, BookOpen, AlertCircle, Plus, Trash2, Check } from "lucide-react";

const ic = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition";

const EditExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [allSubjects, setAllSubjects] = useState([]);

  const [form, setForm] = useState({
    examName: "", examType: "regular", description: "",
    startDate: "", endDate: "", isFinalExam: false, status: "draft",
    classExamConfigs: [],
  });

  useEffect(() => {
    Promise.all([
      examAPI.getById(id),
      subjectAPI.getAll(),
    ]).then(([examRes, subRes]) => {
      const e = examRes.data.exam;
      setAllSubjects(subRes.data.subjects || []);
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
    subjects[subIdx] = { ...subjects[subIdx], [field]: field === "subjectName" ? val : Number(val) };
    configs[cfgIdx] = { ...configs[cfgIdx], subjects };
    set("classExamConfigs", configs);
  };

  const addSubjectToConfig = (cfgIdx) => {
    const configs = [...form.classExamConfigs];
    configs[cfgIdx] = { ...configs[cfgIdx], subjects: [...configs[cfgIdx].subjects, { subjectName: "", fullMarks: 100, passMarks: 40 }] };
    set("classExamConfigs", configs);
  };

  const removeSubjectFromConfig = (cfgIdx, subIdx) => {
    const configs = [...form.classExamConfigs];
    configs[cfgIdx] = { ...configs[cfgIdx], subjects: configs[cfgIdx].subjects.filter((_, i) => i !== subIdx) };
    set("classExamConfigs", configs);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.examName.trim()) return setError("Exam name is required");
    setSubmitting(true);
    try {
      await examAPI.update(id, form);
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
                  <div key={subIdx} className="grid grid-cols-3 gap-2 items-center">
                    <input type="text" value={s.subjectName} onChange={e => updateSubject(cfgIdx, subIdx, "subjectName", e.target.value)} className={ic} placeholder="Subject name" />
                    <input type="number" value={s.fullMarks} onChange={e => updateSubject(cfgIdx, subIdx, "fullMarks", e.target.value)} className={ic} placeholder="Full marks" min="1" />
                    <div className="flex gap-2">
                      <input type="number" value={s.passMarks} onChange={e => updateSubject(cfgIdx, subIdx, "passMarks", e.target.value)} className={ic} placeholder="Pass marks" min="0" />
                      <button type="button" onClick={() => removeSubjectFromConfig(cfgIdx, subIdx)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0"><Trash2 size={14} /></button>
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

export default EditExam;
