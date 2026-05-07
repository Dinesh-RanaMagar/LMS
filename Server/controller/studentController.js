import Student from "../model/StudentModel.js";
import AcademicYear from "../model/AcademicYearModel.js";

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
        rollNo,
        academicYear: activeYear.yearName
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Student with this roll number already exists in this class for the active academic year"
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
      address,
      academicYear: activeYear.yearName
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

    const students = await Student.find(filter).sort({ className: 1, rollNo: 1 });
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

    // Check for duplicate if class or rollNo is being updated
    if ((updates.rollNo != null || updates.className != null) && updates.rollNo !== "") {
      const newRollNo = updates.rollNo != null ? updates.rollNo : student.rollNo;
      const newClassName = updates.className != null ? updates.className : student.className;

      const duplicate = await Student.findOne({
        _id: { $ne: student._id },
        className: newClassName,
        rollNo: newRollNo,
        academicYear: student.academicYear
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Another student already has this class and roll number in this academic year"
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