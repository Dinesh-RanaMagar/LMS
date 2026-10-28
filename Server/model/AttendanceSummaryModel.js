import mongoose from "mongoose";

const attendanceSummaryRecordSchema = new mongoose.Schema({
  person: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Student",
  },
  presentDays: { type: Number, required: true, min: 0 },
  absentDays: { type: Number, required: true, min: 0 },
  remarks: { type: String, trim: true, default: "" },
}, { _id: false });

const attendanceSummarySchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
  },
  className: { type: String, required: true, trim: true },
  section: { type: String, trim: true, default: "" },
  fromDate: { type: String, required: true, trim: true },
  toDate: { type: String, required: true, trim: true },
  workingDays: { type: Number, required: true, min: 1 },
  records: { type: [attendanceSummaryRecordSchema], default: [] },
}, { timestamps: true });

attendanceSummarySchema.index(
  { exam: 1, className: 1, section: 1, fromDate: 1, toDate: 1 },
  { unique: true }
);

export default mongoose.model("AttendanceSummary", attendanceSummarySchema);
