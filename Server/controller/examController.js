import Exam from "../model/examModel.js";
import Subject from "../model/SubjectModel.js";
import AcademicYear from "../model/AcademicYearModel.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate a subjects array.
 * Returns an error string or null if valid.
 */
const validateSubjects = (subjects) => {
    if (!Array.isArray(subjects) || subjects.length === 0)
        return "At least one subject is required";

    for (const s of subjects) {
        if (!s.subjectName || !s.subjectName.trim())
            return "Each subject must have a name";
        if (!s.fullMarks || s.fullMarks <= 0)
            return `Full marks must be greater than 0 (subject: ${s.subjectName})`;
        if (s.passMarks == null || s.passMarks < 0)
            return `Pass marks cannot be negative (subject: ${s.subjectName})`;
        if (s.passMarks > s.fullMarks)
            return `Pass marks cannot exceed full marks (subject: ${s.subjectName})`;
    }
    return null;
};

/**
 * Build classExamConfigs for a list of class names using the given
 * subjectSelectionMode and subjects payload.
 */
const buildClassConfigs = async (classNames, subjectSelectionMode, subjectsPayload) => {
    const configs = [];

    for (const className of classNames) {
        let subjects = [];

        if (subjectSelectionMode === "allSubjects") {
            // Load all global subjects and map to config shape
            const allSubjects = await Subject.find().sort({ subjectName: 1 });
            subjects = allSubjects.map((s) => ({
                subjectName: s.subjectName,
                fullMarks: 100,
                passMarks: 40,
                theoryFullMarks: 0,
                practicalFullMarks: 0,
                hasPractical: false,
            }));
        } else {
            // selectedSubjects or customSubjects — use what admin sent
            subjects = (subjectsPayload || []).map((s) => ({
                subjectName: s.subjectName,
                fullMarks: s.fullMarks || 100,
                passMarks: s.passMarks || 40,
                theoryFullMarks: s.theoryFullMarks || 0,
                practicalFullMarks: s.practicalFullMarks || 0,
                hasPractical: s.hasPractical || false,
            }));
        }

        configs.push({
            className,
            subjectSelectionMode,
            subjects,
            targetStudentsMode: "all",
            selectedStudents: [],
        });
    }

    return configs;
};

