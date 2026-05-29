import mongoose from "mongoose";

const UserThemeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    theme: { type: String, required: true, default: "default" },
  },
  { timestamps: true }
);

export default mongoose.models.UserTheme ||
  mongoose.model("UserTheme", UserThemeSchema);
