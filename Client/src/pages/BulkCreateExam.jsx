import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { examAPI, subjectAPI } from "../services/api";
import Layout from "../components/Layout";
import { ArrowLeft, Layers, Check, AlertCircle, Plus, Trash2 } from "lucide-react";

const CLASS_NAMES = [
  "Nursery","LKG","UKG",
  "Class 1","Class 2","Class 3","Class 4","Class 5",
  "Class 6","Class 7","Class 8","Class 9","Class 10",
];

const ic = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition";

const BulkCreateExam = () => {
  const navigate = useNavigate();
  const [allSubjects, setAllSubjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    examName: "",
    examType: "regular",
    allClassNames: [...CLASS_NAMES],
    subjectSelectionMode: "allSubjects",
    subjects: [],
    startDate: "",
    endDate: "",
    isFinalExam: false,
    description: "",
  });

  useEffect(() => {
    subjectAPI.getAll().then(r => setAllSubjects(r.data.subjects || [])).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleClass = (cls) => {
    const cur = form.allClassNames;
    set("allClassNames", cur.includes(cls) ? cur.filter(c => c !== cls) : [...cur, cls]);
  };

  const addCustomSubject = () => set("subjects", [...form.subjects, { subjectName: "", fullMarks: 100, passMarks: 40 }]);
  const removeCustomSubject = (i) => set("subjects", form.subjects.filter((_, idx) => idx !== i));
  const updateSubject = (i, field, val) => {
    const updated = [...form.subjects];
    updated[i] = { ...updated[i], [field]: field === "subjectName" ? val : Number(val) };
    set("subjects", updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.examName.trim()) return setError("Exam name is required");
    if (form.allClassNames.length === 0) return setError("Select at least one class");
    setSubmitting(true);
    try {
      await examAPI.createBulk({
        examName: form.examName.trim(),
        examType: form.examType,
        allClassNames: form.allClassNames,
        subjectSelectionMode: form.subjectSelectionMode,
        subjects: form.subjectSelectionMode === "customSubjects" ? form.subjects : [],
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isFinalExam: form.isFinalExam,
        description: form.description,
      });
      navigate("/exams");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create bulk exam");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate("/exams")} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition">
          <ArrowLeft size={18} /> Back to Exams
        </button>

        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Layers size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bulk Create Exam</h1>
            <p className="text-gray-400 text-sm">Create one exam for multiple classes at once</p>
          </div>
        </div>

        {error && <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Exam Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Exam Name *</label>
                <input type="text" value={form.examName} onChange={e => set("examName", e.target.value)} className={ic} placeholder="e.g. First Terminal Exam 2082" required />
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={e => set("description", e.target.value)} className={ic} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} className={ic} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} className={ic} />
              </div>
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Classes</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => set("allClassNames", [...CLASS_NAMES])} className="text-xs text-indigo-600 font-medium hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => set("allClassNames", [])} className="text-xs text-gray-500 font-medium hover:underline">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CLASS_NAMES.map(cls => {
                const sel = form.allClassNames.includes(cls);
                return (
                  <button key={cls} type="button" onClick={() => toggleClass(cls)}
                    className={"py-2 px-3 rounded-xl text-xs font-semibold border-2 transition " + (sel ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                    {cls}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-indigo-600 mt-2 font-medium">{form.allClassNames.length} classes selected</p>
          </div>

          {/* Subjects */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Subject Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { value: "allSubjects",    label: "All Subjects",    desc: "All system subjects" },
                { value: "customSubjects", label: "Custom Subjects", desc: "Enter manually" },
              ].map(m => (
                <button key={m.value} type="button" onClick={() => set("subjectSelectionMode", m.value)}
                  className={"p-3.5 rounded-xl border-2 text-left transition " + (form.subjectSelectionMode === m.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300")}>
                  <p className={"text-sm font-semibold " + (form.subjectSelectionMode === m.value ? "text-indigo-700" : "text-gray-700")}>{m.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
            {form.subjectSelectionMode === "customSubjects" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Custom subjects:</p>
                  <button type="button" onClick={addCustomSubject} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition">
                    <Plus size={13} /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {form.subjects.map((s, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" value={s.subjectName} onChange={e => updateSubject(i, "subjectName", e.target.value)} className={ic} placeholder="Subject name" />
                        <input type="number" value={s.fullMarks} onChange={e => updateSubject(i, "fullMarks", e.target.value)} className={ic} placeholder="Full marks" min="1" />
                        <div className="flex gap-2">
                          <input type="number" value={s.passMarks} onChange={e => updateSubject(i, "passMarks", e.target.value)} className={ic} placeholder="Pass marks" min="0" />
                          <button type="button" onClick={() => removeCustomSubject(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition flex-shrink-0"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Final exam */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <input type="checkbox" id="isFinal" checked={form.isFinalExam} onChange={e => set("isFinalExam", e.target.checked)} className="w-4 h-4 accent-amber-500 cursor-pointer" />
            <label htmlFor="isFinal" className="cursor-pointer">
              <p className="text-sm font-semibold text-amber-800">Mark as Final Exam</p>
              <p className="text-xs text-amber-600 mt-0.5">Used for student promotion. Only one final exam per class per year.</p>
            </label>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</> : <><Check size={16} />Create Bulk Exam</>}
            </button>
            <button type="button" onClick={() => navigate("/exams")} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium text-sm">Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default BulkCreateExam;
