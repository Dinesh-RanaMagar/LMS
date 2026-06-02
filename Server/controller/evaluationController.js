import mongoose from 'mongoose';
import Student from '../model/StudentModel.js';
import Exam from '../model/examModel.js';
import Marksheet from '../model/MarksheetModel.js';
import Attendance from '../model/AttendanceModel.js';

const getGradeFromPercentage = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  return 'F';
};

const getGpaFromPercentage = (percentage) => {
  if (percentage >= 90) return 4.0;
  if (percentage >= 80) return 3.6;
  if (percentage >= 70) return 3.2;
  if (percentage >= 60) return 2.8;
  if (percentage >= 50) return 2.4;
  return 0.0;
};

const getPerformanceStatus = (change) => {
  if (change == null) return 'Unknown';
  if (change >= 10) return 'Strong';
  if (change > 0) return 'Improved';
  if (change < 0) return 'Declined';
  return 'Stable';
};

const buildAiSummary = ({ strongSubjects, weakSubjects, improvement, stableSubjects }) => {
  const pieces = [];
  if (strongSubjects.length) {
    pieces.push(`Strong performance in ${strongSubjects.join(', ')}.`);
  }
  if (weakSubjects.length) {
    pieces.push(`Needs improvement in ${weakSubjects.join(', ')}.`);
  }
  if (stableSubjects.length) {
    pieces.push(`Stable work is visible in ${stableSubjects.join(', ')}.`);
  }
  if (improvement > 0) {
    pieces.push(`Overall performance improved by ${improvement.toFixed(1)}% compared to the first selected term.`);
  } else if (improvement < 0) {
    pieces.push(`Overall performance dropped by ${Math.abs(improvement).toFixed(1)}% compared to the first selected term.`);
  } else {
    pieces.push('Performance is stable across selected exams.');
  }
  return pieces.join(' ');
};

const calculateAttendance = async (student) => {
  const className = student.className;
  const section = student.section;
  if (!className || !section) return { percentage: null, records: 0, present: 0, absent: 0 };

  const attendanceRows = await Attendance.find({ type: 'student', className, section });
  if (!attendanceRows.length) return { percentage: null, records: 0, present: 0, absent: 0 };

  let presentCount = 0;
  let totalCount = 0;
  let absentCount = 0;

  attendanceRows.forEach((row) => {
    row.records.forEach((record) => {
      if (String(record.person) === String(student._id)) {
        totalCount += 1;
        if (record.status === 'present') presentCount += 1;
        if (record.status === 'absent') absentCount += 1;
      }
    });
  });

  return {
    percentage: totalCount ? Number(((presentCount / totalCount) * 100).toFixed(1)) : null,
    records: totalCount,
    present: presentCount,
    absent: absentCount,
  };
};

const getRankForExam = async (exam, student) => {
  const candidates = await Marksheet.find({ exam: exam._id }).populate('student');
  const sameClass = candidates.filter((item) => item.student && item.student.className === student.className && item.student.section === student.section);
  if (!sameClass.length) return { rank: null, totalStudents: 0, classAverage: null };

  const sorted = [...sameClass].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  const rank = sorted.findIndex((item) => String(item.student._id) === String(student._id)) + 1;
  const classAverage = Number((sameClass.reduce((sum, item) => sum + (item.percentage || 0), 0) / sameClass.length).toFixed(1));
  return { rank: rank || null, totalStudents: sameClass.length, classAverage };
};

