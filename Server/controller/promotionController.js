import Student from "../model/StudentModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";
import Exam from "../model/examModel.js";
import Marksheet from "../model/MarksheetModel.js";
import PromotionHistory from "../model/PromotionHistoryModel.js";
import ClassModel from "../model/ClassModel.js";
import AcademicYear from "../model/AcademicYearModel.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getNextClassByRank = async (currentClassName) => {
  const classes = await ClassModel.find({
    $or: [{ isActive: true }, { isActive: { $exists: false } }],
  }).sort({ order: 1, className: 1 });
  const idx = classes.findIndex((c) => c.className === currentClassName);
  if (idx === -1 || idx >= classes.length - 1) return null;
  return classes[idx + 1].className;
};

const getAvailableRollNo = async (className, academicYear, preferredRollNo) => {
  if (preferredRollNo != null && preferredRollNo !== "") {
    const taken = await StudentEnrollment.exists({ className, academicYear, rollNo: Number(preferredRollNo) });
    if (!taken) return Number(preferredRollNo);
  }
  const last = await StudentEnrollment.findOne(
    { className, academicYear, rollNo: { $ne: null } }
  ).sort({ rollNo: -1 });
  return Number(last?.rollNo || 0) + 1;
};

// ─── SINGLE STUDENT PROMOTE ───────────────────────────────────────────────────

