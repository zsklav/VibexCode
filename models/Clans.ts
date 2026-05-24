import mongoose, { Schema, models } from "mongoose";

const ClansSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    tag: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 4,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

ClansSchema.index({ name: 1 });

const Clans = models.Clan || mongoose.model("Clan", ClansSchema);
export default Clans;
