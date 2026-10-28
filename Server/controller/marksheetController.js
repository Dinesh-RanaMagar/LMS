import Marksheet from "../model/MarksheetModel.js";
import Student from "../model/StudentModel.js";
import Exam from "../model/examModel.js";
import AcademicYear from "../model/AcademicYearModel.js";
import StudentEnrollment from "../model/StudentEnrollmentModel.js";
import { normalizeMarkSubject, parseMarksWorkbook } from "../utils/marksImport.js";

class MarksImportInputError extends Error {}

const normalizeStudentName = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const normalizeRollNumber = (value) => {
  const roll = String(value ?? "").trim();
  return /^\d+(?:\.0+)?$/.test(roll) ? String(Number(roll)) : roll;
};

const buildMarksImport = async ({ buffer, examId, className, section }) => {
  if (!buffer) throw new MarksImportInputError("Please upload an Excel file.");
  if (!examId || !className || !section) {
    throw new MarksImportInputError("Exam, class, and section are required.");
  }

  let parsed;
  try {
    parsed = parseMarksWorkbook(buffer);
  } catch (error) {
    throw new MarksImportInputError(error.message);
  }
  const exam = await Exam.findById(examId);
  if (!exam) throw new MarksImportInputError("Exam not found.");
  const classConfig = exam.classExamConfigs.find((item) => item.className === className);
  if (!classConfig) throw new MarksImportInputError(`The selected exam has no subject configuration for ${className}.`);

  const subjectMap = new Map(
    classConfig.subjects.map((subject) => [normalizeMarkSubject(subject.subjectName), subject])
  );
  const mappedSubjects = parsed.subjects.map((sourceName) => ({
    sourceName,
    config: subjectMap.get(normalizeMarkSubject(sourceName)),
  }));
  const unmapped = mappedSubjects.filter(({ config }) => !config).map(({ sourceName }) => sourceName);
  if (unmapped.length) {
    throw new MarksImportInputError(`Spreadsheet subjects do not match this exam: ${unmapped.join(", ")}.`);
  }
  const enrollments = await StudentEnrollment.find({
    academicYear: exam.academicYear,
    className,
    section,
    status: { $ne: "left" },
  }).populate("student", "name");
  const studentsByRoll = new Map();
  for (const enrollment of enrollments) {
    if (!enrollment.student || enrollment.rollNo === null || enrollment.rollNo === undefined) continue;
    const key = normalizeRollNumber(enrollment.rollNo);
    if (!studentsByRoll.has(key)) studentsByRoll.set(key, []);
    studentsByRoll.get(key).push(enrollment.student);
  }

  const seenRolls = new Set();
  const rows = parsed.rows.map((row) => {
    const errors = [...row.errors];
    let studentId = null;
    const rollKey = normalizeRollNumber(row.rollNo);
    const rollMatches = studentsByRoll.get(rollKey) || [];
    if (!row.rollNo) errors.push("Roll number is missing.");
    else if (seenRolls.has(rollKey)) errors.push("Duplicate roll number in spreadsheet.");
    else if (rollMatches.length === 0) errors.push("No student with this roll number in the selected class, section, and exam year.");
    else if (rollMatches.length > 1) errors.push("More than one student has this roll number; cannot match safely.");
    else {
      studentId = String(rollMatches[0]._id);
      if (!row.name) errors.push("Student name is missing.");
      else if (normalizeStudentName(row.name) !== normalizeStudentName(rollMatches[0].name)) {
        errors.push(`Name does not match roll ${row.rollNo} (${rollMatches[0].name}).`);
      }
    }
    if (rollKey) seenRolls.add(rollKey);

    const marks = [];
    for (const { sourceName, config } of mappedSubjects) {
      const sourceMarks = row.marks[sourceName];
      if (!sourceMarks) continue;
      const theoryMax = config.hasPractical ? config.theoryFullMarks : config.fullMarks;
      if (sourceMarks.theory > theoryMax) {
        errors.push(`${config.subjectName} TH mark exceeds ${theoryMax}.`);
      }
      if (sourceMarks.practical > config.practicalFullMarks) {
        errors.push(`${config.subjectName} INT mark exceeds ${config.practicalFullMarks}.`);
      }
      if (sourceMarks.theory + sourceMarks.practical > config.fullMarks) {
        errors.push(`${config.subjectName} total exceeds ${config.fullMarks}.`);
      }
      marks.push({
        subject: config.subjectName,
        theory: sourceMarks.theory,
        practical: sourceMarks.practical,
        fullMarks: config.fullMarks,
        passMarks: config.passMarks,
        hasPractical: Boolean(config.hasPractical),
        theoryFullMarks: config.hasPractical ? config.theoryFullMarks : config.fullMarks,
        theoryPassMarks: config.hasPractical ? config.theoryPassMarks : config.passMarks,
        practicalFullMarks: config.hasPractical ? config.practicalFullMarks : 0,
        practicalPassMarks: config.hasPractical ? config.practicalPassMarks : 0,
        creditHour: config.creditHour || 0,
      });
    }

    return {
      rowNumber: row.rowNumber,
      rollNo: row.rollNo,
      name: row.name,
      studentId,
      marks,
      errors: [...new Set(errors)],
      valid: errors.length === 0,
    };
  });

  return {
    exam,
    className,
    section,
    subjects: mappedSubjects.map(({ config }) => config.subjectName),
    rows,
  };
};

