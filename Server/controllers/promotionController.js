import Student from '../models/Student.js';
import PromotionHistory from '../models/PromotionHistory.js';
import Exam from '../models/Exam.js';
import Marksheet from '../models/Marksheet.js';

export const promoteStudent = async (req, res) => {
  try {
    const { studentId, toAcademicYear, toClass, newRollNo, newSection, remarks } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const finalExam = await Exam.findOne({
      academicYear: student.academicYear,
      className: student.className,
      isFinalExam: true,
    });

    let resultStatus = 'promoted';

    if (finalExam) {
      const marksheet = await Marksheet.findOne({
        student: studentId,
        exam: finalExam._id,
      });

      if (marksheet && marksheet.result === 'Fail') {
        resultStatus = 'retained';
      }
    }

    const promotionHistory = new PromotionHistory({
      student: studentId,
      fromAcademicYear: student.academicYear,
      toAcademicYear: toAcademicYear,
      fromClass: student.className,
      toClass: resultStatus === 'promoted' ? toClass : student.className,
      resultStatus: resultStatus,
      remarks: remarks,
    });

    await promotionHistory.save();

    if (resultStatus === 'promoted') {
      student.status = 'promoted';
      await student.save();

      const newStudent = new Student({
        name: student.name,
        className: toClass,
        section: newSection || student.section,
        rollNo: newRollNo || student.rollNo,
        symbolNo: student.symbolNo,
        dob: student.dob,
        gender: student.gender,
        fatherName: student.fatherName,
        motherName: student.motherName,
        address: student.address,
        phone: student.phone,
        academicYear: toAcademicYear,
        status: 'active',
      });

      await newStudent.save();
    }

    res.status(201).json({ promotionHistory, resultStatus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPromotionHistory = async (req, res) => {
  try {
    const history = await PromotionHistory.find({ student: req.params.studentId })
      .populate('student', 'name')
      .populate('fromAcademicYear', 'yearName')
      .populate('toAcademicYear', 'yearName')
      .sort({ promotedDate: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllPromotionHistory = async (req, res) => {
  try {
    const history = await PromotionHistory.find()
      .populate('student', 'name className rollNo')
      .populate('fromAcademicYear', 'yearName')
      .populate('toAcademicYear', 'yearName')
      .sort({ promotedDate: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
