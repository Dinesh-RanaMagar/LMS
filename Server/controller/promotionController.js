import Student from "../model/StudentModel.js";
import Exam from "../model/examModel.js";
import Marksheet from "../model/MarksheetModel.js";
import PromotionHistory from "../model/PromotionHistoryModel.js";
import ClassModel from "../model/ClassModel.js";
import AcademicYear from "../model/AcademicYearModel.js";

const getNextClassByRank = async (currentClassName) => {
  const classes = await ClassModel.find({
    $or: [{ isActive: true }, { isActive: { $exists: false } }],
  }).sort({ order: 1, className: 1 });
  const currentIndex = classes.findIndex((cls) => cls.className === currentClassName);
  if (currentIndex === -1 || currentIndex >= classes.length - 1) return null;
  return classes[currentIndex + 1].className;
};

const getAvailableRollNo = async (className, academicYear, preferredRollNo) => {
  if (preferredRollNo != null && preferredRollNo !== "") {
    const duplicate = await Student.exists({ className, academicYear, rollNo: preferredRollNo });
    if (!duplicate) return preferredRollNo;
  }

  const lastStudent = await Student.findOne({ className, academicYear, rollNo: { $ne: null } }).sort({ rollNo: -1 });
  return Number(lastStudent?.rollNo || 0) + 1;
};

export const promoteStudent = async (req, res) => {
  try {
    const { studentId, toAcademicYear, toClass, newRollNo, newSection, remarks } = req.body;

    if (!studentId || !toAcademicYear || !toClass) {
      return res.status(400).json({
        success: false,
        message: "studentId, toAcademicYear and toClass are required",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const finalExam = await Exam.findOne({
      className: student.className,
      year: { $exists: true },
      examName: { $regex: /final/i },
    }).sort({ createdAt: -1 });

    let resultStatus = "promoted";
    if (finalExam) {
      const marksheet = await Marksheet.findOne({ student: studentId, exam: finalExam._id });
      if (marksheet && marksheet.result === "Fail") {
        resultStatus = "retained";
      }
    }

    const history = await PromotionHistory.create({
      student: studentId,
      fromAcademicYear: student.academicYear,
      toAcademicYear,
      fromClass: student.className,
      toClass: resultStatus === "promoted" ? toClass : student.className,
      resultStatus,
      remarks: remarks || "",
    });

    const targetClass = resultStatus === "promoted" ? toClass : student.className;

    student.className = targetClass;
    student.section = newSection || student.section;
    student.rollNo = newRollNo || student.rollNo;
    student.academicYear = toAcademicYear;
    student.isPromoted = resultStatus === "promoted";
    student.promotedTo = targetClass;
    student.promotionDate = new Date();
    await student.save();

    res.status(201).json({ success: true, history, resultStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPromotionHistory = async (req, res) => {
  try {
    const history = await PromotionHistory.find({ student: req.params.studentId })
      .populate("student", "name className rollNo")
      .sort({ promotedDate: -1 });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPromotionHistory = async (_req, res) => {
  try {
    const history = await PromotionHistory.find()
      .populate("student", "name className rollNo")
      .sort({ promotedDate: -1 });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEligibleStudents = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ isActive: true });
    const finalExams = await Exam.find({ isFinalExam: true, status: "completed", academicYear: activeYear?._id });

    if (finalExams.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No completed final exams found"
      });
    }

    const eligibleStudents = [];
    const processedStudents = new Set();

    for (const exam of finalExams) {
      // Get marksheets for this exam
      const marksheets = await Marksheet.find({ exam: exam._id })
        .populate("student", "name className rollNo section symbolNo academicYear")
        .populate("exam", "examName");

      for (const marksheet of marksheets) {
        const studentId = String(marksheet.student?._id);
        if (!marksheet.student || processedStudents.has(studentId)) continue;

        const existingPromotion = await PromotionHistory.findOne({
          student: marksheet.student._id,
          fromClass: marksheet.student.className,
          fromAcademicYear: marksheet.student.academicYear
        });

        if (existingPromotion) continue;

        const currentClass = marksheet.student.className;
        const isFail = marksheet.result === "Fail";
        const nextClass = isFail ? currentClass : await getNextClassByRank(currentClass);
        if (!nextClass) continue;

        eligibleStudents.push({
          student: marksheet.student,
          currentClass,
          nextClass,
          exam: exam.examName,
          marksheet: {
            grade: marksheet.grade,
            gpa: marksheet.gpa,
            result: marksheet.result
          },
          resultStatus: isFail ? "retained" : "promoted"
        });
        processedStudents.add(studentId);
      }
    }

    res.json({
      success: true,
      data: eligibleStudents,
      activeAcademicYear: activeYear?.yearName || ""
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const promoteStudents = async (req, res) => {
  try {
    const { studentIds, toAcademicYear } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "studentIds array is required"
      });
    }

    const results = { promoted: [], errors: [] };

    for (const studentId of studentIds) {
      try {
        const student = await Student.findById(studentId);
        if (!student) {
          results.errors.push(`Student ${studentId} not found`);
          continue;
        }

        const resultStatusFromFinal = await Marksheet.findOne({ student: studentId, result: "Fail" })
          .populate({
            path: "exam",
            match: { className: student.className, isFinalExam: true }
          });

        let resultStatus = "promoted";
        let targetClass = student.className;

        if (resultStatusFromFinal?.exam) {
          resultStatus = "retained";
        }

        if (resultStatus === "promoted") {
          targetClass = await getNextClassByRank(student.className);
          if (!targetClass) {
            results.errors.push(`Cannot promote ${student.name} - already in highest class`);
            continue;
          }
        }

        const fromClass = student.className;
        const targetAcademicYear = toAcademicYear || student.academicYear;
        const targetRollNo = await getAvailableRollNo(targetClass, targetAcademicYear, student.rollNo);

        // Create promotion history
        await PromotionHistory.create({
          student: studentId,
          fromAcademicYear: student.academicYear,
          toAcademicYear: targetAcademicYear,
          fromClass,
          toClass: targetClass,
          resultStatus,
          remarks: resultStatus === "promoted"
            ? "Promoted based on final exam results"
            : "Retained in same class for next academic year"
        });

        // Preserve section for next academic year
        student.section = student.section;

        // Update student
        student.className = targetClass;
        student.academicYear = targetAcademicYear;
        student.rollNo = targetRollNo;
        student.isPromoted = resultStatus === "promoted";
        student.promotedTo = targetClass;
        student.promotionDate = new Date();
        await student.save();

        results.promoted.push({
          studentId,
          studentName: student.name,
          fromClass,
          toClass: targetClass,
          rollNo: targetRollNo,
          resultStatus
        });

      } catch (error) {
        results.errors.push(`Error promoting student ${studentId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Successfully promoted ${results.promoted.length} students`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
