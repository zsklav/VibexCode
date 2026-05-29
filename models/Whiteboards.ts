import mongoose from "mongoose";

const WhiteboardElementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    tool: { type: String },
    points: { type: [[Number]], default: [] },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    text: { type: String, default: "" },
    color: { type: String, default: "#111827" },
    strokeWidth: { type: Number, default: 3 },
    fontSize: { type: Number, default: 18 },
  },
  { _id: false }
);

const WhiteboardVersionSchema = new mongoose.Schema(
  {
    elements: { type: [WhiteboardElementSchema], default: [] },
    savedBy: { type: String },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WhiteboardSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    elements: { type: [WhiteboardElementSchema], default: [] },
    participants: { type: [String], default: [] },
    history: { type: [WhiteboardVersionSchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Whiteboard ||
  mongoose.model("Whiteboard", WhiteboardSchema);
