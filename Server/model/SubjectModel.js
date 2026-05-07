import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    subjectName: {
        type: String,
        required: [true, "Subject name is required"],
        trim: true,
        unique: true
    },
    code: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
}, { timestamps: true });

export default mongoose.model("Subject", subjectSchema);
