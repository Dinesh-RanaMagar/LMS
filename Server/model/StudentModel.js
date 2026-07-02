import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Student name is required"],
        trim: true
    },
    dob: Date,
    gender: {
        type: String,
        enum: ["Male", "Female", "Other", ""],
        trim: true
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
    // Store each academic year record inside the student model
    academicRecords: [{
        academicYear: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicYear",
            required: true
        },
        className: {
            type: String,
            required: true,
            trim: true
        },
        section: {
            type: String,
            required: true,
            trim: true
        },
        rollNo: {
            type: Number,
            default: null
        },
        status: {
            type: String,
            enum: ["active", "promoted", "left", "retained"],
            default: "active"
        }
    }]
}, { timestamps: true });

// Index for fast searching by year and class within the array
studentSchema.index({ "academicRecords.academicYear": 1, "academicRecords.className": 1, "academicRecords.section": 1 });

export default mongoose.model("Student", studentSchema);
