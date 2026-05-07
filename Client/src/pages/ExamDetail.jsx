import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { examAPI } from "../services/api";
import Layout from "../components/Layout";
import { ArrowLeft, Edit2, Lock, Unlock, Trash2, CheckCircle, Clock, Users, BookOpen, AlertCircle, Calendar } from "lucide-react";

const STATUS_CONFIG = {
  draft:     { label: "Draft",     color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  active:    { label: "Active",    color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  locked:    { label: "Locked",    color: "bg-red-100 text-red-700",     dot: "bg-red-500" },
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-800 text-right max-w-xs">{value || "—"}</span>
  </div>
);

const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { fetchExam(); }, [id]);

  const fetchExam = async () => {
    try {
      const res = await examAPI.getById(id);
      setExam(res.data.exam);
    } catch { setError("Failed to load exam"); }
    finally { setLoading(false); }
  };

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const handleLock = async () => {
    try { const r = await examAPI.lock(id); setExam(r.data.exam); flash("Exam locked"); }
    catch (e) { setError(e.response?.data?.message || "Failed"); }
  };

  const handleUnlock = async () => {
    try { const r = await examAPI.unlock(id); setExam(r.data.exam); flash("Exam unlocked"); }
    catch (e) { setError(e.response?.data?.message || "Failed"); }
  };

  const handleDelete = async () => {
    try { await examAPI.delete(id); navigate("/exams"); }
    catch (e) { setError(e.response?.data?.message || "Failed to delete"); setDeleteConfirm(false); }
  };

  const handleStatus = async (status) => {
    try { const r = await examAPI.updateStatus(id, status); setExam(r.data.exam); flash(`Status: ${status}`); }
    catch (e) { setError(e.response?.data?.message || "Failed"); }
  };

  const handlePublishResult = async () => {
    try { const r = await examAPI.publishResult(id); setExam(r.data.exam); flash("Result published"); }
    catch (e) { setError(e.response?.data?.message || "Failed to publish result"); }
  };

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!exam) return <Layout><div className="p-8 text-center text-gray-400">Exam not found</div></Layout>;

  const cfg = STATUS_CONFIG[exam.status] || STATUS_CONFIG.draft;
  const isLocked = exam.status === "locked";

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <button onClick={() => navigate("/exams")} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition">
          <ArrowLeft size={18} /> Back to Exams
        </button>

        {error && <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          <div className={`h-1.5 w-full ${exam.isFinalExam ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`} />
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                    {exam.examType?.replace("-", " ")}
                  </span>
                  {exam.isFinalExam && <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">FINAL EXAM</span>}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{exam.examName}</h1>
                <p className="text-gray-400 text-sm mt-1">Academic Year: {exam.academicYear}</p>
                {exam.description && <p className="text-gray-500 text-sm mt-2">{exam.description}</p>}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {!isLocked && (
                  <button onClick={() => navigate(`/exams/edit/${id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition text-xs font-semibold">
                    <Edit2 size={14} /> Edit
                  </button>
                )}
                {isLocked ? (
                  <button onClick={handleUnlock} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition text-xs font-semibold">
                    <Unlock size={14} /> Unlock
                  </button>
                ) : (
                  <button onClick={handleLock} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600 transition text-xs font-semibold">
                    <Lock size={14} /> Lock
                  </button>
                )}
                <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition text-xs font-semibold">
                  <Trash2 size={14} /> Delete
                </button>
                {!exam.isResultPublished && (
                  <button onClick={handlePublishResult} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition text-xs font-semibold">
                    <CheckCircle size={14} /> Publish Result
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Exam Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Exam Details</h2>
            <InfoRow label="Academic Year" value={exam.academicYear} />
            <InfoRow label="Exam Type" value={exam.examType?.replace("-", " ")} />
            <InfoRow label="Class Mode" value={exam.classSelectionMode} />
            <InfoRow label="Subject Mode" value={exam.classExamConfigs?.[0]?.subjectSelectionMode || "—"} />
            <InfoRow label="Target Students" value={exam.classExamConfigs?.[0]?.targetStudentsMode || "all"} />
            <InfoRow label="Start Date" value={exam.startDate ? new Date(exam.startDate).toLocaleDateString() : null} />
            <InfoRow label="End Date" value={exam.endDate ? new Date(exam.endDate).toLocaleDateString() : null} />
            <InfoRow label="Marks Entry Last Date" value={exam.marksEntryLastDate ? new Date(exam.marksEntryLastDate).toLocaleDateString() : null} />
            <InfoRow label="Result Publish Date" value={exam.resultPublishDate ? new Date(exam.resultPublishDate).toLocaleDateString() : null} />
            <InfoRow label="Result Published" value={exam.isResultPublished ? "Yes" : "No"} />
            <InfoRow label="Final Exam" value={exam.isFinalExam ? "Yes" : "No"} />
          </div>

          {/* Status Management */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Management</h2>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                <button key={val} onClick={() => handleStatus(val)} disabled={exam.status === val}
                  className={"w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition " + (exam.status === val ? "border-indigo-400 bg-indigo-50" : "border-gray-100 hover:border-gray-200")}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${c.dot}`} />
                  <div>
                    <p className={"text-sm font-semibold " + (exam.status === val ? "text-indigo-700" : "text-gray-700")}>{c.label}</p>
                  </div>
                  {exam.status === val && <CheckCircle size={16} className="ml-auto text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Classes & Subjects */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Classes & Subjects</h2>
          {(exam.classExamConfigs || []).length === 0 ? (
            <p className="text-sm text-gray-400">No class configurations found.</p>
          ) : (
            <div className="space-y-4">
              {exam.classExamConfigs.map((cfg, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-indigo-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-indigo-800">{cfg.className}</span>
                    <span className="text-xs text-indigo-500">{cfg.subjects?.length || 0} subjects</span>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(cfg.subjects || []).map((s, j) => (
                        <div key={j} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <span className="font-medium text-gray-700">{s.subjectName}</span>
                          <span className="text-gray-400">FM:{s.fullMarks} PM:{s.passMarks}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-500" /></div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">Delete Exam?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">"{exam.examName}" will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ExamDetail;
