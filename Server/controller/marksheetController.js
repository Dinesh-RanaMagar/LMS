import Marksheet from "../model/MarksheetModel.js";
import Student from "../model/StudentModel.js";
import Exam from "../model/examModel.js";
import AcademicYear from "../model/AcademicYearModel.js";

// CREATE/ENTER MARKS
export const createMarksheet = async (req, res) => {
  try {
    const { studentId, examId, marks } = req.body;

    // Validation
    if (!studentId || !examId || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student ID, Exam ID, and marks are required"
      });
    }

    // Check student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    // Check if marksheet already exists
    const existing = await Marksheet.findOne({ student: studentId, exam: examId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Marksheet already exists for this student and exam"
      });
    }

    // Create marksheet
    const marksheet = new Marksheet({
      student: studentId,
      exam: examId,
      academicYear: exam.academicYear || student.academicYear,
      marks
    });

    marksheet.calculateGrade();

    await marksheet.save();
    await marksheet.populate("student", "name className rollNo symbolNo");
    await marksheet.populate("exam", "examName className year academicYear classExamConfigs");

    res.status(201).json({
      success: true,
      message: "Marksheet created successfully",
      marksheet
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL MARKSHEETS
export const getMarksheets = async (req, res) => {
  try {
    const { className, examId, exam, academicYear } = req.query;

    let filter = {};

    if (examId || exam) filter.exam = examId || exam;
    if (academicYear) filter.academicYear = academicYear;

    let marksheets = await Marksheet.find(filter)
      .populate("student", "name className rollNo symbolNo")
      .populate("exam", "examName className year academicYear classExamConfigs")
      .sort({ createdAt: -1 });

    if (className) {
      marksheets = marksheets.filter(
        (marksheet) => marksheet.student?.className === className || marksheet.exam?.className === className
      );
    }

    res.json({
      success: true,
      count: marksheets.length,
      marksheets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEET BY ID
export const getMarksheetById = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id)
      .populate("student")
      .populate("exam");

    if (!marksheet) {
      return res.status(404).json({ success: false, message: "Marksheet not found" });
    }

    res.json({ success: true, marksheet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEETS BY STUDENT
export const getMarksheetsByStudent = async (req, res) => {
  try {
    const marksheets = await Marksheet.find({ student: req.params.studentId })
      .populate("student")
      .populate("exam")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: marksheets.length,
      marksheets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEETS BY EXAM
export const getMarksheetsByExam = async (req, res) => {
  try {
    const marksheets = await Marksheet.find({ exam: req.params.examId })
      .populate("student", "name className rollNo symbolNo")
      .populate("exam")
      .sort({ "student.rollNo": 1 });

    res.json({
      success: true,
      count: marksheets.length,
      marksheets
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET MARKSHEET BY STUDENT + EXAM
export const getMarksheetByStudentExam = async (req, res) => {
  try {
    const marksheet = await Marksheet.findOne({
      student: req.params.studentId,
      exam: req.params.examId
    })
      .populate("student")
      .populate("exam");

    if (!marksheet) {
      return res.status(404).json({
        success: false,
        message: "Marksheet not found for this student and exam"
      });
    }

    res.json({ success: true, marksheet });
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
    await marksheet.populate("student", "name className rollNo symbolNo");
    await marksheet.populate("exam", "examName className year academicYear classExamConfigs");

    res.json({
      success: true,
      message: "Marksheet updated successfully",
      marksheet
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