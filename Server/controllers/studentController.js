import Student from '../models/Student.js';
import AcademicYear from '../models/AcademicYear.js';

export const createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };
    
    // Auto-set active academic year if not provided
    if (!studentData.academicYear) {
      const activeYear = await AcademicYear.findOne({ isActive: true });
      if (!activeYear) {
        return res.status(400).json({ message: 'No active academic year found. Please set an active academic year first.' });
      }
      studentData.academicYear = activeYear._id;
    }
    
    const student = new Student(studentData);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStudents = async (req, res) => {
  try {
    const { academicYear, className, section, status } = req.query;
    let query = {};

    if (academicYear) query.academicYear = academicYear;
    if (className) query.className = className;
    if (section) query.section = section;
    if (status) query.status = status;

    const students = await Student.find(query)
      .populate('academicYear', 'yearName')
      .sort({ className: 1, section: 1, rollNo: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('academicYear', 'yearName');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('academicYear', 'yearName');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
