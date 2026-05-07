import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { examAPI, subjectAPI, classAPI } from "../services/api";
import { useAcademicYear } from "../context/AcademicYearContext";
import Layout from "../components/Layout";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  BookOpen,
  AlertCircle,
  Calendar,
} from "lucide-react";

const EXAM_TYPES = [
  { value: "regular", label: "Regular Exam", desc: "First Terminal, Second Terminal, Final Exam" },
  { value: "unit-test", label: "Unit Test", desc: "Chapter-wise or topic-wise test" },
  { value: "practical", label: "Practical Test", desc: "Lab or practical assessment" },
  { value: "internal", label: "Internal Assessment", desc: "Continuous internal evaluation" },
  { value: "re-exam", label: "Re-exam", desc: "For failed or absent students" },
  { value: "custom", label: "Custom Exam", desc: "Any other special purpose exam" },
];

const STEPS = [
  { id: 1, label: "Exam Info" },
  { id: 2, label: "Classes" },
  { id: 3, label: "Subjects" },
  { id: 4, label: "Dates & Options" },
  { id: 5, label: "Review" },
];

const ic =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition";

const StepBar = ({ current }) => (
  <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
    {STEPS.map((step, idx) => {
      const done = current > step.id;
      const active = current === step.id;

      return (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done
                  ? "bg-indigo-600 text-white"
                  : active
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                    : "bg-gray-100 text-gray-400"
                }`}
            >
              {done ? <Check size={14} /> : step.id}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${active ? "text-indigo-600" : done ? "text-gray-600" : "text-gray-400"
                }`}
            >
              {step.label}
            </span>
          </div>

          {idx < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 rounded ${done ? "bg-indigo-600" : "bg-gray-200"
                }`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const NavButtons = ({ step, totalSteps, onBack, onNext, onSubmit, submitting }) => (
  <div className="flex gap-3 mt-6">
    {step > 1 && (
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
      >
        <ArrowLeft size={16} /> Back
      </button>
    )}

    <div className="flex-1" />

    {step < totalSteps ? (
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 text-sm font-semibold transition"
      >
        Next <ArrowRight size={16} />
      </button>
    ) : (
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 text-sm font-semibold transition disabled:opacity-60"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check size={16} /> Create Exam
          </>
        )}
      </button>
    )}
  </div>
);

const CreateExam = () => {
  const navigate = useNavigate();
  const { activeYear } = useAcademicYear();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allClasses, setAllClasses] = useState([]);

  const [form, setForm] = useState({
    examName: "",
    examType: "regular",
    description: "",
    classSelectionMode: "oneClass",
    applicableClasses: [],
    subjectSelectionMode: "allSubjects",
    selectedSubjects: [],
    customSubjects: [],
    targetStudentsMode: "all",
    startDate: "",
    endDate: "",
    marksEntryLastDate: "",
    resultPublishDate: "",
    isFinalExam: false,
    status: "draft",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsRes, classesRes] = await Promise.all([
          subjectAPI.getAll(),
          classAPI.getAll()
        ]);
        setAllSubjects(subjectsRes.data.subjects || []);
        setAllClasses(classesRes.data.classes || []);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const validate = () => {
    setError("");

    if (step === 1 && !form.examName.trim()) {
      setError("Exam name is required");
      return false;
    }

    if (step === 2 && form.applicableClasses.length === 0) {
      setError("Select at least one class");
      return false;
    }

    if (step === 3) {
      if (
        form.subjectSelectionMode === "selectedSubjects" &&
        form.selectedSubjects.length === 0
      ) {
        setError("Select at least one subject");
        return false;
      }

      if (form.subjectSelectionMode === "customSubjects") {
        if (form.customSubjects.length === 0) {
          setError("Add at least one custom subject");
          return false;
        }

        for (const s of form.customSubjects) {
          if (!s.subjectName.trim()) {
            setError("All subjects need a name");
            return false;
          }

          if (!s.fullMarks || s.fullMarks <= 0) {
            setError("Full marks must be greater than 0");
            return false;
          }

          if (s.passMarks > s.fullMarks) {
            setError("Pass marks cannot exceed full marks");
            return false;
          }
        }
      }
    }

    return true;
  };

  const next = () => {
    if (validate()) setStep((s) => s + 1);
  };

  const back = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const buildSubjectsPayload = () => {
    if (form.subjectSelectionMode === "allSubjects") return [];

    if (form.subjectSelectionMode === "selectedSubjects") {
      return form.selectedSubjects.map((name) => ({
        subjectName: name,
        fullMarks: 100,
        passMarks: 40,
        theoryFullMarks: 100,
        practicalFullMarks: 0,
        hasPractical: false,
      }));
    }

    return form.customSubjects;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!activeYear) {
      setError("No active academic year is set. Go to Academic Years and activate one.");
      setStep(1);
      return;
    }

    setSubmitting(true);

    try {
      await examAPI.create({
        examName: form.examName.trim(),
        examType: form.examType,
        classSelectionMode: form.classSelectionMode,
        applicableClasses: form.applicableClasses,
        subjectSelectionMode: form.subjectSelectionMode,
        subjects: buildSubjectsPayload(),
        targetStudentsMode: form.targetStudentsMode,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        marksEntryLastDate: form.marksEntryLastDate || undefined,
        resultPublishDate: form.resultPublishDate || undefined,
        isFinalExam: form.isFinalExam,
        status: form.status,
        description: form.description,
      });

      navigate("/exams");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create exam");
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  const changeClassMode = (mode) => {
    set("classSelectionMode", mode);

    if (mode === "allClasses") {
      set("applicableClasses", allClasses.map(cls => cls.className));
    } else {
      set("applicableClasses", []);
    }
  };

  const toggleClass = (cls) => {
    if (form.classSelectionMode === "oneClass") {
      set("applicableClasses", [cls]);
      return;
    }

    const cur = form.applicableClasses;
    set(
      "applicableClasses",
      cur.includes(cls) ? cur.filter((c) => c !== cls) : [...cur, cls]
    );
  };

  const toggleSubject = (name) => {
    const cur = form.selectedSubjects;
    set(
      "selectedSubjects",
      cur.includes(name) ? cur.filter((s) => s !== name) : [...cur, name]
    );
  };

  const addCustomSubject = () => {
    set("customSubjects", [
      ...form.customSubjects,
      {
        subjectName: "",
        fullMarks: 100,
        passMarks: 40,
        theoryFullMarks: 100,
        practicalFullMarks: 0,
        hasPractical: false,
      },
    ]);
  };

  const updateCustomSubject = (idx, field, val) => {
    const updated = [...form.customSubjects];

    updated[idx] = {
      ...updated[idx],
      [field]:
        field === "subjectName"
          ? val
          : field === "hasPractical"
            ? val
            : Number(val),
    };

    set("customSubjects", updated);
  };

  const removeCustomSubject = (idx) => {
    set(
      "customSubjects",
      form.customSubjects.filter((_, i) => i !== idx)
    );
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/exams")}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 text-sm font-medium transition"
        >
          <ArrowLeft size={18} /> Back to Exams
        </button>

        <div className="flex items-center justify-between gap-3 mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <BookOpen size={20} className="text-indigo-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Exam</h1>
              <p className="text-gray-400 text-sm">
                Step {step} of {STEPS.length}
              </p>
            </div>
          </div>
        </div>

        <StepBar current={step} />

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Exam Name
                </label>
                <input
                  className={ic}
                  value={form.examName}
                  onChange={(e) => set("examName", e.target.value)}
                  placeholder="Example: First Terminal Exam"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Exam Type
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                  {EXAM_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => set("examType", type.value)}
                      className={`text-left p-4 rounded-xl border transition ${form.examType === type.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      <p className="font-semibold text-sm text-gray-900">
                        {type.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className={ic}
                  rows="3"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Optional exam description"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Class Selection Mode
                </label>

                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { value: "oneClass", label: "One Class" },
                    { value: "selectedClasses", label: "Selected Classes" },
                    { value: "allClasses", label: "All Classes" },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => changeClassMode(mode.value)}
                      className={`p-3 rounded-xl border text-sm font-semibold transition ${form.classSelectionMode === mode.value
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allClasses.map((cls) => (
                  <button
                    key={cls._id}
                    type="button"
                    disabled={form.classSelectionMode === "allClasses"}
                    onClick={() => toggleClass(cls.className)}
                    className={`p-3 rounded-xl border text-sm font-semibold transition ${form.applicableClasses.includes(cls.className)
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      } disabled:opacity-80`}
                  >
                    {cls.className}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject Selection Mode
                </label>

                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { value: "allSubjects", label: "All Subjects" },
                    { value: "selectedSubjects", label: "Selected Subjects" },
                    { value: "customSubjects", label: "Custom Subjects" },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => set("subjectSelectionMode", mode.value)}
                      className={`p-3 rounded-xl border text-sm font-semibold transition ${form.subjectSelectionMode === mode.value
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.subjectSelectionMode === "allSubjects" && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                  All subjects assigned to each selected class will be used automatically.
                </div>
              )}

              {form.subjectSelectionMode === "selectedSubjects" && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {allSubjects.map((sub) => (
                    <button
                      key={sub._id || sub.subjectName}
                      type="button"
                      onClick={() => toggleSubject(sub.subjectName)}
                      className={`p-3 rounded-xl border text-left text-sm font-semibold transition ${form.selectedSubjects.includes(sub.subjectName)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      {sub.subjectName}
                    </button>
                  ))}
                </div>
              )}

              {form.subjectSelectionMode === "customSubjects" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={addCustomSubject}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
                  >
                    <Plus size={16} /> Add Subject
                  </button>

                  {form.customSubjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-gray-200 rounded-xl space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">
                          Subject {idx + 1}
                        </h3>

                        <button
                          type="button"
                          onClick={() => removeCustomSubject(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <input
                        className={ic}
                        placeholder="Subject name"
                        value={sub.subjectName}
                        onChange={(e) =>
                          updateCustomSubject(idx, "subjectName", e.target.value)
                        }
                      />

                      <div className="grid sm:grid-cols-2 gap-3">
                        <input
                          className={ic}
                          type="number"
                          placeholder="Full Marks"
                          value={sub.fullMarks}
                          onChange={(e) =>
                            updateCustomSubject(idx, "fullMarks", e.target.value)
                          }
                        />

                        <input
                          className={ic}
                          type="number"
                          placeholder="Pass Marks"
                          value={sub.passMarks}
                          onChange={(e) =>
                            updateCustomSubject(idx, "passMarks", e.target.value)
                          }
                        />
                      </div>

                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={sub.hasPractical}
                          onChange={(e) =>
                            updateCustomSubject(idx, "hasPractical", e.target.checked)
                          }
                        />
                        Has Practical
                      </label>

                      {sub.hasPractical && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input
                            className={ic}
                            type="number"
                            placeholder="Theory Full Marks"
                            value={sub.theoryFullMarks}
                            onChange={(e) =>
                              updateCustomSubject(
                                idx,
                                "theoryFullMarks",
                                e.target.value
                              )
                            }
                          />

                          <input
                            className={ic}
                            type="number"
                            placeholder="Practical Full Marks"
                            value={sub.practicalFullMarks}
                            onChange={(e) =>
                              updateCustomSubject(
                                idx,
                                "practicalFullMarks",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className={ic}
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className={ic}
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Marks Entry Last Date
                  </label>
                  <input
                    type="date"
                    className={ic}
                    value={form.marksEntryLastDate}
                    onChange={(e) => set("marksEntryLastDate", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Result Publish Date
                  </label>
                  <input
                    type="date"
                    className={ic}
                    value={form.resultPublishDate}
                    onChange={(e) => set("resultPublishDate", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Students
                </label>

                <select
                  className={ic}
                  value={form.targetStudentsMode}
                  onChange={(e) => set("targetStudentsMode", e.target.value)}
                >
                  <option value="all">All Students</option>
                  <option value="selected">Selected Students</option>
                  <option value="failedOnly">Failed Students Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>

                <select
                  className={ic}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>

              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFinalExam}
                  onChange={(e) => set("isFinalExam", e.target.checked)}
                />
                <div>
                  <p className="font-semibold text-sm text-gray-800">
                    This is Final Exam
                  </p>
                  <p className="text-xs text-gray-500">
                    Final exam can be used for student promotion.
                  </p>
                </div>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Review Exam Details
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <Review label="Exam Name" value={form.examName} />
                <Review label="Academic Year" value={activeYear?.yearName || "Not set"} />
                <Review label="Exam Type" value={form.examType} />
                <Review label="Class Mode" value={form.classSelectionMode} />
                <Review
                  label="Classes"
                  value={form.applicableClasses.join(", ") || "None"}
                />
                <Review label="Subject Mode" value={form.subjectSelectionMode} />
                <Review label="Target Students" value={form.targetStudentsMode} />
                <Review label="Status" value={form.status} />
                <Review label="Final Exam" value={form.isFinalExam ? "Yes" : "No"} />
                <Review label="Start Date" value={form.startDate || "Not set"} />
                <Review label="End Date" value={form.endDate || "Not set"} />
                <Review label="Marks Entry Last Date" value={form.marksEntryLastDate || "Not set"} />
                <Review label="Result Publish Date" value={form.resultPublishDate || "Not set"} />
              </div>
            </div>
          )}

          <NavButtons
            step={step}
            totalSteps={STEPS.length}
            onBack={back}
            onNext={next}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </Layout>
  );
};

const Review = ({ label, value }) => (
  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
    <p className="text-xs text-gray-400 font-medium">{label}</p>
    <p className="text-sm text-gray-800 font-semibold mt-1">{value}</p>
  </div>
);

export default CreateExam;