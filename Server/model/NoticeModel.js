import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  audience: { type: String, enum: ["all", "students", "teachers", "parents"], default: "all" },
  isPinned: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  publishDate: { type: Date, default: Date.now },
  attachmentUrl: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model("Notice", noticeSchema);
