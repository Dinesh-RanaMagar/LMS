import mongoose from 'mongoose';

const promotionHistorySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  fromAcademicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true,
  },
  toAcademicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true,
  },
  fromClass: {
    type: String,
    required: true,
  },
  toClass: {
    type: String,
    required: true,
  },
  resultStatus: {
    type: String,
    enum: ['promoted', 'retained'],
    required: true,
  },
  promotedDate: {
    type: Date,
    default: Date.now,
  },
  remarks: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

const PromotionHistory = mongoose.model('PromotionHistory', promotionHistorySchema);
export default PromotionHistory;
