import Student from "../model/StudentModel.js";
import AcademicYear from "../model/AcademicYearModel.js";
import fs from "fs";
import xlsx from "xlsx";

const generateStudentCode = async () => {
  let studentCode;
  let exists = true;

  while (exists) {
    studentCode = `STU${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    exists = await Student.exists({ studentCode });
  }

  return studentCode;
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
  const trimmed = value.trim();
  return trimmed || undefined;
};

const templateHeaders = [
  "name",
  "className",
  "section",
  "rollNo",
  "symbolNo",
  "dob",
  "gender",
  "fatherName",
  "motherName",
  "address",
  "phone",
  "academicYear"
];

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, " ");
};

const normalizeGender = (value) => {
  const gender = cleanText(value);
  if (!gender) return undefined;
  const lowerGender = gender.toLowerCase();
  if (lowerGender === "male") return "Male";
  if (lowerGender === "female") return "Female";
  if (lowerGender === "other") return "Other";
  return gender;
};

const excelDateToValue = (value) => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsedDate = xlsx.SSF.parse_date_code(value);
    if (!parsedDate) return undefined;
    return new Date(Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d));
  }
  return cleanText(value) || undefined;
};

const isEmptyRow = (row) => templateHeaders.every((header) => cleanText(row[header]) === "");

// CREATE STUDENT
export const createStudent = async (req, res) => {
  try {
    const { name, className, section, rollNo, emisCode, symbolNo, dob, fatherName, motherName, guardianName, mobileNumber, address } = req.body;

    // Validation
    if (!name || !className || !section) {
      return res.status(400).json({
        success: false,
        message: "Name, class, and section are required"
      });
    }

    // Get active academic year
    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return res.status(400).json({
        success: false,
        message: "No active academic year found. Please set an active academic year first."
      });
    }

    // Check for duplicate within academic year
    if (rollNo != null && rollNo !== "") {
      const existing = await Student.findOne({
        className,
        section,
        rollNo,
        academicYear: activeYear.yearName
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Student with this roll number already exists in this class and section for the active academic year"
        });
      }
    }

    // Create student
    const studentCode = await generateStudentCode();

    const student = await Student.create({
      name,
      className,
      section,
      rollNo,
      emisCode: optionalValue(emisCode),
      studentCode,
      symbolNo: optionalValue(symbolNo),
      dob,
      fatherName,
      motherName,
      guardianName,
      mobileNumber,
      phone: mobileNumber,
      address,
      academicYear: activeYear.yearName,
      status: "active"
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL STUDENTS
export const getStudents = async (req, res) => {
  try {
    const { className, section, academicYear } = req.query;

    // Get active academic year
    const activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      return res.status(400).json({
        success: false,
        message: "No active academic year found"
      });
    }

    let filter = { academicYear: academicYear || activeYear.yearName };

    if (className) filter.className = className;
    if (section) filter.section = section;

    const students = await Student.find(filter).sort({ className: 1, section: 1, rollNo: 1 });
    await Promise.all(students.map((student) => ensureStudentCode(student)));
    res.json({
      success: true,
      count: students.length,
      students,
      activeAcademicYear: activeYear.yearName,
      selectedAcademicYear: filter.academicYear
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET STUDENT BY ID
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    await ensureStudentCode(student);
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE STUDENT
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

    // Check for duplicate if class, section, or rollNo is being updated
    if ((updates.rollNo != null || updates.className != null || updates.section != null) && updates.rollNo !== "") {
      const newRollNo = updates.rollNo != null ? updates.rollNo : student.rollNo;
      const newClassName = updates.className != null ? updates.className : student.className;
      const newSection = updates.section != null ? updates.section : student.section;

      const duplicate = await Student.findOne({
        _id: { $ne: student._id },
        className: newClassName,
        section: newSection,
        rollNo: newRollNo,
        academicYear: student.academicYear
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Another student already has this class, section, and roll number in this academic year"
        });
      }
    }

    Object.assign(student, updates);
    if (!student.studentCode?.trim()) {
      student.studentCode = await generateStudentCode();
    }
    await student.save();

    res.json({
      success: true,
      message: "Student updated successfully",
      student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE STUDENT
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.json({
      success: true,
      message: "Student deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    const seenRollKeys = new Set();
    const seenSymbolNos = new Set();

    for (const [index, row] of nonEmptyRows.entries()) {
      const rowNumber = index + 2;
      const name = cleanText(row.name);
      const className = cleanText(row.className);
      const section = cleanText(row.section);
      const rollNoText = cleanText(row.rollNo);
      const symbolNo = cleanText(row.symbolNo);
      const academicYear = cleanText(row.academicYear);
      const rollNo = Number(rollNoText);

      if (!name) {
        errors.push({ row: rowNumber, message: "Missing student name" });
        continue;
      }
      if (!className) {
        errors.push({ row: rowNumber, message: "Missing className" });
        continue;
      }
      if (!section) {
        errors.push({ row: rowNumber, message: "Missing section" });
        continue;
      }
      if (!rollNoText) {
        errors.push({ row: rowNumber, message: "Missing rollNo" });
        continue;
      }
      if (!Number.isFinite(rollNo)) {
        errors.push({ row: rowNumber, message: "rollNo must be a valid number" });
        continue;
      }
      if (!academicYear) {
        errors.push({ row: rowNumber, message: "Missing academicYear" });
        continue;
      }

      const yearExists = await AcademicYear.exists({ yearName: academicYear });
      if (!yearExists) {
        errors.push({ row: rowNumber, message: `Academic year ${academicYear} does not exist` });
        continue;
      }

      const rollKey = `${academicYear}|${className}|${section}|${rollNo}`;
      if (seenRollKeys.has(rollKey)) {
        errors.push({ row: rowNumber, message: "Duplicate roll number in uploaded Excel file" });
        continue;
      }

      const duplicateRollNo = await Student.exists({ academicYear, className, section, rollNo });
      if (duplicateRollNo) {
        errors.push({ row: rowNumber, message: "Duplicate roll number in same class, section, and academic year" });
        continue;
      }

      if (symbolNo) {
        if (seenSymbolNos.has(symbolNo)) {
          errors.push({ row: rowNumber, message: "Duplicate symbolNo in uploaded Excel file" });
          continue;
        }

        const duplicateSymbolNo = await Student.exists({ symbolNo });
        if (duplicateSymbolNo) {
          errors.push({ row: rowNumber, message: "Duplicate symbolNo already exists" });
          continue;
        }
      }

      const student = await Student.create({
        name,
        className,
        section,
        rollNo,
        symbolNo: optionalValue(symbolNo),
        dob: excelDateToValue(row.dob),
        gender: normalizeGender(row.gender),
        fatherName: cleanText(row.fatherName),
        motherName: cleanText(row.motherName),
        address: cleanText(row.address),
        phone: cleanText(row.phone),
        mobileNumber: cleanText(row.phone),
        academicYear,
        studentCode: await generateStudentCode(),
        status: "active"
      });

      seenRollKeys.add(rollKey);
      if (symbolNo) seenSymbolNos.add(symbolNo);
      insertedStudents.push(student);
    }

    res.status(200).json({
      success: true,
      totalRows: nonEmptyRows.length,
      insertedCount: insertedStudents.length,
      skippedCount: errors.length,
      insertedStudents,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

export const downloadStudentImportTemplate = (req, res) => {
  const sampleRows = [
    ["Ram Bahadur Thapa", "Class 8", "A", 1, "2082-08001", "2068-05-12", "Male", "Father Name", "Mother Name", "Devchuli-14", "9800000000", "2082"],
    ["Sita Kumari", "Class 8", "A", 2, "2082-08002", "2068-08-20", "Female", "Father Name", "Mother Name", "Devchuli-14", "9811111111", "2082"]
  ];
  const worksheet = xlsx.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=student_import_template.xlsx");
  res.send(buffer);
};
