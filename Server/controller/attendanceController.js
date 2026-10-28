import Attendance from "../model/AttendanceModel.js";
import AttendanceSummary from "../model/AttendanceSummaryModel.js";
import Exam from "../model/examModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";
import mongoose from "mongoose";
import xlsx from "xlsx";
import {
  getInclusiveDateRangeDays,
  normalizeAttendanceName,
  normalizeAttendanceRoll,
  parseAttendanceWorkbook,
  resolveAttendanceWorkingDays,
} from "../utils/attendanceImport.js";

const isValidSchoolDate = (value) => {
  return getInclusiveDateRangeDays(value, value) === 1;
};

const getExamForClass = async (examId, className) => {
  if (!mongoose.Types.ObjectId.isValid(examId)) return null;
  const exam = await Exam.findById(examId);
  if (!exam) return null;
  const appliesToClass = exam.classExamConfigs?.some((config) => config.className === className)
    || exam.applicableClasses?.includes(className)
    || exam.classSelectionMode === "allClasses";
  return appliesToClass ? exam : null;
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const { examId, className, section = "", fromDate, toDate } = req.query;
    if (!examId || !className || !isValidSchoolDate(fromDate) || !isValidSchoolDate(toDate) || fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "Exam, class, and valid start/end dates are required.",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ success: false, message: "The selected exam is invalid." });
    }

    const summary = await AttendanceSummary.findOne({
      exam: examId,
      className,
      section,
      fromDate,
      toDate,
    }).populate("records.person", "name studentCode emisCode symbolNo");

    return res.json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadAttendanceTemplate = async (req, res) => {
  try {
    const { examId, className, section = "" } = req.query;
    if (!examId || !className) {
      return res.status(400).json({ success: false, message: "Exam and class are required to create the template." });
    }
    const exam = await getExamForClass(examId, className);
    if (!exam) {
      return res.status(400).json({ success: false, message: "The selected exam does not apply to this class." });
    }
    const enrollments = await StudentEnrollment.find({
      academicYear: exam.academicYear,
      className,
      ...(section ? { section } : {}),
    }).populate("student", "name");
    const ordered = enrollments
      .filter((enrollment) => enrollment.student)
      .sort((first, second) =>
        (Number(first.rollNo) || Number.MAX_SAFE_INTEGER) - (Number(second.rollNo) || Number.MAX_SAFE_INTEGER)
        || String(first.student.name || "").localeCompare(String(second.student.name || ""))
      );
    if (!ordered.length) {
      return res.status(404).json({ success: false, message: "No students found for this class and section." });
    }

    const sheet = xlsx.utils.aoa_to_sheet([
      ["R.N.", "Name", "Att."],
      ...ordered.map((enrollment) => [enrollment.rollNo ?? "", enrollment.student.name || "", ""]),
    ]);
    sheet["!cols"] = [{ wch: 12 }, { wch: 32 }, { wch: 12 }];
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, "Attendance");
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `attendance-${className}-${section || "all-sections"}.xlsx`.replace(/[^a-z0-9._-]/gi, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const importAttendanceFromExcel = async (req, res) => {
  try {
    const { examId, className, section = "", fromDate, toDate, workingDays } = req.body;
    const dateRangeDays = getInclusiveDateRangeDays(fromDate, toDate);
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an Excel file." });
    }
    if (!examId || !className || !dateRangeDays) {
      return res.status(400).json({ success: false, message: "Select an exam, class, and valid date range." });
    }
    const parsedRows = parseAttendanceWorkbook(req.file.buffer);
    const rowWorkingDays = parsedRows.map((row) => row.reportedWorkingDays);
    const reportedDays = rowWorkingDays.filter((days) => days !== null);
    const totalWorkingDays = resolveAttendanceWorkingDays(parsedRows, workingDays);
    if (totalWorkingDays === null) {
      return res.status(400).json({
        success: false,
        message: "Working days could not be inferred. Add Att. values like 92/92 to every row or enter working days manually.",
      });
    }
    if (!Number.isInteger(totalWorkingDays) || totalWorkingDays < 1 || totalWorkingDays > dateRangeDays) {
      return res.status(400).json({
        success: false,
        message: `Working days must be between 1 and ${dateRangeDays} days in the selected date range.`,
      });
    }
    if (reportedDays.some((days) => days !== totalWorkingDays)) {
      return res.status(400).json({
        success: false,
        message: `Every Att. denominator must match the selected working days (${totalWorkingDays}).`,
      });
    }
    const exam = await getExamForClass(examId, className);
    if (!exam) {
      return res.status(400).json({ success: false, message: "The selected exam does not apply to this class." });
    }

    const enrollments = await StudentEnrollment.find({
      academicYear: exam.academicYear,
      className,
      ...(section ? { section } : {}),
    }).populate("student", "name");
    const studentsByRoll = new Map();
    enrollments
      .filter((enrollment) => enrollment.student && enrollment.rollNo !== null && enrollment.rollNo !== undefined)
      .forEach((enrollment) => {
        const key = normalizeAttendanceRoll(enrollment.rollNo);
        studentsByRoll.set(key, [...(studentsByRoll.get(key) || []), enrollment]);
      });
    const seenStudentIds = new Set();
    const records = [];
    const errors = parsedRows.flatMap((row) => row.errors);

    for (const row of parsedRows) {
      if (row.errors.length) continue;
      const matches = (studentsByRoll.get(row.rollNo) || [])
        .filter((candidate) => normalizeAttendanceName(candidate.student.name) === row.name);
      if (!matches.length) {
        errors.push(`Row ${row.rowNumber}: R.N. ${row.rollNo} and name do not match a student in the selected class.`);
        continue;
      }
      if (matches.length > 1) {
        errors.push(`Row ${row.rowNumber}: R.N. ${row.rollNo} and name match multiple students; select a section to identify the student.`);
        continue;
      }
      const [enrollment] = matches;
      const studentId = String(enrollment.student._id);
      if (seenStudentIds.has(studentId)) {
        errors.push(`Row ${row.rowNumber}: duplicate student entry for R.N. ${row.rollNo}.`);
        continue;
      }
      if (row.presentDays > totalWorkingDays) {
        errors.push(`Row ${row.rowNumber}: Att. cannot exceed ${totalWorkingDays} working days.`);
        continue;
      }
      if (row.reportedWorkingDays !== null && row.reportedWorkingDays !== totalWorkingDays) {
        errors.push(`Row ${row.rowNumber}: Att. says ${row.presentDays}/${row.reportedWorkingDays}, but the selected working days are ${totalWorkingDays}.`);
        continue;
      }
      seenStudentIds.add(studentId);
      records.push({
        person: studentId,
        presentDays: row.presentDays,
        absentDays: totalWorkingDays - row.presentDays,
        remarks: "",
      });
    }

    const roster = enrollments.filter((enrollment) => enrollment.student);
    if (records.length !== roster.length) {
      errors.push(`The spreadsheet must contain every student in the selected roster (${roster.length} students); ${records.length} valid rows matched.`);
    }
    if (errors.length) {
      return res.status(400).json({ success: false, message: "Excel import has errors.", errors });
    }
    return res.json({
      success: true,
      message: `Imported attendance for ${records.length} students. Review the entries and save.`,
      workingDays: totalWorkingDays,
      records,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const saveAttendanceSummary = async (req, res) => {
  try {
    const {
      examId,
      className,
      section = "",
      fromDate,
      toDate,
      workingDays,
      records = [],
    } = req.body;

    if (!examId || !className || !isValidSchoolDate(fromDate) || !isValidSchoolDate(toDate) || fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "Exam, class, and a valid date range are required.",
      });
    }
    const dateRangeDays = getInclusiveDateRangeDays(fromDate, toDate);
    if (!dateRangeDays || !Number.isInteger(Number(workingDays)) || Number(workingDays) < 1 || Number(workingDays) > dateRangeDays) {
      return res.status(400).json({
        success: false,
        message: `Working days must be between 1 and ${dateRangeDays || "the selected date range"} days.`,
      });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "Import the class roster before saving attendance." });
    }

    const exam = await getExamForClass(examId, className);
    if (!exam) {
      return res.status(400).json({ success: false, message: "The selected exam does not apply to this class." });
    }

    const enrollments = await StudentEnrollment.find({
      academicYear: exam.academicYear,
      className,
      ...(section ? { section } : {}),
    }).select("student");
    const enrolledIds = new Set(enrollments.map((enrollment) => String(enrollment.student)));
    const seenIds = new Set();
    const normalizedRecords = [];

    for (const record of records) {
      const personId = String(record?.person || "");
      const presentDays = Number(record.presentDays);
      const absentDays = Number(record.absentDays);
      if (!mongoose.Types.ObjectId.isValid(personId) || !enrolledIds.has(personId)) {
        return res.status(400).json({ success: false, message: "Attendance includes a student outside the selected class roster." });
      }
      if (seenIds.has(personId)) {
        return res.status(400).json({ success: false, message: "A student appears more than once in the attendance list." });
      }
      if (!Number.isInteger(presentDays) || !Number.isInteger(absentDays)
        || presentDays < 0 || absentDays < 0 || presentDays + absentDays !== Number(workingDays)) {
        return res.status(400).json({
          success: false,
          message: `Each student's present and absent days must add up to ${workingDays}.`,
        });
      }
      seenIds.add(personId);
      normalizedRecords.push({
        person: personId,
        presentDays,
        absentDays,
        remarks: String(record.remarks || "").trim(),
      });
    }
    if (seenIds.size !== enrolledIds.size) {
      return res.status(400).json({
        success: false,
        message: "Attendance must include every student in the selected class roster.",
      });
    }

    const filter = { exam: exam._id, className, section, fromDate, toDate };
    const summary = await AttendanceSummary.findOneAndUpdate(
      filter,
      { ...filter, workingDays: Number(workingDays), records: normalizedRecords },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("records.person", "name studentCode emisCode symbolNo");

    return res.json({
      success: true,
      message: "Attendance summary saved successfully.",
      summary,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "This attendance summary was changed elsewhere. Reload and try again." });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveAttendance = async (req, res) => {
  try {
    const { date, type = "student", className = "", section = "", records = [] } = req.body;
    if (!date || !Array.isArray(records)) return res.status(400).json({ success: false, message: "Date and records are required" });

    const attendance = await Attendance.findOneAndUpdate(
      { date: new Date(date), type, className, section },
      { date: new Date(date), type, className, section, records },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.className) filter.className = req.query.className;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.date) filter.date = new Date(req.query.date);

    const attendance = await Attendance.find(filter).sort({ date: -1 }).populate("records.person");
    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ success: false, message: "Attendance not found" });
    res.json({ success: true, message: "Attendance deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
