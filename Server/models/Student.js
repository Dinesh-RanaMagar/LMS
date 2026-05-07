import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
  },
  className: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
  },
  rollNo: {
    type: Number,
    required: [true, 'Roll number is required'],
  },
  symbolNo: {
    type: String,
    unique: true,
    sparse: true,
  },
  dob: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  fatherName: {
    type: String,
    trim: true,
  },
  motherName: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'Academic year is required'],
  },
  status: {
    type: String,
    enum: ['active', 'promoted', 'left'],
    default: 'active',
  },
}, {
  timestamps: true,
});

studentSchema.index({ academicYear: 1, className: 1, rollNo: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);
export default Student;