export const promoteStudent = async (req, res) => {
  try {
    const { studentId, toAcademicYear, toClass, newRollNo, newSection, remarks } = req.body;

    if (!studentId || !toAcademicYear || !toClass) {
      return res.status(400).json({
        success: false,
        message: "studentId, toAcademicYear, and toClass are required",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Get current enrollment
    const currentEnrollment = await StudentEnrollment.findOne({ student: studentId })
      .sort({ createdAt: -1 });

    const fromClass       = currentEnrollment?.className    || student.className;
    const fromSection     = currentEnrollment?.section      || student.section;
    const fromAcademicYear = currentEnrollment?.academicYear || student.academicYear;

    // Check pass/fail using final exam result
    const finalExam = await Exam.findOne({
      applicableClasses: fromClass,
      isFinalExam: true,
      isResultPublished: true,
    }).sort({ createdAt: -1 });

    let resultStatus = "promoted";
    if (finalExam) {
      const marksheet = await Marksheet.findOne({ student: studentId, exam: finalExam._id });
      if (marksheet?.result === "Fail") resultStatus = "retained";
    }

    const targetClass = resultStatus === "promoted" ? toClass : fromClass;

    // Prevent duplicate promotion to the same academic year
    const alreadyExists = await StudentEnrollment.exists({
      student: studentId,
      academicYear: toAcademicYear,
    });
    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: `Student already has a record for academic year ${toAcademicYear}`,
      });
    }

    // Mark current enrollment as promoted/retained
    if (currentEnrollment) {
      currentEnrollment.status = resultStatus;
      currentEnrollment.promotedToAcademicYear = toAcademicYear;
      currentEnrollment.promotedToClass = targetClass;
      await currentEnrollment.save();
    }

    // Create new enrollment for the target year
    await StudentEnrollment.create({
      student:      studentId,
      academicYear: toAcademicYear,
      className:    targetClass,
      section:      newSection || fromSection,
      rollNo:       newRollNo  ? Number(newRollNo) : null,
      status:       "active",
    });

    // Record history
    const history = await PromotionHistory.create({
      student: studentId,
      fromAcademicYear,
      toAcademicYear,
      fromClass,
      toClass: targetClass,
      resultStatus,
      remarks: remarks || "",
    });

    // Keep Student doc in sync for backward-compat
    student.className    = targetClass;
    student.academicYear = toAcademicYear;
    student.isPromoted   = resultStatus === "promoted";
    student.promotedTo   = targetClass;
    student.promotionDate = new Date();
    await student.save();

    res.status(201).json({ success: true, history, resultStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET PROMOTION HISTORY ────────────────────────────────────────────────────

export const getPromotionHistory = async (req, res) => {
  try {
    const history = await PromotionHistory.find({ student: req.params.studentId })
      .populate("student", "name className rollNo")
      .sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPromotionHistory = async (_req, res) => {
  try {
    const history = await PromotionHistory.find()
      .populate("student", "name className rollNo")
      .sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ELIGIBLE STUDENTS ────────────────────────────────────────────────────

export const getEligibleStudents = async (req, res) => {
  try {
    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return res.status(400).json({ success: false, message: "No active academic year found" });
    }

    // Find all published final exams for the active year
    const finalExams = await Exam.find({
      isFinalExam: true,
      isResultPublished: true,
      academicYear: activeYear.yearName,
    });

    if (finalExams.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No published final exams found. Mark a final exam and publish results first.",
      });
    }

    const eligibleStudents = [];
    const processedStudents = new Set();

    for (const exam of finalExams) {
      const marksheets = await Marksheet.find({ exam: exam._id })
        .populate("student", "name rollNo symbolNo studentCode")
        .populate("exam", "examName");

      for (const marksheet of marksheets) {
        const studentId = String(marksheet.student?._id);
        if (!marksheet.student || processedStudents.has(studentId)) continue;

        // Get the enrollment for this academic year
        const currentEnrollment = await StudentEnrollment.findOne({
          student:      marksheet.student._id,
          academicYear: activeYear.yearName,
        });
        if (!currentEnrollment) continue;

        // Skip if already promoted this year
        const alreadyPromoted = await PromotionHistory.findOne({
          student:          marksheet.student._id,
          fromAcademicYear: activeYear.yearName,
          fromClass:        currentEnrollment.className,
        });
        if (alreadyPromoted) continue;

        const currentClass = currentEnrollment.className;
        const isFail = marksheet.result === "Fail";
        const nextClass = isFail ? currentClass : await getNextClassByRank(currentClass);
        if (!nextClass) continue;

        eligibleStudents.push({
          student: {
            _id:         marksheet.student._id,
            name:        marksheet.student.name,
            rollNo:      currentEnrollment.rollNo,
            section:     currentEnrollment.section,
            symbolNo:    marksheet.student.symbolNo,
            studentCode: marksheet.student.studentCode,
            className:   currentClass,
            academicYear: activeYear.yearName,
          },
          currentClass,
          nextClass,
          exam: exam.examName,
          marksheet: {
            grade:  marksheet.grade,
            gpa:    marksheet.gpa,
            result: marksheet.result,
          },
          resultStatus: isFail ? "retained" : "promoted",
        });
        processedStudents.add(studentId);
      }
    }

    res.json({
      success: true,
      data:               eligibleStudents,
      activeAcademicYear: activeYear.yearName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── BULK PROMOTE ─────────────────────────────────────────────────────────────

export const promoteStudents = async (req, res) => {
  try {
    const { studentIds, toAcademicYear } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "studentIds array is required" });
    }
    if (!toAcademicYear) {
      return res.status(400).json({ success: false, message: "toAcademicYear is required" });
    }

    const results = { promoted: [], errors: [] };

    for (const studentId of studentIds) {
      try {
        const student = await Student.findById(studentId);
        if (!student) {
          results.errors.push(`Student ${studentId} not found`);
          continue;
        }

        // Get current enrollment
        const currentEnrollment = await StudentEnrollment.findOne({
          student:      studentId,
          academicYear: student.academicYear,
        });

        if (!currentEnrollment) {
          results.errors.push(`No enrollment record found for ${student.name}`);
          continue;
        }

        // Prevent duplicate promotion
        const alreadyPromoted = await StudentEnrollment.exists({
          student:      studentId,
          academicYear: toAcademicYear,
        });
        if (alreadyPromoted) {
          results.errors.push(`${student.name} already has a record for ${toAcademicYear}`);
          continue;
        }

        // Determine pass/fail from final exam
        const finalExam = await Exam.findOne({
          applicableClasses: currentEnrollment.className,
          isFinalExam:       true,
          isResultPublished: true,
        }).sort({ createdAt: -1 });

        let resultStatus = "promoted";
        let targetClass  = currentEnrollment.className;

        if (finalExam) {
          const failMarksheet = await Marksheet.findOne({
            student: studentId,
            exam:    finalExam._id,
            result:  "Fail",
          });
          if (failMarksheet) resultStatus = "retained";
        }

        if (resultStatus === "promoted") {
          targetClass = await getNextClassByRank(currentEnrollment.className);
          if (!targetClass) {
            results.errors.push(`Cannot promote ${student.name} — already in the highest class`);
            continue;
          }
        }

        const targetRollNo = await getAvailableRollNo(
          targetClass, toAcademicYear, currentEnrollment.rollNo
        );

        // Mark current enrollment as promoted/retained
        currentEnrollment.status = resultStatus;
        currentEnrollment.promotedToAcademicYear = toAcademicYear;
        currentEnrollment.promotedToClass = targetClass;
        await currentEnrollment.save();

        // Create new enrollment for target year
        await StudentEnrollment.create({
          student:      studentId,
          academicYear: toAcademicYear,
          className:    targetClass,
          section:      currentEnrollment.section,
          rollNo:       targetRollNo,
          status:       "active",
        });

        // Record history
        await PromotionHistory.create({
          student:          studentId,
          fromAcademicYear: currentEnrollment.academicYear,
          toAcademicYear,
          fromClass:        currentEnrollment.className,
          toClass:          targetClass,
          resultStatus,
          remarks: resultStatus === "promoted"
            ? "Promoted based on final exam results"
            : "Retained in same class for next academic year",
        });

        // Keep Student doc in sync for backward-compat
        student.className    = targetClass;
        student.academicYear = toAcademicYear;
        student.rollNo       = targetRollNo;
        student.isPromoted   = resultStatus === "promoted";
        student.promotedTo   = targetClass;
        student.promotionDate = new Date();
        await student.save();

        results.promoted.push({
          studentId,
          studentName: student.name,
          fromClass:   currentEnrollment.className,
          toClass:     targetClass,
          rollNo:      targetRollNo,
          resultStatus,
        });

      } catch (err) {
        results.errors.push(`Error processing ${studentId}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      data:    results,
      message: `Processed ${results.promoted.length} student(s) successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
