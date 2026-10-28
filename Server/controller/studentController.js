import { randomBytes } from "crypto";
import Student from "../model/StudentModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";
import AcademicYear from "../model/AcademicYearModel.js";
import ClassModel from "../model/ClassModel.js";
import xlsx from "xlsx";
import {
  IMPORT_FIELDS,
  LEGACY_DETAIL_FIELDS,
  LEGACY_ROSTER_TEMPLATE_HEADERS,
  getDateFormatFromHeader,
  getAutomaticMapping,
  parseAdDate,
  parseStudentWorkbook,
  suggestClassName,
  validateBsDate,
} from "../utils/studentImport.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateStudentCode = async () => {
  let code;
  let exists = true;
  while (exists) {
    code = `STU${Date.now()}${randomBytes(6).toString("hex").toUpperCase()}`;
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

const templateHeaders = [
  ...LEGACY_ROSTER_TEMPLATE_HEADERS,
];

/**
 * Merge enrollment fields onto a plain student object so the API response
 * stays backwards-compatible with the existing frontend (className, section,
 * rollNo, academicYear at the top level of the student object).
 */
const mergeEnrollment = (student, enrollment) => {
  const obj = student.toObject ? student.toObject({ flattenMaps: true }) : { ...student };
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
      emisCode, symbolNo, dob, dobBs, gender,
      fatherName, motherName, guardianName,
      mobileNumber, address, legacyDetails,
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
      dobBs:        optionalValue(dobBs),
      gender,
      fatherName,
      motherName,
      guardianName,
      mobileNumber,
      phone:        mobileNumber,
      address,
      legacyDetails,
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

const IMPORT_BATCH_SIZE = 100;

class StudentImportInputError extends Error {}

const parseImportOptions = (body) => {
  const parseObject = (value, label, fallback = {}) => {
    if (!value) return fallback;
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error();
      }
      return parsed;
    } catch {
      throw new StudentImportInputError(`Invalid ${label} configuration`);
    }
  };
  const parseArray = (value, label) => {
    if (!value) return [];
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      throw new StudentImportInputError(`Invalid ${label} configuration`);
    }
  };
  const mapping = parseObject(body.mapping, "column mapping");
  const classMap = parseObject(body.classMap, "class mapping");
  const approvedReviewRows = parseArray(body.approvedReviewRows, "review approval");
  return {
    mapping,
    classMap,
    approvedReviewRows: approvedReviewRows.map(Number).filter(Number.isInteger),
    dateFormat: ["AD", "BS"].includes(body.dateFormat) ? body.dateFormat : "",
  };
};

const chunkValues = async (values, callback) => {
  const results = [];
  for (let index = 0; index < values.length; index += 500) {
    results.push(...await callback(values.slice(index, index + 500)));
  }
  return results;
};

const tupleKey = (values) => values.map((value) => String(value ?? "").toLowerCase()).join("|");

const splitClassSection = (value) => {
  const match = cleanText(value).match(/^(.+?)[\s/-]+([a-z0-9]+)$/i);
  return match ? { className: match[1].trim(), section: match[2].trim() } : null;
};

