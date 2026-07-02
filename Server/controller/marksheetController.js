import Marksheet from "../model/MarksheetModel.js";
import Student from "../model/StudentModel.js";
import Exam from "../model/examModel.js";
import AcademicYear from "../model/AcademicYearModel.js";

/**
 * Attaches academic year fields (className, rollNo) to a student object inside a marksheet
 * by looking into the student's embedded history.
 */
const attachStudentYearData = async (marksheet) => {
  if (!marksheet.student || !marksheet.student._id) return marksheet;

  const student = await Student.findById(marksheet.student._id);
  if (!student) return marksheet;

  const year = await AcademicYear.findOne({ yearName: marksheet.academicYear });
  if (!year) return marksheet;

  // Find the matching record in the student's internal history
  const record = student.academicRecords?.find(r => 
    String(r.academicYear) === String(year._id)
  );

  if (record) {
    const studentObj = marksheet.student.toObject ? marksheet.student.toObject() : { ...marksheet.student };
    studentObj.className = record.className;
    studentObj.section = record.section;
    studentObj.rollNo = record.rollNo;
    marksheet.student = studentObj;
  }
  return marksheet;
};

// CREATE/ENTER MARKS
export const createMarksheet = async (req, res) => {
  try {
    const { studentId, examId, marks } = req.body;

    if (!studentId || !examId || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student ID, Exam ID, and marks are required"
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    const existing = await Marksheet.findOne({ student: studentId, exam: examId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Marksheet already exists for this student and exam"
      });
    }

    const marksheet = new Marksheet({
      student: studentId,
      exam: examId,
      academicYear: exam.academicYear,
      marks
    });

    marksheet.calculateGrade();
    await marksheet.save();

    await marksheet.populate("student", "name symbolNo");
    await marksheet.populate("exam", "examName className year academicYear classExamConfigs");

    const enriched = await attachStudentYearData(marksheet);

    res.status(201).json({
      success: true,
      message: "Marksheet created successfully",
      marksheet: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL MARKSHEETS
export const getMarksheets = async (req, res) => {
  try {
    const { className, examId, exam, academicYear } = req.query;
    const includeUnpublished = req.query.includeUnpublished === 'true';
    let filter = {};

    // If specific exam provided, ensure we respect it
    if (examId || exam) filter.exam = examId || exam;
    if (academicYear) filter.academicYear = academicYear;

    // If an exam filter is present, verify that exam's results are published (unless explicitly allowed)
    if (filter.exam) {
      const targetExam = await Exam.findById(filter.exam).select('isResultPublished');
      if (!includeUnpublished && (!targetExam || !targetExam.isResultPublished)) {
        return res.json({ success: true, count: 0, marksheets: [] });
      }
    } else {
      // When no specific exam is requested, only include marksheets for published exams
      const publishedExams = await Exam.find({ isResultPublished: true }).select('_id');
      const pubIds = publishedExams.map((e) => e._id);
      // If no published exams exist, return empty (unless including unpublished)
      if (!includeUnpublished) {
        if (pubIds.length === 0) return res.json({ success: true, count: 0, marksheets: [] });
        filter.exam = { $in: pubIds };
      }
    }

    let marksheets = await Marksheet.find(filter)
      .populate("student", "name symbolNo")
      .populate("exam", "examName className year academicYear classExamConfigs isResultPublished")
      .sort({ createdAt: -1 });

    // Enrich marksheets with student year data
    marksheets = await Promise.all(marksheets.map(m => attachStudentYearData(m)));

    if (className) {
      marksheets = marksheets.filter(
        (marksheet) => marksheet.student?.className === className || marksheet.exam?.className === className
      );
    }

    // Ensure final sanitization: only return marksheets whose populated exam is published (unless allowed)
    if (!includeUnpublished) {
      marksheets = marksheets.filter((m) => m.exam && m.exam.isResultPublished);
    }

    res.json({ success: true, count: marksheets.length, marksheets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEET BY ID
export const getMarksheetById = async (req, res) => {
  try {
    const includeUnpublished = req.query.includeUnpublished === 'true';
    const marksheet = await Marksheet.findById(req.params.id)
      .populate("student")
      .populate("exam");

    if (!marksheet) return res.status(404).json({ success: false, message: "Marksheet not found" });

    // Do not expose marksheet if exam results are not published
    if (!includeUnpublished && !marksheet.exam?.isResultPublished) {
      return res.status(404).json({ success: false, message: "Marksheet not found" });
    }

    const enriched = await attachStudentYearData(marksheet);
    res.json({ success: true, marksheet: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEETS BY STUDENT
export const getMarksheetsByStudent = async (req, res) => {
  try {
    const includeUnpublished = req.query.includeUnpublished === 'true';
    let marksheets = await Marksheet.find({ student: req.params.studentId })
      .populate("student")
      .populate("exam")
      .sort({ createdAt: -1 });

    // Filter out marksheets whose exams are not published
    if (!includeUnpublished) marksheets = marksheets.filter((m) => m.exam && m.exam.isResultPublished);

    // Enrich with year data
    marksheets = await Promise.all(marksheets.map(m => attachStudentYearData(m)));

    res.json({ success: true, count: marksheets.length, marksheets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEETS BY EXAM
export const getMarksheetsByExam = async (req, res) => {
  try {
    const includeUnpublished = req.query.includeUnpublished === 'true';
    // Ensure the exam's results are published
    const exam = await Exam.findById(req.params.examId).select('isResultPublished');
    if (!includeUnpublished && (!exam || !exam.isResultPublished)) {
      return res.json({ success: true, count: 0, marksheets: [] });
    }

    let marksheets = await Marksheet.find({ exam: req.params.examId })
      .populate("student", "name symbolNo")
      .populate("exam")
      .sort({ createdAt: 1 });

    // Enrich with year data
    marksheets = await Promise.all(marksheets.map(m => attachStudentYearData(m)));

    // Sort by roll number if available
    marksheets.sort((a, b) => (a.student?.rollNo || 0) - (b.student?.rollNo || 0));

    res.json({ success: true, count: marksheets.length, marksheets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEET BY STUDENT + EXAM
export const getMarksheetByStudentExam = async (req, res) => {
  try {
    const includeUnpublished = req.query.includeUnpublished === 'true';
    const marksheet = await Marksheet.findOne({
      student: req.params.studentId,
      exam: req.params.examId
    })
      .populate("student")
      .populate("exam");

    if (!marksheet) {
      return res.status(404).json({ success: false, message: "Marksheet not found for this student and exam" });
    }

    // Hide marksheet if the exam's results are not published (unless allowed)
    if (!includeUnpublished && !marksheet.exam?.isResultPublished) {
      return res.status(404).json({ success: false, message: "Marksheet not found for this student and exam" });
    }

    const enriched = await attachStudentYearData(marksheet);
    res.json({ success: true, marksheet: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE MARKSHEET (Update marks)
export const updateMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: "Marksheet not found" });
    }

    const { marks } = req.body;
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Marks array is required"
      });
    }

    marksheet.marks = marks;
    marksheet.calculateGrade();

    await marksheet.save();
    await marksheet.populate("student", "name symbolNo");
    await marksheet.populate("exam", "examName className year academicYear classExamConfigs");

    const enriched = await attachStudentYearData(marksheet);

    res.json({
      success: true,
      message: "Marksheet updated successfully",
      marksheet: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE MARKSHEET
export const deleteMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findByIdAndDelete(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ success: false, message: "Marksheet not found" });
    }

    res.json({
      success: true,
      message: "Marksheet deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};