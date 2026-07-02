import mongoose from "mongoose";

/**
 * StudentEnrollment — one record per student per academic year.
 *
 * A student gets one enrollment on admission, and a new one each time they
 * are promoted. The Student document only holds personal/biographical data
 * and is never duplicated.
 */
const studentEnrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    academicYear: {
      // stored as the yearName string, e.g. "2025"
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
    },
    rollNo: {
      type: Number,
      default: null,
    },
    // active | promoted | retained | left
    status: {
      type: String,
      enum: ["active", "promoted", "retained", "left"],
      default: "active",
    },
    promotedToAcademicYear: { type: String, trim: true, default: null },
    promotedToClass:        { type: String, trim: true, default: null },
    remarks:                { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// One enrollment per student per academic year
studentEnrollmentSchema.index({ student: 1, academicYear: 1 }, { unique: true });

// Fast class/year lookups
studentEnrollmentSchema.index({ academicYear: 1, className: 1, section: 1 });

// Unique roll number within a class-section-year (sparse so null is allowed)
studentEnrollmentSchema.index(
  { academicYear: 1, className: 1, section: 1, rollNo: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("StudentEnrollment", studentEnrollmentSchema);
