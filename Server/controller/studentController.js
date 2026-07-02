import Student from "../model/StudentModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";
import AcademicYear from "../model/AcademicYearModel.js";
import fs from "fs";
import xlsx from "xlsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateStudentCode = async () => {
  let code;
  let exists = true;
  while (exists) {
    code = `STU${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    exists = await Student.exists({ studentCode: code });
  }
  return code;
};

const ensureStudentCode = async (student) => {
  if (!student.studentCode?.trim()) {
    student.studentCode = await generateStudentCode();
    await student.save();
  }
  return student;
};

const optionalValue = (value) => {
  if (typeof value !== "string") return value;
  return value.trim() || undefined;
};

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
};

const normalizeGender = (value) => {
  const g = cleanText(value).toLowerCase();
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  if (g === "other") return "Other";
  return cleanText(value) || undefined;
};

const excelDateToValue = (value) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const p = xlsx.SSF.parse_date_code(value);
    return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)) : undefined;
  }
  return cleanText(value) || undefined;
};

const templateHeaders = [
  "name", "className", "section", "rollNo", "symbolNo",
  "dob", "gender", "fatherName", "motherName", "address", "phone", "academicYear",
];

const isEmptyRow = (row) => templateHeaders.every((h) => cleanText(row[h]) === "");

/**
 * Merge enrollment fields onto a plain student object so the API response
 * stays backwards-compatible with the existing frontend (className, section,
 * rollNo, academicYear at the top level of the student object).
 */
const mergeEnrollment = (student, enrollment) => {
  const obj = student.toObject ? student.toObject() : { ...student };
  if (enrollment) {
    obj.className        = enrollment.className;
    obj.section          = enrollment.section;
    obj.rollNo           = enrollment.rollNo;
    obj.academicYear     = enrollment.academicYear;
    obj.enrollmentId     = enrollment._id;
    obj.enrollmentStatus = enrollment.status;
  }
  return obj;
};

// ─── CREATE STUDENT ───────────────────────────────────────────────────────────

export const createStudent = async (req, res) => {
  try {
    const {
      name, className, section, rollNo,
      emisCode, symbolNo, dob, gender,
      fatherName, motherName, guardianName,
      mobileNumber, address,
    } = req.body;

    if (!name || !className || !section) {
      return res.status(400).json({
        success: false,
        message: "Name, class, and section are required",
      });
    }

    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return res.status(400).json({
        success: false,
        message: "No active academic year found. Please set one first.",
      });
    }

    // Check roll number uniqueness via enrollment table
    if (rollNo != null && rollNo !== "") {
      const conflict = await StudentEnrollment.exists({
        academicYear: activeYear.yearName,
        className,
        section,
        rollNo: Number(rollNo),
      });
      if (conflict) {
        return res.status(400).json({
          success: false,
          message: "A student with this roll number already exists in this class/section for the active year",
        });
      }
    }

    const studentCode = await generateStudentCode();

    // Create the core student record (personal info only)
    const student = await Student.create({
      name,
      emisCode:     optionalValue(emisCode),
      studentCode,
      symbolNo:     optionalValue(symbolNo),
      dob,
      gender,
      fatherName,
      motherName,
      guardianName,
      mobileNumber,
      phone:        mobileNumber,
      address,
      // Keep denormalised copy on Student for backward-compat with marksheets/attendance
      className,
      section,
      academicYear: activeYear.yearName,
      status:       "active",
    });

    // Create the enrollment record for the active year
    const enrollment = await StudentEnrollment.create({
      student:      student._id,
      academicYear: activeYear.yearName,
      className,
      section,
      rollNo:       rollNo != null && rollNo !== "" ? Number(rollNo) : null,
      status:       "active",
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: mergeEnrollment(student, enrollment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL STUDENTS ─────────────────────────────────────────────────────────

export const getStudents = async (req, res) => {
  try {
    const { className, section, academicYear } = req.query;

    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return res.status(400).json({ success: false, message: "No active academic year found" });
    }

    const targetYear = academicYear || activeYear.yearName;

    // Build enrollment filter
    const filter = { academicYear: targetYear };
    if (className) filter.className = className;
    if (section) filter.section = section;

    // Fetch enrollments and populate student personal data
    const enrollments = await StudentEnrollment.find(filter)
      .populate("student")
      .sort({ className: 1, section: 1, rollNo: 1 });

    // Ensure every student has a code and merge enrollment data
    const students = await Promise.all(
      enrollments
        .filter((e) => e.student) // skip orphaned enrollments
        .map(async (e) => {
          await ensureStudentCode(e.student);
          return mergeEnrollment(e.student, e);
        })
    );

    res.json({
      success: true,
      count: students.length,
      students,
      activeAcademicYear:   activeYear.yearName,
      selectedAcademicYear: targetYear,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET STUDENT BY ID ────────────────────────────────────────────────────────

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    await ensureStudentCode(student);

    // Attach the most recent enrollment for edit form prefilling
    const latestEnrollment = await StudentEnrollment.findOne({ student: student._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      student: mergeEnrollment(student, latestEnrollment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE STUDENT ───────────────────────────────────────────────────────────

export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const updates = { ...req.body };
    delete updates.studentCode;
    updates.emisCode = optionalValue(updates.emisCode);
    updates.symbolNo = optionalValue(updates.symbolNo);

    // Separate enrollment fields from personal info
    const { className, section, rollNo, academicYear, ...personalUpdates } = updates;

    Object.assign(student, personalUpdates);
    if (!student.studentCode?.trim()) {
      student.studentCode = await generateStudentCode();
    }
    await student.save();

    // Update the enrollment for the active year if academic fields changed
    if (className !== undefined || section !== undefined || rollNo !== undefined) {
      const activeYear = await AcademicYear.findOne({ isActive: true });
      const targetYearName = academicYear || (activeYear ? activeYear.yearName : student.academicYear);

      const enrollment = await StudentEnrollment.findOne({
        student: student._id,
        academicYear: targetYearName,
      });

      if (enrollment) {
        if (rollNo !== undefined && rollNo !== "" && Number(rollNo) !== enrollment.rollNo) {
          const conflict = await StudentEnrollment.exists({
            _id:         { $ne: enrollment._id },
            academicYear: targetYearName,
            className:   className || enrollment.className,
            section:     section   || enrollment.section,
            rollNo:      Number(rollNo),
          });
          if (conflict) {
            return res.status(400).json({
              success: false,
              message: "Another student already has this roll number in this class/section",
            });
          }
        }
        if (className !== undefined) enrollment.className = className;
        if (section !== undefined)   enrollment.section   = section;
        if (rollNo  !== undefined)   enrollment.rollNo    = rollNo !== "" ? Number(rollNo) : null;
        await enrollment.save();

        // Keep Student doc in sync for backward-compat
        if (className !== undefined) student.className    = className;
        if (section   !== undefined) student.section      = section;
        if (academicYear)            student.academicYear = academicYear;
        await student.save();
      }
    }

    const latestEnrollment = await StudentEnrollment.findOne({ student: student._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: "Student updated successfully",
      student: mergeEnrollment(student, latestEnrollment),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE STUDENT ───────────────────────────────────────────────────────────

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    // Remove all enrollment records too
    await StudentEnrollment.deleteMany({ student: req.params.id });

    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── EXCEL IMPORT ─────────────────────────────────────────────────────────────

export const importStudentsFromExcel = async (req, res) => {
  const errors = [];
  const insertedStudents = [];

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an Excel file" });
    }

    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: "", raw: false });
    const nonEmptyRows = rows.filter((row) => !isEmptyRow(row));
    const seenRollKeys   = new Set();
    const seenSymbolNos  = new Set();

    for (const [index, row] of nonEmptyRows.entries()) {
      const rowNumber  = index + 2;
      const name       = cleanText(row.name);
      const className  = cleanText(row.className);
      const section    = cleanText(row.section);
      const rollNoText = cleanText(row.rollNo);
      const symbolNo   = cleanText(row.symbolNo);
      const academicYear = cleanText(row.academicYear);
      const rollNo     = Number(rollNoText);

      if (!name)       { errors.push({ row: rowNumber, message: "Missing student name" });  continue; }
      if (!className)  { errors.push({ row: rowNumber, message: "Missing className" });      continue; }
      if (!section)    { errors.push({ row: rowNumber, message: "Missing section" });        continue; }
      if (!rollNoText) { errors.push({ row: rowNumber, message: "Missing rollNo" });         continue; }
      if (!Number.isFinite(rollNo)) {
        errors.push({ row: rowNumber, message: "rollNo must be a valid number" }); continue;
      }
      if (!academicYear) { errors.push({ row: rowNumber, message: "Missing academicYear" }); continue; }

      const yearExists = await AcademicYear.exists({ yearName: academicYear });
      if (!yearExists) {
        errors.push({ row: rowNumber, message: `Academic year "${academicYear}" does not exist` });
        continue;
      }

      const rollKey = `${academicYear}|${className}|${section}|${rollNo}`;
      if (seenRollKeys.has(rollKey)) {
        errors.push({ row: rowNumber, message: "Duplicate roll number in uploaded file" }); continue;
      }
      const dupRoll = await StudentEnrollment.exists({ academicYear, className, section, rollNo });
      if (dupRoll) {
        errors.push({ row: rowNumber, message: "Roll number already exists for this class/section/year" }); continue;
      }

      if (symbolNo) {
        if (seenSymbolNos.has(symbolNo)) {
          errors.push({ row: rowNumber, message: "Duplicate symbolNo in file" }); continue;
        }
        if (await Student.exists({ symbolNo })) {
          errors.push({ row: rowNumber, message: "symbolNo already exists in database" }); continue;
        }
      }

      const student = await Student.create({
        name,
        symbolNo:     optionalValue(symbolNo),
        dob:          excelDateToValue(row.dob),
        gender:       normalizeGender(row.gender),
        fatherName:   cleanText(row.fatherName),
        motherName:   cleanText(row.motherName),
        address:      cleanText(row.address),
        phone:        cleanText(row.phone),
        mobileNumber: cleanText(row.phone),
        className,
        section,
        rollNo,
        academicYear,
        studentCode: await generateStudentCode(),
        status: "active",
      });

      await StudentEnrollment.create({
        student:      student._id,
        academicYear,
        className,
        section,
        rollNo,
        status: "active",
      });

      seenRollKeys.add(rollKey);
      if (symbolNo) seenSymbolNos.add(symbolNo);
      insertedStudents.push(student);
    }

    res.status(200).json({
      success: true,
      totalRows:      nonEmptyRows.length,
      insertedCount:  insertedStudents.length,
      skippedCount:   errors.length,
      insertedStudents,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// ─── DOWNLOAD IMPORT TEMPLATE ─────────────────────────────────────────────────

export const downloadStudentImportTemplate = (req, res) => {
  const sampleRows = [
    ["Ram Bahadur", "Class 8", "A", 1, "SYM001", "2068-05-12", "Male", "Father Name", "Mother Name", "Devchuli-14", "9800000000", "2082"],
    ["Sita Kumari",  "Class 8", "A", 2, "SYM002", "2068-08-20", "Female", "Father Name", "Mother Name", "Devchuli-14", "9811111111", "2082"],
  ];
  const worksheet = xlsx.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=student_import_template.xlsx");
  res.send(buffer);
};

// ─── ENROLLMENT HISTORY ───────────────────────────────────────────────────────

export const getStudentEnrollmentHistory = async (req, res) => {
  try {
    const enrollments = await StudentEnrollment.find({ student: req.params.id })
      .sort({ academicYear: 1 });
    res.json({ success: true, enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
