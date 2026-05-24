import mongoose, { Schema, models } from "mongoose";

const QuizzesSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    // When the quiz happens (ISO date string in input, Date in DB).
    date: { type: Date, required: true, index: true },
    // Optional URL where users can register or learn more.
    registrationLink: { type: String, default: "" },
    // Created by admin email (audit trail).
    createdByEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

QuizzesSchema.index({ date: 1 });

const Quizzes = models.Quiz || mongoose.model("Quiz", QuizzesSchema);
export default Quizzes;
