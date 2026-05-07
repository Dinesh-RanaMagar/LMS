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
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Create compound unique index for className and rollNo within academic year
studentSchema.index({ className: 1, rollNo: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Student", studentSchema);