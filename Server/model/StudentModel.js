import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Student name is required"],
        trim: true
    },
    className: {
        type: String,
        required: [true, "Class is required"]
    },
    section: {
        type: String,
        required: [true, "Section is required"]
    },
    rollNo: {
        type: Number
    },
    emisCode: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    studentCode: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    symbolNo: {
        type: String,
        unique: true,
        sparse: true
    },
    dob: Date,
    gender: {
        type: String,
        enum: ["Male", "Female", "Other", ""],
        trim: true
    },
    fatherName: {
        type: String,
        trim: true
    },
    motherName: {
        type: String,
        trim: true
    },
    guardianName: {
        type: String,
        trim: true
    },
    mobileNumber: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    academicYear: {
        type: String,
        required: [true, "Academic year is required"],
        trim: true
    },
    isPromoted: {
        type: Boolean,
        default: false
    },
    promotedTo: {
        type: String,
        trim: true
    },
    promotionDate: Date,
    status: {
        type: String,
        enum: ["active", "promoted", "left"],
        default: "active"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Create compound unique index for className, section, and rollNo within academic year
studentSchema.index({ academicYear: 1, className: 1, section: 1, rollNo: 1 }, { unique: true });

export default mongoose.model("Student", studentSchema);