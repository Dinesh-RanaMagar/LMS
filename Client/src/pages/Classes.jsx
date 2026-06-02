import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Building2,
  CheckCircle,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import { classAPI, subjectAPI, classSubjectAPI } from "../services/api";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white";

function ClassesSubjects() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [editingClass, setEditingClass] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);

  const [classForm, setClassForm] = useState({
    className: "",
    sections: "A, B, C",
    order: 0,
  });

  const [subjectForm, setSubjectForm] = useState({
    subjectName: "",
    code: "",
    hasPractical: false,
  });

  const [assignForm, setAssignForm] = useState({
    className: "",
    subjects: [],
  });
  const [copySourceClass, setCopySourceClass] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError('');

    try {
      if (!localStorage.getItem('token')) {
        setError('Authentication token is missing. Please log in again.');
        return;
      }

      const [classRes, subjectRes, assignRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll(),
        classSubjectAPI.getAll(),
      ]);

      setClasses(classRes.data?.classes ?? []);
      setSubjects(subjectRes.data?.subjects ?? []);
      setAssignments(assignRes.data?.assignments ?? []);
    } catch (error) {
      console.error('Fetch error:', error);
      setError(
        error.response?.data?.message || error.message || 'Failed to load class data.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetClassForm = () => {
    setEditingClass(null);
    setClassForm({
      className: "",
      sections: "A, B, C",
      order: 0,
    });
  };

  const resetSubjectForm = () => {
    setEditingSubject(null);
    setSubjectForm({
      subjectName: "",
      code: "",
      hasPractical: false,
    });
  };

  const openAssignModal = (className) => {
    const existing = assignments.find((a) => a.className === className);

    setAssignForm({
      className,
      subjects:
        existing?.subjects?.map((s) => ({
          subject: s.subject?._id || s.subject,
          subjectName: s.subjectName || s.subject?.subjectName || "",
          fullMarks: s.fullMarks || 100,
          passMarks: s.passMarks || 40,
          theoryFullMarks: s.theoryFullMarks || 100,
          practicalFullMarks: s.practicalFullMarks || 0,
          hasPractical: s.hasPractical || false,
        })) || [],
    });
    setCopySourceClass("");
    setShowAssignModal(true);
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      className: classForm.className,
      sections: classForm.sections
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      order: Number(classForm.order),
    };

    try {
      if (editingClass) {
        await classAPI.update(editingClass._id, payload);
      } else {
        await classAPI.create(payload);
      }

      setShowClassModal(false);
      resetClassForm();
      fetchData();
    } catch (error) {
      console.error("Class save error:", error);
      alert(error.response?.data?.message || "Failed to save class");
    }
  };

  const handleSubjectSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingSubject) {
        await subjectAPI.update(editingSubject._id, subjectForm);
      } else {
        await subjectAPI.create(subjectForm);
      }

      setShowSubjectModal(false);
      resetSubjectForm();
      fetchData();
    } catch (error) {
      console.error("Subject save error:", error);
      alert(error.response?.data?.message || "Failed to save subject");
    }
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();

    if (!assignForm.className) {
      alert("Please select class");
      return;
    }

    if (assignForm.subjects.length === 0) {
      alert("Please assign at least one subject");
      return;
    }

    try {
      await classSubjectAPI.createOrUpdate(assignForm);
      setShowAssignModal(false);
      fetchData();
    } catch (error) {
      console.error("Assignment save error:", error);
      alert(error.response?.data?.message || "Failed to assign subjects");
    }
  };

  const editClass = (cls) => {
    setEditingClass(cls);
    setClassForm({
      className: cls.className,
      sections: (cls.sections || []).join(", "),
      order: cls.order || 0,
    });
    setShowClassModal(true);
  };

  const editSubject = (subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      subjectName: subject.subjectName,
      code: subject.code || "",
      hasPractical: subject.hasPractical || false,
    });
    setShowSubjectModal(true);
  };

  const copyAssignedSubjectsFrom = (sourceClassName) => {
    const source = assignments.find((a) => a.className === sourceClassName);
    if (!source?.subjects?.length) return;

    setAssignForm((prev) => ({
      ...prev,
      subjects: source.subjects.map((s) => ({
        subject: s.subject?._id || s.subject,
        subjectName: s.subjectName || s.subject?.subjectName || "",
        fullMarks: s.fullMarks || 100,
        passMarks: s.passMarks || 40,
        theoryFullMarks: s.theoryFullMarks || 100,
        practicalFullMarks: s.practicalFullMarks || 0,
        hasPractical: s.hasPractical || false,
      })),
    }));
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Delete this class?")) return;

    try {
      await classAPI.delete(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete class");
    }
  };

  const deleteSubject = async (id) => {
    if (!window.confirm("Delete this subject?")) return;

    try {
      await subjectAPI.delete(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete subject");
    }
  };

  const toggleAssignSubject = (subject) => {
    const exists = assignForm.subjects.find((s) => s.subject === subject._id);

    if (exists) {
      setAssignForm({
        ...assignForm,
        subjects: assignForm.subjects.filter((s) => s.subject !== subject._id),
      });
    } else {
      setAssignForm({
        ...assignForm,
        subjects: [
          ...assignForm.subjects,
          {
            subject: subject._id,
            subjectName: subject.subjectName,
            fullMarks: 100,
            passMarks: 40,
            theoryFullMarks: subject.hasPractical ? 75 : 100,
            practicalFullMarks: subject.hasPractical ? 25 : 0,
            hasPractical: subject.hasPractical || false,
          },
        ],
      });
    }
  };

  const getAssignedSubjects = (className) => {
    const assignment = assignments.find((a) => a.className === className);
    return assignment?.subjects || [];
  };

  const allSections = Array.from(
    new Set(classes.flatMap((cls) => cls.sections || []))
  )
    .filter(Boolean)
    .sort();

  const filteredClasses = classes.filter((cls) => {
    const matchesClass = selectedClassFilter
      ? cls.className === selectedClassFilter
      : true;
    const matchesSection = sectionFilter
      ? (cls.sections || []).includes(sectionFilter)
      : true;
    return matchesClass && matchesSection;
  });

  if (loading) {
    return (
      <Layout>
        <div className="h-64 flex justify-center items-center">
          <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Classes & Subject Setup
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Manage class sections, promotion order, and assigned subjects in one place. Use the filters below to find a class or section quickly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                resetClassForm();
                setShowClassModal(true);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 flex items-center gap-2 text-sm font-semibold"
            >
              <Building2 size={18} /> Add Class
            </button>

            <button
              onClick={() => {
                resetSubjectForm();
                setShowSubjectModal(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 flex items-center gap-2 text-sm font-semibold"
            >
              <Plus size={18} /> Add Subject
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-3xl p-4">
                <p className="font-semibold">Unable to load classes</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50"
                >
                  <option value="">Filter by class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls.className}>
                      {cls.className}
                    </option>
                  ))}
                </select>
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50"
                >
                  <option value="">Filter by section</option>
                  {allSections.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSelectedClassFilter("");
                    setSectionFilter("");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl hover:bg-gray-200 text-sm font-medium"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-800">Classes</h2>

            {filteredClasses.length === 0 ? (
              <EmptyCard
                icon={<Building2 size={42} />}
                title={classes.length ? "No matching classes" : "No classes added"}
                text={classes.length ? "Try a different class name or section filter." : "Add class first, then assign subjects."}
              />
            ) : (
              filteredClasses.map((cls) => {
                const assigned = getAssignedSubjects(cls.className);

                return (
                  <div
                    key={cls._id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-5 border-b border-gray-100 flex justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {cls.className}
                        </h3>
                        <p className="text-xs font-semibold text-indigo-600 mt-1">
                          Promotion Rank: {cls.order || 0}
                        </p>

                        <div className="flex gap-2 mt-2 flex-wrap">
                          {(cls.sections || []).map((sec) => (
                            <span
                              key={sec}
                              className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium"
                            >
                              Sec {sec}
                            </span>
                          ))}
                        </div>

                        <p className="text-sm text-gray-500 mt-2">
                          {assigned.length} assigned subject
                          {assigned.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex gap-2 h-fit">
                        <button
                          onClick={() => openAssignModal(cls.className)}
                          className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-semibold"
                        >
                          Assign Subjects
                        </button>

                        <button
                          onClick={() => editClass(cls)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <Edit size={17} />
                        </button>

                        <button
                          onClick={() => deleteClass(cls._id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    <div className="p-5">
                      {assigned.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          No subjects assigned yet.
                        </p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                          {assigned.map((item, index) => (
                            <div
                              key={index}
                              className="border border-gray-200 rounded-xl p-4"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                  <BookOpen
                                    size={20}
                                    className="text-indigo-600"
                                  />
                                </div>

                                <div>
                                  <h4 className="font-semibold text-gray-800">
                                    {item.subjectName ||
                                      item.subject?.subjectName}
                                  </h4>
                                  <p className="text-xs text-gray-400">
                                    Assigned to this class
                                  </p>
                                </div>
                              </div>

                              {item.hasPractical && (
                                <p className="text-xs mt-2 text-purple-600">
                                  Practical subject
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Subject Master
            </h2>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No subjects created yet.
                </p>
              ) : (
                subjects.map((subject) => (
                  <div
                    key={subject._id}
                    className="flex items-center justify-between border border-gray-100 rounded-xl p-3"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {subject.subjectName}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {subject.code || "No code"}{" "}
                        {subject.hasPractical ? "• Practical" : ""}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => editSubject(subject)}
                        className="p-2 text-gray-400 hover:text-indigo-600"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => deleteSubject(subject._id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {showClassModal && (
          <Modal
            title={editingClass ? "Edit Class" : "Add Class"}
            icon={<Building2 className="text-emerald-600" />}
            onClose={() => setShowClassModal(false)}
          >
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Class Name
                </label>
                <input
                  required
                  className={inputClass}
                  value={classForm.className}
                  onChange={(e) =>
                    setClassForm({ ...classForm, className: e.target.value })
                  }
                  placeholder="Class 8"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Sections
                </label>
                <input
                  className={inputClass}
                  value={classForm.sections}
                  onChange={(e) =>
                    setClassForm({ ...classForm, sections: e.target.value })
                  }
                  placeholder="A, B, C"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Promotion Rank
                </label>
                <p className="text-xs text-gray-400 mb-1">Lower rank comes first. Example: Nursery 1, LKG 2, UKG 3, Class 1 4.</p>
                <input
                  type="number"
                  className={inputClass}
                  value={classForm.order}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      order: Number(e.target.value),
                    })
                  }
                />
              </div>

              <ModalButtons onClose={() => setShowClassModal(false)} />
            </form>
          </Modal>
        )}

        {showSubjectModal && (
          <Modal
            title={editingSubject ? "Edit Subject" : "Add Subject"}
            icon={<BookOpen className="text-indigo-600" />}
            onClose={() => setShowSubjectModal(false)}
          >
            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject Name
                </label>
                <input
                  required
                  className={inputClass}
                  value={subjectForm.subjectName}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      subjectName: e.target.value,
                    })
                  }
                  placeholder="English"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Subject Code
                </label>
                <input
                  className={inputClass}
                  value={subjectForm.code}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, code: e.target.value })
                  }
                  placeholder="ENG"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={subjectForm.hasPractical}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      hasPractical: e.target.checked,
                    })
                  }
                />
                Has Practical
              </label>

              <ModalButtons onClose={() => setShowSubjectModal(false)} />
            </form>
          </Modal>
        )}

        {showAssignModal && (
          <Modal
            title={`Assign Subjects - ${assignForm.className}`}
            icon={<CheckCircle className="text-indigo-600" />}
            onClose={() => setShowAssignModal(false)}
            size="max-w-3xl"
          >
            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              {subjects.length === 0 ? (
                <p className="text-sm text-red-500">
                  Please create subject master first.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 items-end">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Copy subjects from another class
                      </label>
                      <select
                        value={copySourceClass}
                        onChange={(e) => setCopySourceClass(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50"
                      >
                        <option value="">Select source class</option>
                        {assignments
                          .filter((a) => a.className !== assignForm.className && a.subjects?.length)
                          .map((assignment) => (
                            <option key={assignment.className} value={assignment.className}>
                              {assignment.className}
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={!copySourceClass}
                      onClick={() => copyAssignedSubjectsFrom(copySourceClass)}
                      className="w-full sm:w-auto px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      Copy subjects
                    </button>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm text-gray-500">
                      Subjects selected below will be assigned to {assignForm.className}.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {subjects.map((subject) => {
                      const selected = assignForm.subjects.find(
                        (s) => s.subject === subject._id
                      );

                      return (
                        <div
                          key={subject._id}
                          className={`border rounded-xl p-4 ${selected
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-gray-200"
                            }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => toggleAssignSubject(subject)}
                            />
                            <span className="font-semibold text-gray-800">
                              {subject.subjectName}
                            </span>
                          </label>

                          {selected && (
                            <p className="text-xs text-indigo-600 mt-3 font-medium">
                              Subject selected for this class
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <ModalButtons onClose={() => setShowAssignModal(false)} />
            </form>
          </Modal>
        )}
      </div>
    </Layout>
  );
}

const EmptyCard = ({ icon, title, text }) => (
  <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
    <div className="text-gray-200 flex justify-center mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    <p className="text-sm text-gray-400 mt-2">{text}</p>
  </div>
);

const Modal = ({ title, icon, children, onClose, size = "max-w-lg" }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-2xl p-6 w-full ${size} shadow-2xl max-h-[90vh] overflow-y-auto`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={22} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalButtons = ({ onClose }) => (
  <div className="flex gap-3 pt-3">
    <button
      type="button"
      onClick={onClose}
      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-semibold"
    >
      Cancel
    </button>
    <button
      type="submit"
      className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold"
    >
      Save
    </button>
  </div>
);

export default ClassesSubjects;