import mongoose from "mongoose";

const academicYearSchema = new mongoose.Schema(
  {
    yearName: {
      type: String,
      required: [true, "Year name is required"],
      unique: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

academicYearSchema.pre("save", async function () {
  if (this.isActive) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
  }
});

export default mongoose.model("AcademicYear", academicYearSchema);