/**
 * Attaches academic year fields (className, rollNo) to a student object inside a marksheet
 * by looking into the student's embedded history.
 */
const attachStudentYearData = async (marksheet) => {
  if (!marksheet.student || !marksheet.student._id) return marksheet;

  const enrollment = await StudentEnrollment.findOne({
    student: marksheet.student._id,
    academicYear: marksheet.academicYear,
  }).select("className section rollNo");

  if (enrollment) {
    const studentObj = marksheet.student.toObject ? marksheet.student.toObject() : { ...marksheet.student };
    studentObj.className = enrollment.className;
    studentObj.section = enrollment.section;
    studentObj.rollNo = enrollment.rollNo;
    marksheet.student = studentObj;
    return marksheet;
  }

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
    let targetExam = null;

    // If specific exam provided, ensure we respect it
    if (examId || exam) filter.exam = examId || exam;
    if (academicYear) filter.academicYear = academicYear;

    // If an exam filter is present, verify that exam's results are published (unless explicitly allowed)
    if (filter.exam) {
      targetExam = await Exam.findById(filter.exam).select('isResultPublished academicYear');
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
      .populate("student", "name symbolNo emisCode studentCode")
      .populate("exam", "examName className year academicYear classExamConfigs isResultPublished")
      .sort({ createdAt: -1 });

    // Enrich marksheets with student year data
    marksheets = await Promise.all(marksheets.map(m => attachStudentYearData(m)));

    if (className) {
      marksheets = marksheets.filter((marksheet) => marksheet.student?.className === className);
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

export const previewMarksImport = async (req, res) => {
  try {
    const result = await buildMarksImport({
      buffer: req.file?.buffer,
      examId: req.body.examId,
      className: req.body.className,
      section: req.body.section,
    });
    const validCount = result.rows.filter((row) => row.valid).length;
    res.json({
      success: true,
      subjects: result.subjects,
      totalRows: result.rows.length,
      validCount,
      invalidCount: result.rows.length - validCount,
      rows: result.rows,
    });
  } catch (error) {
    if (error instanceof MarksImportInputError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Marks import preview failed", error.name, error.code);
    res.status(500).json({ success: false, message: "Marks import preview could not be completed." });
  }
};

export const importMarksFromExcel = async (req, res) => {
  try {
    const result = await buildMarksImport({
      buffer: req.file?.buffer,
      examId: req.body.examId,
      className: req.body.className,
      section: req.body.section,
    });
    const validRows = result.rows.filter((row) => row.valid);
    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: "There are no valid student rows to import.",
        rows: result.rows,
      });
    }

    let importedCount = 0;
    const failures = [];
    for (const row of validRows) {
      try {
        let marksheet = await Marksheet.findOne({ student: row.studentId, exam: result.exam._id });
        if (!marksheet) {
          marksheet = new Marksheet({
            student: row.studentId,
            exam: result.exam._id,
            academicYear: result.exam.academicYear,
            marks: row.marks,
          });
        } else {
          const nextMarks = [...marksheet.marks];
          for (const mark of row.marks) {
            const index = nextMarks.findIndex((existing) => existing.subject === mark.subject);
            if (index >= 0) nextMarks[index] = mark;
            else nextMarks.push(mark);
          }
          marksheet.marks = nextMarks;
        }
        marksheet.calculateGrade();
        await marksheet.save();
        importedCount += 1;
      } catch (error) {
        failures.push({ rowNumber: row.rowNumber, rollNo: row.rollNo, message: error.message });
      }
    }

    res.status(failures.length ? 207 : 200).json({
      success: failures.length === 0,
      message: failures.length
        ? `Imported ${importedCount} student(s); ${failures.length} row(s) failed to save.`
        : `Imported marks for ${importedCount} student(s).`,
      importedCount,
      skippedCount: result.rows.length - validRows.length,
      errors: [
        ...result.rows.filter((row) => !row.valid).map((row) => ({
          rowNumber: row.rowNumber,
          rollNo: row.rollNo,
          message: row.errors.join(" "),
        })),
        ...failures,
      ],
    });
  } catch (error) {
    if (error instanceof MarksImportInputError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Marks import failed", error.name, error.code);
    res.status(500).json({ success: false, message: "Marks import could not be completed." });
  }
};