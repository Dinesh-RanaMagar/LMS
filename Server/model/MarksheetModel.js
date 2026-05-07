import mongoose from "mongoose";
import { calculateCreditHourGPA } from "../utils/calculateGPA.js";

const marksheetSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: [true, "Student is required"]
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        required: [true, "Exam is required"]
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicYear"
    },
    marks: [
        {
            _id: false,
            subject: {
                type: String,
                required: true
            },
            theory: {
                type: Number,
                default: 0,
                min: 0
            },
            practical: {
                type: Number,
                default: 0,
                min: 0
            },
            fullMarks: {
                type: Number,
                required: true
            },
            passMarks: {
                type: Number,
                required: true
            },
            creditHour: {
                type: Number,
                default: 0
            },
            obtainedMarks: {
                type: Number,
                default: 0
            },
            percentage: {
                type: Number,
                default: 0
            },
            grade: {
                type: String,
                default: "F"
            },
            gradePoint: {
                type: Number,
                default: 0
            },
            result: {
                type: String,
                enum: ["Pass", "Fail"],
                default: "Fail"
            }
        }
    ],
    totalMarks: {
        type: Number,
        default: 0
    },
    totalFullMarks: {
        type: Number,
        default: 0
    },
    totalCreditHour: {
        type: Number,
        default: 0
    },
    totalWeightedGradePoints: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    gpa: {
        type: Number,
        default: 0
    },
    grade: {
        type: String,
        default: "F"
    },
    result: {
        type: String,
        enum: ["Pass", "Fail"],
        default: "Fail"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

marksheetSchema.index({ student: 1, exam: 1 }, { unique: true });

marksheetSchema.index({ academicYear: 1 });

marksheetSchema.methods.calculateGrade = function() {
    if (this.marks.length === 0) return;

    const calculated = calculateCreditHourGPA(this.marks);

    this.marks = calculated.marks;
    this.totalMarks = calculated.totalMarks;
    this.totalFullMarks = calculated.totalFullMarks;
    this.totalCreditHour = calculated.totalCreditHour;
    this.totalWeightedGradePoints = calculated.totalWeightedGradePoints;
    this.percentage = calculated.percentage;
    this.gpa = calculated.gpa;
    this.grade = calculated.grade;
    this.result = calculated.result;
};

export default mongoose.model("Marksheet", marksheetSchema);