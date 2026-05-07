import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
  address: { type: String, trim: true },
  qualification: { type: String, trim: true },
  assignedClasses: [{ type: String, trim: true }],
  assignedSubjects: [{ type: String, trim: true }],
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

export default mongoose.model("Teacher", teacherSchema);
