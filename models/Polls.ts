import mongoose from "mongoose";

const PollOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const PollVoteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    optionIds: { type: [String], default: [] },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PollTimelineSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    totalVotes: { type: Number, default: 0 },
  },
  { _id: false }
);

const PollSchema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    messageId: { type: String, index: true },
    question: { type: String, required: true },
    options: { type: [PollOptionSchema], default: [] },
    votes: { type: [PollVoteSchema], default: [] },
    creatorId: { type: String, required: true },
    creatorName: { type: String },
    multipleChoice: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    allowVoteChanges: { type: Boolean, default: true },
    expiresAt: { type: Date },
    timeline: { type: [PollTimelineSchema], default: [] },
  },
  { timestamps: true }
);

export const Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);

export default Poll;
