import mongoose from 'mongoose';

const classSubjectSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      unique: true,
    },
    subjects: [
      {
        subject: {
          type: String,
          trim: true,
          default: '',
        },
        subjectName: {
          type: String,
          trim: true,
          default: '',
        },
        fullMarks: {
          type: Number,
          default: 100,
        },
        passMarks: {
          type: Number,
          default: 40,
        },
        theoryFullMarks: {
          type: Number,
          default: 100,
        },
        practicalFullMarks: {
          type: Number,
          default: 0,
        },
        hasPractical: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('ClassSubject', classSubjectSchema);
