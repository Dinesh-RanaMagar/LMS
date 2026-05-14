import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      unique: true,
    },
    sections: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    periods: [
      {
        periodName: {
          type: String,
          trim: true,
          default: '',
        },
        subject: {
          type: String,
          trim: true,
          default: '',
        },
        teacher: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Class", classSchema);
