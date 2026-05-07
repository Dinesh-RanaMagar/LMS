import mongoose from 'mongoose';

const marksheetSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required'],
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required'],
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'Academic year is required'],
  },
  marks: [
    {
      _id: false,
      subject: {
        type: String,
        required: true,
      },
      theoryMarks: {
        type: Number,
        default: 0,
        min: 0,
      },
      practicalMarks: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalMarks: {
        type: Number,
        default: 0,
      },
      fullMarks: {
        type: Number,
        required: true,
      },
      passMarks: {
        type: Number,
        required: true,
      },
      grade: {
        type: String,
      },
      gradePoint: {
        type: Number,
      },
      remarks: {
        type: String,
        trim: true,
      },
    },
  ],
  totalMarks: {
    type: Number,
    default: 0,
  },
  obtainedMarks: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  gpa: {
    type: Number,
    default: 0,
  },
  finalGrade: {
    type: String,
    default: 'F',
  },
  result: {
    type: String,
    enum: ['Pass', 'Fail'],
    default: 'Fail',
  },
}, {
  timestamps: true,
});

marksheetSchema.index({ student: 1, exam: 1 }, { unique: true });

marksheetSchema.methods.calculateGrade = function () {
  if (this.marks.length === 0) return;

  let totalMarks = 0;
  let obtainedMarks = 0;
  let passCount = 0;

  this.marks.forEach((mark) => {
    const total = mark.theoryMarks + mark.practicalMarks;
    mark.totalMarks = total;
    obtainedMarks += total;
    totalMarks += mark.fullMarks;

    if (total >= mark.passMarks) {
      passCount++;
    }

    const subjectPercentage = (total / mark.fullMarks) * 100;
    if (subjectPercentage >= 90) {
      mark.grade = 'A+';
      mark.gradePoint = 4.0;
    } else if (subjectPercentage >= 80) {
      mark.grade = 'A';
      mark.gradePoint = 3.6;
    } else if (subjectPercentage >= 70) {
      mark.grade = 'B+';
      mark.gradePoint = 3.2;
    } else if (subjectPercentage >= 60) {
      mark.grade = 'B';
      mark.gradePoint = 2.8;
    } else if (subjectPercentage >= 50) {
      mark.grade = 'C';
      mark.gradePoint = 2.4;
    } else if (subjectPercentage >= 40) {
      mark.grade = 'D';
      mark.gradePoint = 2.0;
    } else {
      mark.grade = 'F';
      mark.gradePoint = 0.0;
    }
  });

  this.totalMarks = totalMarks;
  this.obtainedMarks = obtainedMarks;
  this.percentage = (obtainedMarks / totalMarks) * 100;

  this.gpa = (this.percentage / 100) * 4;

  if (this.percentage >= 90) this.finalGrade = 'A+';
  else if (this.percentage >= 80) this.finalGrade = 'A';
  else if (this.percentage >= 70) this.finalGrade = 'B+';
  else if (this.percentage >= 60) this.finalGrade = 'B';
  else if (this.percentage >= 50) this.finalGrade = 'C';
  else if (this.percentage >= 40) this.finalGrade = 'D';
  else this.finalGrade = 'F';

  this.result = passCount === this.marks.length ? 'Pass' : 'Fail';
};

const Marksheet = mongoose.model('Marksheet', marksheetSchema);
export default Marksheet;