// ─── CREATE SINGLE EXAM ───────────────────────────────────────────────────────
export const createExam = async (req, res) => {
    try {
        let {
            examName,
            examType,
            classSelectionMode,
            applicableClasses,
            subjectSelectionMode,
            subjects,           // used for selectedSubjects / customSubjects
            classExamConfigs,   // optional: admin can send full per-class config
            startDate,
            endDate,
            marksEntryLastDate,
            resultPublishDate,
            isFinalExam,
            status,
            description,
        } = req.body;

        // ── Basic validation ──────────────────────────────────────────────────
        if (!examName || !examName.trim())
            return res.status(400).json({ success: false, message: "Exam name is required" });
        
        if (!applicableClasses || applicableClasses.length === 0)
            return res.status(400).json({ success: false, message: "At least one class is required" });

        const activeYear = await AcademicYear.findOne({ isActive: true });
        if (!activeYear) {
            return res.status(400).json({
                success: false,
                message: "No active academic year found. Please set an active academic year first.",
            });
        }
        const academicYear = activeYear.yearName;

        // ── Duplicate check ───────────────────────────────────────────────────
        const existing = await Exam.findOne({
            examName: examName.trim(),
            academicYear,
        });
        if (existing)
            return res.status(400).json({
                success: false,
                message: `Exam "${examName}" already exists for academic year ${academicYear}`,
            });

        // ── Final exam uniqueness per class ───────────────────────────────────
        if (isFinalExam) {
            const finalExists = await Exam.findOne({
                academicYear,
                isFinalExam: true,
                applicableClasses: { $in: applicableClasses },
            });
            if (finalExists)
                return res.status(400).json({
                    success: false,
                    message: `A final exam already exists for one or more selected classes in ${academicYear}`,
                });
        }

        // ── Build per-class configs ───────────────────────────────────────────
        let finalClassConfigs = classExamConfigs;

        if (!finalClassConfigs || finalClassConfigs.length === 0) {
            // Validate subjects for non-allSubjects modes
            if (subjectSelectionMode !== "allSubjects") {
                const err = validateSubjects(subjects);
                if (err) return res.status(400).json({ success: false, message: err });
            }
            finalClassConfigs = await buildClassConfigs(
                applicableClasses,
                subjectSelectionMode || "allSubjects",
                subjects
            );
        }

        // ── Create exam ───────────────────────────────────────────────────────
        const exam = await Exam.create({
            examName: examName.trim(),
            academicYear,
            examType: examType || "regular",
            classSelectionMode: classSelectionMode || "oneClass",
            applicableClasses,
            classExamConfigs: finalClassConfigs,
            startDate,
            endDate,
            marksEntryLastDate,
            resultPublishDate,
            isFinalExam: isFinalExam || false,
            status: status || "draft",
            description,
            createdBy: req.admin._id,
        });

        res.status(201).json({ success: true, message: "Exam created successfully", exam });
    } catch (error) {
        if (error.code === 11000)
            return res.status(400).json({
                success: false,
                message: "An exam with this name already exists",
            });
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CREATE BULK EXAM (all classes at once) ───────────────────────────────────
export const createBulkExam = async (req, res) => {
    try {
        let {
            examName,
            examType,
            allClassNames,      // array of all class names in the school
            subjectSelectionMode,
            subjects,
            startDate,
            endDate,
            isFinalExam,
            description,
        } = req.body;

        if (!examName || !allClassNames || allClassNames.length === 0)
            return res.status(400).json({
                success: false,
                message: "examName and allClassNames are required",
            });

        const activeYear = await AcademicYear.findOne({ isActive: true });
        if (!activeYear) {
            return res.status(400).json({
                success: false,
                message: "No active academic year found. Please set an active academic year first.",
            });
        }
        const academicYear = activeYear.yearName;

        // Check duplicate for the active academic year
        const existing = await Exam.findOne({ examName: examName.trim(), academicYear });
        if (existing)
            return res.status(400).json({
                success: false,
                message: `Exam "${examName}" already exists for academic year ${academicYear}`,
            });

        const classConfigs = await buildClassConfigs(
            allClassNames,
            subjectSelectionMode || "allSubjects",
            subjects
        );

        const exam = await Exam.create({
            examName: examName.trim(),
            academicYear,
            examType: examType || "regular",
            classSelectionMode: "allClasses",
            applicableClasses: allClassNames,
            classExamConfigs: classConfigs,
            startDate,
            endDate,
            isFinalExam: isFinalExam || false,
            status: "draft",
            description,
            createdBy: req.admin._id,
        });

        res.status(201).json({
            success: true,
            message: `Bulk exam created for ${allClassNames.length} classes`,
            exam,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET ALL EXAMS ────────────────────────────────────────────────────────────
export const getExams = async (req, res) => {
    try {
        const { className, examType, status, isFinalExam, academicYear } = req.query;
        const filter = {};

        if (academicYear) {
            filter.academicYear = academicYear;
        } else {
            const activeYearDoc = await AcademicYear.findOne({ isActive: true });
            if (activeYearDoc) filter.academicYear = activeYearDoc.yearName;
        }
        if (examType)     filter.examType = examType;
        if (status)       filter.status = status;
        if (isFinalExam !== undefined) filter.isFinalExam = isFinalExam === "true";
        if (className)    filter.applicableClasses = className; // matches if className is in array

        const exams = await Exam.find(filter)
            .sort({ createdAt: -1 })
            .select("-classExamConfigs.selectedStudents"); // keep response lean

        res.json({ success: true, count: exams.length, exams });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET EXAM BY ID ───────────────────────────────────────────────────────────
export const getExamById = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate("createdBy", "name email");
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });
        res.json({ success: true, exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── UPDATE EXAM ──────────────────────────────────────────────────────────────
export const updateExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });

        // Locked exams cannot be edited
        if (exam.status === "locked")
            return res.status(403).json({
                success: false,
                message: "Locked exams cannot be edited. Unlock first.",
            });

        // Completed exams cannot be edited unless unlocked
        if (exam.status === "completed")
            return res.status(403).json({
                success: false,
                message: "Completed exams cannot be edited. Unlock first.",
            });

        const allowedFields = [
            "examName", "examType", "classSelectionMode", "applicableClasses",
            "classExamConfigs", "startDate", "endDate", "isFinalExam",
            "description", "subjectSelectionMode", "marksEntryLastDate", "resultPublishDate",
            "status",
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) exam[field] = req.body[field];
        });

        await exam.save();
        res.json({ success: true, message: "Exam updated successfully", exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE EXAM ──────────────────────────────────────────────────────────────
export const deleteExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });

        if (exam.status === "locked")
            return res.status(403).json({
                success: false,
                message: "Locked exams cannot be deleted",
            });

        await exam.deleteOne();
        res.json({ success: true, message: "Exam deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
export const updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ["draft", "active", "completed", "locked"];

        if (!validStatuses.includes(status))
            return res.status(400).json({ success: false, message: "Invalid status" });

        const exam = await Exam.findById(req.params.id);
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });

        exam.status = status;
        await exam.save();

        res.json({ success: true, message: `Exam status updated to "${status}"`, exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── LOCK EXAM ────────────────────────────────────────────────────────────────
export const lockExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });

        exam.status = "locked";
        await exam.save();
        res.json({ success: true, message: "Exam locked successfully", exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── UNLOCK EXAM ──────────────────────────────────────────────────────────────
export const unlockExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });

        exam.status = "active";
        await exam.save();
        res.json({ success: true, message: "Exam unlocked successfully", exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const publishResult = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam)
            return res.status(404).json({ success: false, message: "Exam not found" });

        exam.isResultPublished = true;
        exam.resultPublishedAt = new Date();
        if (!exam.resultPublishDate) exam.resultPublishDate = exam.resultPublishedAt;
        exam.status = "completed";
        await exam.save();

        res.json({ success: true, message: "Result published successfully", exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
