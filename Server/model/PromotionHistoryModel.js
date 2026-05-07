import mongoose from "mongoose";

const promotionHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    fromAcademicYear: {
      type: String,
      required: true,
      trim: true,
    },
    toAcademicYear: {
      type: String,
      required: true,
      trim: true,
    },
    fromClass: {
      type: String,
      required: true,
      trim: true,
    },
    toClass: {
      type: String,
      required: true,
      trim: true,
    },
    resultStatus: {
      type: String,
      enum: ["promoted", "retained"],
      required: true,
    },
    promotedDate: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PromotionHistory", promotionHistorySchema);
