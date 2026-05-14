import mongoose from "mongoose";

// ─── Subject config inside each class-exam config ───────────────────────────
const subjectConfigSchema = new mongoose.Schema({
    _id: false,
    subjectName:      { type: String, required: true, trim: true },
    fullMarks:        { type: Number, required: true, min: 1 },
    passMarks:        { type: Number, required: true, min: 0 },
    theoryFullMarks:  { type: Number, default: 0 },
    theoryPassMarks:  { type: Number, default: 0 },
    practicalFullMarks: { type: Number, default: 0 },
    practicalPassMarks: { type: Number, default: 0 },
    creditHour:       { type: Number, default: 0, min: 0 },
    hasPractical:     { type: Boolean, default: false },
});

// ─── Per-class configuration ─────────────────────────────────────────────────
const classExamConfigSchema = new mongoose.Schema({
    _id: false,
    className: { type: String, required: true, trim: true },

    // allSubjects | selectedSubjects | customSubjects
    subjectSelectionMode: {
        type: String,
        enum: ["allSubjects", "selectedSubjects", "customSubjects"],
        default: "allSubjects",
    },

    subjects: [subjectConfigSchema],

    // all | selected | failedOnly
    targetStudentsMode: {
        type: String,
        enum: ["all", "selected", "failedOnly"],
        default: "all",
    },

    // Only used when targetStudentsMode = "selected"
    selectedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
});

// ─── Main Exam Schema ─────────────────────────────────────────────────────────
const examSchema = new mongoose.Schema(
    {
        examName: {
            type: String,
            required: [true, "Exam name is required"],
            trim: true,
        },

        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            trim: true,
        },

        // regular | custom | unit-test | practical | re-exam | internal
        examType: {
            type: String,
            enum: ["regular", "custom", "unit-test", "practical", "re-exam", "internal"],
            default: "regular",
        },

        // allClasses | selectedClasses | oneClass
        classSelectionMode: {
            type: String,
            enum: ["allClasses", "selectedClasses", "oneClass"],
            default: "oneClass",
        },

        // List of class names this exam applies to
        applicableClasses: [{ type: String, trim: true }],

        // Per-class subject + student configuration
        classExamConfigs: [classExamConfigSchema],

        startDate: { type: Date },
        endDate:   { type: Date },
        marksEntryLastDate: { type: Date },
        resultPublishDate: { type: Date },
        isResultPublished: { type: Boolean, default: false },
        resultPublishedAt: { type: Date },

        // If true, this exam is used for promotion decisions
        isFinalExam: { type: Boolean, default: false },

        // draft | active | completed | locked
        status: {
            type: String,
            enum: ["draft", "active", "completed", "locked"],
            default: "draft",
        },

        description: { type: String, trim: true },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },
    },
    { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Prevent duplicate exam name within the same academic year
examSchema.index({ examName: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Exam", examSchema);
