import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema({
  yearName: {
    type: String,
    required: [true, 'Please add year name'],
    unique: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Please add start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'Please add end date'],
  },
  isActive: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

academicYearSchema.pre('save', async function () {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
  }
});

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);
export default AcademicYear;
