import mongoose, { Schema, models } from "mongoose";

/**
 * Asymmetric follow relationship (LeetCode/Twitter style).
 * `followerEmail` follows `followingEmail`. No accept/reject step.
 */
const FollowsSchema = new Schema(
  {
    followerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    followingEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Each (follower, following) pair can only exist once.
FollowsSchema.index(
  { followerEmail: 1, followingEmail: 1 },
  { unique: true }
);

const Follows = models.Follow || mongoose.model("Follow", FollowsSchema);
export default Follows;
