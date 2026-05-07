import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: [true, 'Please add subject name'],
    trim: true,
  },
  className: {
    type: String,
    required: [true, 'Please add class name'],
    trim: true,
  },
  fullMarks: {
    type: Number,
    required: [true, 'Please add full marks'],
    default: 100,
  },
  passMarks: {
    type: Number,
    required: [true, 'Please add pass marks'],
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
}, {
  timestamps: true,
});

subjectSchema.index({ subjectName: 1, className: 1, section: 1 }, { unique: true, partialFilterExpression: { subjectName: { $exists: true }, className: { $exists: true } } });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
