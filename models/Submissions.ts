import mongoose, { Schema, models } from "mongoose";

const submissionSchema = new Schema(
  {
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String },
    questionId: { type: String, required: true, index: true },
    questionTitle: { type: String },
    // Plain-text rationale / answer body (existing field).
    answerMarkdown: { type: String, required: true },

    // Scoring + execution metadata (added in A3).
    passed: { type: Boolean, default: false, index: true },
    code: { type: String }, // Source code that was actually run.
    language: {
      type: String,
      enum: ["Javascript", "Python", "Java", "C++"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },
    runtimeMs: { type: Number }, // From Judge0 result.time (seconds → ms when sent).
    memoryKb: { type: Number }, // From Judge0 result.memory.
    points: { type: Number, default: 0 },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

submissionSchema.index({ userEmail: 1, submittedAt: -1 });
submissionSchema.index({ userEmail: 1, questionId: 1, passed: 1 });

// Prevent model overwrite on hot reload.
const Submissions =
  models.Submissions || mongoose.model("Submissions", submissionSchema);
export default Submissions;
