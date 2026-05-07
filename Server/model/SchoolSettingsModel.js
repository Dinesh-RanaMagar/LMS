import mongoose from "mongoose";

const schoolSettingsSchema = new mongoose.Schema({
  schoolName: { type: String, default: "School Name", trim: true },
  schoolCode: { type: String, trim: true },
  logoUrl: { type: String, trim: true },
  headTeacherSignatureUrl: { type: String, trim: true },
  address: { type: String, trim: true },
  municipality: { type: String, trim: true },
  district: { type: String, trim: true },
  province: { type: String, trim: true },
  phone: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
  email: { type: String, trim: true },
  website: { type: String, trim: true },
  principalName: { type: String, trim: true },
  headTeacherName: { type: String, trim: true },
  establishedYear: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  slogan: { type: String, trim: true },
  gradingSystem: [{
    _id: false,
    minPercentage: Number,
    grade: String,
    gpa: Number,
  }],
  marksheetTemplate: { type: String, default: "default" },
}, { timestamps: true });

export default mongoose.model("SchoolSettings", schoolSettingsSchema);
