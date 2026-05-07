import { useState, useEffect } from "react";
import { GraduationCap, CheckCircle, XCircle, UserCheck, AlertCircle } from "lucide-react";
import Layout from "../components/Layout";
import { promotionAPI, academicYearAPI } from "../services/api";

const Promotion = () => {
    const [eligibleStudents, setEligibleStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [promoting, setPromoting] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [activeAcademicYear, setActiveAcademicYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [targetAcademicYear, setTargetAcademicYear] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
    const [promotionLocked, setPromotionLocked] = useState(false);
    const [lockReason, setLockReason] = useState("");

    const fetchEligibleStudents = async () => {
        setLoading(true);
        setError("");
        setSuccess("");
        setPromotionLocked(false);
        setLockReason("");

        try {
            const response = await promotionAPI.getEligible();
            const yearResponse = await academicYearAPI.getAll();
            const years = yearResponse.data.academicYears || yearResponse.data || [];
            const activeYear = response.data.activeAcademicYear || "";
            const eligible = response.data.data || [];

            setEligibleStudents(eligible);
            setActiveAcademicYear(activeYear);
            setAcademicYears(years);

            const nextYear = years.find((year) => year.yearName !== activeYear && !year.isActive);
            setTargetAcademicYear(nextYear?.yearName || "");

            if (eligible.length === 0) {
                setPromotionLocked(true);
                setLockReason("No eligible students found. Complete final exam grading for the active academic year before promotion.");
            }
        } catch (fetchError) {
            console.error("Error fetching eligible students:", fetchError);

            if (fetchError.response?.status === 404) {
                setPromotionLocked(true);
                setLockReason("No completed final exams found for the active academic year. Please complete final exams first.");
                setEligibleStudents([]);
                setAcademicYears([]);
                setTargetAcademicYear("");
            } else {
                setError(fetchError.response?.data?.message || "Failed to fetch eligible students");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEligibleStudents();
    }, []);

    const handleSelectStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === eligibleStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(eligibleStudents.map(item => item.student._id));
        }
    };

    const handlePromote = async () => {
        setError("");
    setSuccess("");

    if (selectedStudents.length === 0) {
      setError("Please select students to promote.");
      return;
    }

    if (!targetAcademicYear) {
      setError("Please select target academic year.");
      return;
    }

    if (promotionLocked) {
      setError("Promotion is currently locked. Unlock it before promoting students.");
      return;
    }

    if (!window.confirm(`Are you sure you want to promote ${selectedStudents.length} student(s)?`)) {
      return;
    }

    setPromoting(true);
    try {
      const response = await promotionAPI.promote({
        studentIds: selectedStudents,
        toAcademicYear: targetAcademicYear
      });

      const successCount = response.data.data.promoted.length;
      const errors = response.data.data.errors || [];
      setSuccess(`Successfully promoted ${successCount} student${successCount !== 1 ? 's' : ''}.`);
      if (errors.length > 0) {
        setError(`Some students could not be promoted: ${errors.join(', ')}`);
      }

      // Refresh the list
      fetchEligibleStudents();
      setSelectedStudents([]);

    } catch (error) {
      console.error("Error promoting students:", error);
      setError(error.response?.data?.message || "Failed to promote students");
    } finally {
      setPromoting(false);
    }
    };

    if (loading) {
        return (
            <Layout>
              <div className="h-64 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            </Layout>
        );
    }

    return (
      <Layout>
        <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Student Promotion</h1>
                    <p className="text-gray-600 mt-1">
                        Students with final exam results in {activeAcademicYear}. Passed students move up a class; failed students stay in the same class for the next year.
                    </p>
                    {promotionLocked && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-sm font-medium border border-orange-100">
                        <AlertCircle size={16} /> Promotion locked
                      </div>
                    )}
                </div>
                {selectedStudents.length > 0 && (
                    <button
                        onClick={handlePromote}
                        disabled={promoting || promotionLocked || !targetAcademicYear}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <UserCheck size={20} />
                        {promoting ? "Promoting..." : `Promote ${selectedStudents.length} Students`}
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <GraduationCap className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Eligible Students</p>
                            <p className="text-2xl font-bold text-gray-900">{eligibleStudents.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Selected for Promotion</p>
                            <p className="text-2xl font-bold text-gray-900">{selectedStudents.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-orange-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Academic Year</p>
                            <p className="text-2xl font-bold text-gray-900">{activeAcademicYear}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {promotionLocked ? (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                    <strong>Promotion locked:</strong> {lockReason || 'Promotion is unavailable until the active academic year has final exam results.'}
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Students To Academic Year</label>
                    <select
                        value={targetAcademicYear}
                        onChange={(e) => setTargetAcademicYear(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="">Select target academic year</option>
                        {academicYears.map((year) => (
                            <option key={year._id || year.yearName} value={year.yearName}>{year.yearName}{year.isActive ? " (Active)" : ""}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Choose the year where promoted students should be transferred.</p>
                  </>
                )}
                {error && <div className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}
                {success && <div className="mt-3 rounded-xl bg-green-50 border border-green-200 text-green-700 p-3 text-sm">{success}</div>}
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Students Eligible for Promotion
                    </h2>
                    {eligibleStudents.length > 0 && (
                        <button
                            onClick={handleSelectAll}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            {selectedStudents.length === eligibleStudents.length ? "Deselect All" : "Select All"}
                        </button>
                    )}
                </div>

                {eligibleStudents.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                        <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No students eligible for promotion</p>
                        <p className="text-sm">Students with completed final exam results will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {eligibleStudents.map((item) => (
                            <div key={item.student._id} className="px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(item.student._id)}
                                            onChange={() => handleSelectStudent(item.student._id)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {item.student.name}
                                            </h3>
                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                <span>Class: {item.currentClass}</span>
                                                <span>Roll: {item.student.rollNo}</span>
                                                <span>Section: {item.student.section}</span>
                                                {item.student.symbolNo && (
                                                    <span>Symbol: {item.student.symbolNo}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                                <span>Exam: {item.exam}</span>
                                                <span>Grade: {item.marksheet.grade}</span>
                                                <span>GPA: {item.marksheet.gpa}</span>
                                                <span className={item.marksheet.result === 'Fail' ? 'text-yellow-600 font-medium' : 'text-green-600 font-medium'}>
                                                    Target Class: {item.nextClass}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {item.marksheet.result === 'Fail' ? (
                                            <>
                                                <XCircle className="h-5 w-5 text-yellow-500" />
                                                <span className="text-sm text-yellow-600 font-medium">Failed</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                                <span className="text-sm text-green-600 font-medium">Passed</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Promotion Summary */}
            {selectedStudents.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                        Promotion Summary
                    </h3>
                    <p className="text-blue-700">
                        {selectedStudents.length} student(s) selected for promotion to {targetAcademicYear || "selected academic year"}.
                        They will be moved to the next higher ranked class and marked as promoted.
                    </p>
                    <div className="mt-4 flex space-x-3">
                        <button
                            onClick={handlePromote}
                            disabled={promoting}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {promoting ? "Processing..." : "Confirm Promotion"}
                        </button>
                        <button
                            onClick={() => setSelectedStudents([])}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        >
                            Cancel Selection
                        </button>
                    </div>
                </div>
            )}
        </div>
      </Layout>
    );
};

export default Promotion;