export const compareEvaluation = async (req, res) => {
  try {
    const { studentId, examIds } = req.body;
    if (!studentId || !Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentId and examIds are required' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const examCriteria = examIds.map((examId) => {
      if (mongoose.Types.ObjectId.isValid(examId)) {
        return { _id: examId };
      }
      return { examName: String(examId).trim() };
    });

    const exams = await Exam.find({ $or: examCriteria }).sort({ examName: 1 });
    if (!exams.length) {
      return res.status(404).json({ success: false, message: 'No matching exams found' });
    }

    const marksheets = await Marksheet.find({ student: student._id, exam: { $in: exams.map((exam) => exam._id) } })
      .populate('exam')
      .populate('student');

    console.log('Found marksheets:', marksheets.length);
    console.log('Sample marksheet data:', marksheets[0] ? {
      totalMarks: marksheets[0].totalMarks,
      totalFullMarks: marksheets[0].totalFullMarks,
      percentage: marksheets[0].percentage,
      grade: marksheets[0].grade,
      marks: marksheets[0].marks.map(m => ({
        subject: m.subject,
        obtainedMarks: m.obtainedMarks,
        fullMarks: m.fullMarks,
        percentage: m.percentage
      }))
    } : 'No marksheets found');

    const marksheetMap = new Map(marksheets.map((marksheet) => [String(marksheet.exam._id), marksheet]));
    const subjectNames = [...new Set(marksheets.flatMap((marksheet) => marksheet.marks.map((item) => item.subject)))].sort();

    const examsWithMetrics = await Promise.all(exams.map(async (exam) => {
      const marksheet = marksheetMap.get(String(exam._id));
      const { rank, totalStudents, classAverage } = await getRankForExam(exam, student);
      return {
        _id: exam._id,
        examName: exam.examName,
        percentage: marksheet?.percentage ?? null,
        gpa: marksheet?.gpa ?? null,
        finalGrade: marksheet?.grade ?? null, // Use 'grade' field from marksheet
        obtainedMarks: marksheet?.totalMarks ?? null, // This is the sum of all obtained marks
        totalMarks: marksheet?.totalFullMarks ?? null, // This is the sum of all full marks
        status: marksheet ? 'Published' : 'Missing',
        result: marksheet?.result ?? 'Pending',
        rank,
        totalStudents,
        classAverage,
      };
    }));

    const subjectComparison = subjectNames.map((subject) => {
      const stats = examsWithMetrics.map((exam) => {
        const marksheet = marksheetMap.get(String(exam._id));
        if (!marksheet) return null;
        const subjectMark = marksheet.marks.find((item) => item.subject === subject);
        if (!subjectMark) return null;
        
        // Use obtainedMarks from the subject mark (this is the actual marks obtained)
        const totalObtained = subjectMark.obtainedMarks ?? 0;
        const fullMarks = subjectMark.fullMarks ?? 0;
        const percentage = fullMarks ? Number(((totalObtained / fullMarks) * 100).toFixed(1)) : 0;
        
        return {
          raw: totalObtained,
          fullMarks,
          percentage,
          gpa: getGpaFromPercentage(percentage),
          grade: getGradeFromPercentage(percentage),
        };
      });
      const first = stats.find(Boolean);
      const last = [...stats].reverse().find(Boolean);
      const change = first && last ? last.raw - first.raw : null;
      return {
        subject,
        stats,
        change,
        status: getPerformanceStatus(change),
      };
    });

    const averages = examsWithMetrics.map((exam) => ({
      examId: exam._id,
      examName: exam.examName,
      obtainedMarks: exam.obtainedMarks,
      totalMarks: exam.totalMarks,
      average: exam.percentage,
      gpa: exam.gpa,
      grade: exam.finalGrade,
      classAverage: exam.classAverage,
      rank: exam.rank,
      totalStudents: exam.totalStudents,
    }));

    const improvement = examsWithMetrics.length > 1 && examsWithMetrics[0].percentage != null && examsWithMetrics[examsWithMetrics.length - 1].percentage != null
      ? Number((examsWithMetrics[examsWithMetrics.length - 1].percentage - examsWithMetrics[0].percentage).toFixed(1))
      : 0;

    const subjectPerformance = subjectComparison.map((item) => {
      const validStats = item.stats.filter(Boolean);
      const average = validStats.length
        ? Number((validStats.reduce((sum, stat) => sum + stat.percentage, 0) / validStats.length).toFixed(1))
        : null;
      return { subject: item.subject, average, latestPercentage: validStats.length ? validStats[validStats.length - 1].percentage : null };
    });

    const strongSubjects = subjectPerformance.filter((item) => item.average != null && item.average >= 80).map((item) => item.subject);
    const weakSubjects = subjectPerformance.filter((item) => item.average != null && item.average < 60).map((item) => item.subject);
    const stableSubjects = subjectComparison.filter((item) => item.change === 0).map((item) => item.subject);

    const attendance = await calculateAttendance(student);
    const aiSummary = buildAiSummary({ strongSubjects, weakSubjects, improvement, stableSubjects });

    return res.json({
      success: true,
      student,
      exams: examsWithMetrics,
      subjects: subjectComparison,
      summary: {
        averages,
        improvement,
        strongSubjects,
        weakSubjects,
        stableSubjects,
        aiSummary,
      },
      attendance,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to compare evaluation' });
  }
};
