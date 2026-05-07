import Marksheet from '../models/Marksheet.js';

export const createMarksheet = async (req, res) => {
  try {
    const marksheet = new Marksheet(req.body);
    marksheet.calculateGrade();
    await marksheet.save();
    const populatedMarksheet = await Marksheet.findById(marksheet._id)
      .populate('student')
      .populate('exam')
      .populate('academicYear');
    res.status(201).json(populatedMarksheet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getMarksheets = async (req, res) => {
  try {
    const { student, exam, academicYear } = req.query;
    let query = {};

    if (student) query.student = student;
    if (exam) query.exam = exam;
    if (academicYear) query.academicYear = academicYear;

    const marksheets = await Marksheet.find(query)
      .populate('student')
      .populate('exam')
      .populate('academicYear')
      .sort({ createdAt: -1 });
    res.json(marksheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMarksheetById = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id)
      .populate('student')
      .populate('exam')
      .populate('academicYear');
    if (!marksheet) {
      return res.status(404).json({ message: 'Marksheet not found' });
    }
    res.json(marksheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMarksheetByStudentAndExam = async (req, res) => {
  try {
    const marksheet = await Marksheet.findOne({
      student: req.params.studentId,
      exam: req.params.examId,
    })
      .populate('student')
      .populate('exam')
      .populate('academicYear');
    res.json(marksheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findById(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ message: 'Marksheet not found' });
    }

    Object.assign(marksheet, req.body);
    marksheet.calculateGrade();
    await marksheet.save();

    const populatedMarksheet = await Marksheet.findById(marksheet._id)
      .populate('student')
      .populate('exam')
      .populate('academicYear');
    res.json(populatedMarksheet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMarksheet = async (req, res) => {
  try {
    const marksheet = await Marksheet.findByIdAndDelete(req.params.id);
    if (!marksheet) {
      return res.status(404).json({ message: 'Marksheet not found' });
    }
    res.json({ message: 'Marksheet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