const buildStudentImportPreview = async (buffer, options) => {
  let parsed;
  try {
    parsed = parseStudentWorkbook(buffer);
  } catch (error) {
    throw new StudentImportInputError(error.message);
  }
  const allowedFields = new Set(IMPORT_FIELDS.map(({ key }) => key));
  const mapping = Object.keys(options.mapping).length ? options.mapping : getAutomaticMapping(parsed.headers);
  const assignedFields = Object.values(mapping).filter(Boolean);
  if (Object.keys(mapping).some((header) => !parsed.headers.includes(header))) {
    throw new StudentImportInputError("Column mapping contains a header that is not in the uploaded file");
  }
  if (Object.values(mapping).some((field) => field && !allowedFields.has(field))) {
    throw new StudentImportInputError("Column mapping contains an unsupported field");
  }
  if (new Set(assignedFields).size !== assignedFields.length) {
    throw new StudentImportInputError("Map each database field to only one source column");
  }

  const classes = await ClassModel.find({
    $or: [{ isActive: true }, { isActive: { $exists: false } }],
  }).select("className sections").lean();
  const configuredClasses = classes.map(({ className }) => className);
  const classNames = [...new Set(parsed.rows.map(({ values }) => {
    const header = Object.keys(mapping).find((key) => mapping[key] === "className");
    const classSectionHeader = Object.keys(mapping).find((key) => mapping[key] === "classSection");
    const directClass = cleanText(header ? values[header] : "");
    if (directClass) return directClass;
    const combined = splitClassSection(classSectionHeader ? values[classSectionHeader] : "");
    return combined?.className || "";
  }).filter(Boolean))];
  const suggestedClassMap = Object.fromEntries(classNames.map((name) => [
    name,
    suggestClassName(name, configuredClasses),
  ]));
  const classMap = { ...suggestedClassMap, ...options.classMap };
  const classByName = new Map(classes.map((item) => [item.className.toLowerCase(), item]));
  const years = [...new Set(parsed.rows.map(({ values }) => {
    const header = Object.keys(mapping).find((key) => mapping[key] === "academicYear");
    return cleanText(header ? values[header] : "");
  }).filter(Boolean))];
  const existingYears = new Set((await AcademicYear.find({ yearName: { $in: years } })
    .select("yearName").lean()).map(({ yearName }) => yearName));
  const academicYearHeader = Object.keys(mapping).find((key) => mapping[key] === "academicYear");
  let activeYearFallback = "";
  if (!academicYearHeader) {
    const activeYear = await AcademicYear.findOne({ isActive: true }).select("yearName").lean();
    activeYearFallback = activeYear?.yearName || "";
    if (activeYearFallback) existingYears.add(activeYearFallback);
  }

  const mappedRows = parsed.rows.map(({ rowNumber, values, displayValues }) => {
    const fields = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (field) {
        const isBsDate = field === "dob"
          && (getDateFormatFromHeader(header) === "BS" || options.dateFormat === "BS");
        const value = isBsDate && values[header] instanceof Date
          ? displayValues[header]
          : values[header];
        fields[field] = field === "dob" && value instanceof Date ? value : cleanText(value);
      }
    }
    if ((!fields.className || !fields.section) && fields.classSection) {
      const combined = splitClassSection(fields.classSection);
      if (combined) {
        fields.className ||= combined.className;
        fields.section ||= combined.section;
      }
    }
    if (!fields.academicYear && !academicYearHeader) {
      fields.academicYear = activeYearFallback;
    }
    const issues = [];
    if (!fields.name) issues.push("Student name is required");
    if (!fields.className) issues.push("Class is required");
    if (!fields.section) issues.push("Section is required");
    if (!fields.academicYear) {
      issues.push("Academic year is required");
    } else if (!existingYears.has(fields.academicYear)) {
      issues.push(`Academic year "${fields.academicYear}" is not configured`);
    }

    const sourceClassName = fields.className;
    const mappedClass = sourceClassName ? cleanText(classMap[sourceClassName]) : "";
    if (sourceClassName && !classByName.has(mappedClass.toLowerCase())) {
      issues.push(`Map "${sourceClassName}" to an active class`);
    } else if (mappedClass) {
      fields.className = classByName.get(mappedClass.toLowerCase()).className;
    }

    if (fields.section && fields.className) {
      const configuredClass = classByName.get(fields.className.toLowerCase());
      const configuredSection = (configuredClass?.sections || []).find(
        (section) => section.toLowerCase() === fields.section.toLowerCase(),
      );
      if ((configuredClass?.sections || []).length && !configuredSection) {
        issues.push(`Section "${fields.section}" is not configured for ${fields.className}`);
      } else if (configuredSection) {
        fields.section = configuredSection;
      }
    }

    if (fields.rollNo) {
      const rollNo = Number(fields.rollNo);
      if (!Number.isInteger(rollNo) || rollNo < 0) {
        issues.push("Roll number must be a non-negative whole number");
      } else {
        fields.rollNo = rollNo;
      }
    }

    if (fields.gender) {
      const gender = normalizeGender(fields.gender);
      if (!["Male", "Female", "Other"].includes(gender)) {
        issues.push("Gender must be Male, Female, or Other");
      } else {
        fields.gender = gender;
      }
    }

    if (fields.dob) {
      const dobHeader = Object.keys(mapping).find((key) => mapping[key] === "dob");
      const headerFormat = getDateFormatFromHeader(dobHeader);
      const dateFormat = headerFormat || options.dateFormat;
      if (!dateFormat) {
        issues.push("Confirm whether this date of birth is BS or AD");
      } else if (dateFormat === "BS") {
        const error = validateBsDate(fields.dob);
        if (error) issues.push(error);
        else {
          fields.dobBs = fields.dob;
          delete fields.dob;
        }
      } else {
        const result = parseAdDate(fields.dob);
        if (result.error) issues.push(result.error);
        else fields.dob = result.date;
      }
    }
    if (fields.dobBs) {
      const error = validateBsDate(fields.dobBs);
      if (error) issues.push(error);
    }

    fields.registrationNo = cleanText(fields.registrationNo);
    fields.symbolNo = cleanText(fields.symbolNo);
    fields.phone = cleanText(fields.phone);
    fields.fatherName = cleanText(fields.fatherName);
    fields.motherName = cleanText(fields.motherName);
    fields.address = cleanText(fields.address);

    return {
      rowNumber,
      fields,
      status: issues.length ? "invalid" : "ready",
      issues,
    };
  });

  const validRows = mappedRows.filter((row) => row.status === "ready");
  const registrationNumbers = [...new Set(validRows.map(({ fields }) => fields.registrationNo).filter(Boolean))];
  const symbolNumbers = [...new Set(validRows.map(({ fields }) => fields.symbolNo).filter(Boolean))];
  const [studentsByRegistration, studentsBySymbol] = await Promise.all([
    chunkValues(registrationNumbers, (values) => Student.find({ emisCode: { $in: values } })
      .select("_id name emisCode symbolNo").lean()),
    chunkValues(symbolNumbers, (values) => Student.find({ symbolNo: { $in: values } })
      .select("_id name emisCode symbolNo").lean()),
  ]);
  const existingRegistrations = new Map(studentsByRegistration.map((student) => [student.emisCode, student]));
  const existingSymbols = new Map(studentsBySymbol.map((student) => [student.symbolNo, student]));

  const names = [...new Set(validRows.map(({ fields }) => fields.name))];
  const matchedNameStudents = await chunkValues(names, (values) => Student.find({ name: { $in: values } })
    .select("_id name emisCode symbolNo").lean());
  const idsByName = new Map();
  for (const student of matchedNameStudents) {
    const key = student.name.toLowerCase();
    idsByName.set(key, [...(idsByName.get(key) || []), student._id]);
  }
  const matchingStudentIds = [...new Set([...idsByName.values()].flat().map(String))];
  const existingEnrollments = matchingStudentIds.length
    ? await StudentEnrollment.find({
      student: { $in: matchingStudentIds },
      academicYear: { $in: [...new Set(validRows.map(({ fields }) => fields.academicYear))] },
      className: { $in: [...new Set(validRows.map(({ fields }) => fields.className))] },
    }).select("student academicYear className section rollNo").lean()
    : [];
  const rollRows = [...new Map(validRows
    .filter(({ fields }) => fields.rollNo != null)
    .map(({ fields }) => [
      tupleKey([fields.academicYear, fields.className, fields.section, fields.rollNo]),
      fields,
    ])).values()];
  const existingRollEnrollments = await chunkValues(rollRows, (batch) => StudentEnrollment.find({
    $or: batch.map(({ academicYear, className, section, rollNo }) => ({
      academicYear,
      className,
      section,
      rollNo,
    })),
  }).select("academicYear className section rollNo").lean());
  const enrollmentsByStudentId = new Map();
  for (const entry of existingEnrollments) {
    const key = String(entry.student);
    enrollmentsByStudentId.set(key, [...(enrollmentsByStudentId.get(key) || []), entry]);
  }
  const existingRollKeys = new Set(existingRollEnrollments
    .filter(({ rollNo }) => rollNo != null)
    .map(({ academicYear, className, section, rollNo }) => tupleKey([academicYear, className, section, rollNo])));

  const seenRegistrations = new Set();
  const seenSymbols = new Set();
  const seenRolls = new Set();
  for (const row of mappedRows) {
    if (row.status !== "ready") continue;
    const { fields } = row;
    const rollKey = fields.rollNo == null
      ? ""
      : tupleKey([fields.academicYear, fields.className, fields.section, fields.rollNo]);
    const registrationMatch = fields.registrationNo && existingRegistrations.get(fields.registrationNo);
    const symbolMatch = fields.symbolNo && existingSymbols.get(fields.symbolNo);
    const identityConflict = registrationMatch || symbolMatch
      || (fields.registrationNo && seenRegistrations.has(fields.registrationNo))
      || (fields.symbolNo && seenSymbols.has(fields.symbolNo));
    if (identityConflict) {
      row.status = "duplicate";
      row.issues.push("Registration or symbol number already exists in the database or uploaded file");
      const matchedStudent = registrationMatch || symbolMatch;
      if (matchedStudent) {
        row.possibleMatch = {
          name: matchedStudent.name,
          registrationNo: matchedStudent.emisCode,
          symbolNo: matchedStudent.symbolNo,
        };
      }
      continue;
    }
    if (rollKey && (existingRollKeys.has(rollKey) || seenRolls.has(rollKey))) {
      row.status = "duplicate";
      row.issues.push("Roll number already exists for this class, section, and academic year");
      continue;
    }
    if (fields.registrationNo) seenRegistrations.add(fields.registrationNo);
    if (fields.symbolNo) seenSymbols.add(fields.symbolNo);
    if (rollKey) seenRolls.add(rollKey);

    const sameNameStudentIds = idsByName.get(fields.name.toLowerCase()) || [];
    const sameEnrollment = sameNameStudentIds
      .flatMap((id) => enrollmentsByStudentId.get(String(id)) || [])
      .find((entry) => entry
        && entry.academicYear === fields.academicYear
        && entry.className.toLowerCase() === fields.className.toLowerCase());
    if (!fields.registrationNo && !fields.symbolNo) {
      row.status = "review";
      row.issues.push("No registration or symbol number; review identity before importing");
    } else if (sameEnrollment) {
      row.status = "review";
      row.issues.push("A student with the same name, class, and year may already exist");
    }
    if (sameEnrollment) {
      const matchedStudent = matchedNameStudents.find(
        (student) => String(student._id) === String(sameEnrollment.student),
      );
      if (matchedStudent) {
        row.possibleMatch = {
          name: matchedStudent.name,
          className: sameEnrollment.className,
          section: sameEnrollment.section,
          academicYear: sameEnrollment.academicYear,
          rollNo: sameEnrollment.rollNo,
          registrationNo: matchedStudent.emisCode,
          symbolNo: matchedStudent.symbolNo,
        };
      }
    }
  }

  const counts = {
    ready: mappedRows.filter(({ status }) => status === "ready").length,
    duplicate: mappedRows.filter(({ status }) => status === "duplicate").length,
    invalid: mappedRows.filter(({ status }) => status === "invalid").length,
    review: mappedRows.filter(({ status }) => status === "review").length,
  };
  const dateFormatSuggestion = parsed.headers
    .filter((header) => mapping[header] === "dob")
    .map(getDateFormatFromHeader)
    .filter(Boolean);

  return {
    headers: parsed.headers,
    fields: IMPORT_FIELDS,
    mapping,
    classes: classes.map(({ className, sections }) => ({ className, sections })),
    suggestedClassMap,
    classMap,
    academicYearFallback: activeYearFallback,
    dateFormatSuggestion: dateFormatSuggestion.length
      && new Set(dateFormatSuggestion).size === 1
      ? dateFormatSuggestion[0]
      : "",
    rows: mappedRows,
    counts,
    totalRows: parsed.totalRows,
    nonEmptyRows: parsed.rows.length,
    blankRows: parsed.blankRows,
  };
};

