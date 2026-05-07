import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  _id: false,
  person: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "records.personModel" },
  personModel: { type: String, required: true, enum: ["Student", "Teacher"] },
  status: { type: String, enum: ["present", "absent", "late", "leave"], default: "present" },
  remarks: { type: String, trim: true },
});

const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  type: { type: String, enum: ["student", "teacher"], default: "student" },
  className: { type: String, trim: true },
  section: { type: String, trim: true },
  records: [attendanceRecordSchema],
}, { timestamps: true });

attendanceSchema.index({ date: 1, type: 1, className: 1, section: 1 });

export default mongoose.model("Attendance", attendanceSchema);
