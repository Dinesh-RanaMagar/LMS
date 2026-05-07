import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true,
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'Academic year is required'],
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
  },
  year: {
    type: String,
    required: [true, 'Year is required'],
  },
  subjects: [
    {
      _id: false,
      subjectName: {
        type: String,
        required: true,
      },
      fullMarks: {
        type: Number,
        default: 100,
      },
      passMarks: {
        type: Number,
        default: 40,
      },
      hasPractical: {
        type: Boolean,
        default: false,
      },
      theoryFullMarks: {
        type: Number,
        default: 75,
      },
      practicalFullMarks: {
        type: Number,
        default: 25,
      },
    },
  ],
  isFinalExam: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

examSchema.index({ examName: 1, academicYear: 1, className: 1 }, { unique: true });

const Exam = mongoose.model('Exam', examSchema);
export default Exam;