export const previewStudentImport = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Please upload an Excel or CSV file" });
    }
    const options = parseImportOptions(req.body);
    const preview = await buildStudentImportPreview(req.file.buffer, options);
    res.json({ success: true, ...preview });
  } catch (error) {
    if (error instanceof StudentImportInputError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Student import preview failed", error.name, error.code);
    res.status(500).json({ success: false, message: "Student import preview could not be completed" });
  }
};

export const importStudentsFromExcel = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Please upload an Excel or CSV file" });
    }
    if (req.body.classMapConfirmed !== "true") {
      return res.status(400).json({ success: false, message: "Confirm the proposed class mappings before importing" });
    }
    const options = parseImportOptions(req.body);
    const preview = await buildStudentImportPreview(req.file.buffer, options);
    const approvedReviews = new Set(options.approvedReviewRows);
    const errors = [];
    let insertedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    let reviewCount = 0;

    for (let offset = 0; offset < preview.rows.length; offset += IMPORT_BATCH_SIZE) {
      const batch = preview.rows.slice(offset, offset + IMPORT_BATCH_SIZE);
      await Promise.all(batch.map(async (row) => {
        if (row.status === "duplicate") {
          duplicateCount += 1;
          errors.push({ row: row.rowNumber, reason: row.issues.join("; ") });
          return;
        }
        if (row.status === "invalid") {
          invalidCount += 1;
          errors.push({ row: row.rowNumber, reason: row.issues.join("; ") });
          return;
        }
        if (row.status === "review" && !approvedReviews.has(row.rowNumber)) {
          reviewCount += 1;
          errors.push({ row: row.rowNumber, reason: "Skipped: manual review was not approved" });
          return;
        }

        const { fields } = row;
        let student;
        try {
          const studentFields = {
            name: fields.name,
            studentCode: await generateStudentCode(),
          };
          if (fields.registrationNo) studentFields.emisCode = fields.registrationNo;
          if (fields.symbolNo) studentFields.symbolNo = fields.symbolNo;
          if (fields.dob) studentFields.dob = fields.dob;
          if (fields.dobBs) studentFields.dobBs = fields.dobBs;
          if (fields.gender) studentFields.gender = fields.gender;
          if (fields.fatherName) studentFields.fatherName = fields.fatherName;
          if (fields.motherName) studentFields.motherName = fields.motherName;
          if (fields.guardianName) studentFields.guardianName = fields.guardianName;
          if (fields.phone) {
            studentFields.phone = fields.phone;
            studentFields.mobileNumber = fields.phone;
          } else if (fields.fatherContactNo || fields.guardianContactNo) {
            const contactNo = fields.fatherContactNo || fields.guardianContactNo;
            studentFields.phone = contactNo;
            studentFields.mobileNumber = contactNo;
          }
          if (fields.address) studentFields.address = fields.address;
          const legacyDetails = Object.fromEntries(LEGACY_DETAIL_FIELDS
            .filter((field) => fields[field] !== undefined && fields[field] !== "")
            .map((field) => [field, fields[field]]));
          if (Object.keys(legacyDetails).length) studentFields.legacyDetails = legacyDetails;

          student = await Student.create(studentFields);
          await StudentEnrollment.create({
            student: student._id,
            academicYear: fields.academicYear,
            className: fields.className,
            section: fields.section,
            rollNo: fields.rollNo ?? null,
            status: "active",
          });
          insertedCount += 1;
        } catch (error) {
          if (student) {
            try {
              await Student.deleteOne({ _id: student._id });
            } catch (cleanupError) {
              console.error("Student import cleanup failed", cleanupError.name, cleanupError.code);
            }
          }
          console.error("Student import row failed", row.rowNumber, error.name, error.code);
          errors.push({
            row: row.rowNumber,
            reason: "Could not create this student and enrollment; check database constraints and retry",
          });
        }
      }));
    }

    errors.sort((first, second) => first.row - second.row);
    res.json({
      success: true,
      totalRows: preview.totalRows,
      blankRows: preview.blankRows,
      insertedCount,
      duplicateCount,
      invalidCount,
      reviewCount,
      failedCount: errors.length - duplicateCount - invalidCount - reviewCount,
      skippedCount: errors.length,
      errors,
    });
  } catch (error) {
    if (error instanceof StudentImportInputError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Student import failed", error.name, error.code);
    res.status(500).json({ success: false, message: "Student import could not be completed" });
  }
};

// ─── DOWNLOAD IMPORT TEMPLATE ─────────────────────────────────────────────────

export const downloadStudentImportTemplate = (req, res) => {
  const worksheet = xlsx.utils.aoa_to_sheet([templateHeaders]);
  worksheet["!cols"] = templateHeaders.map((header) => ({
    wch: Math.max(12, Math.min(24, header.length + 2)),
  }));
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Students");
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xls" });
  res.setHeader("Content-Type", "application/vnd.ms-excel");
  res.setHeader("Content-Disposition", "attachment; filename=student_registration_template.xls");
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
