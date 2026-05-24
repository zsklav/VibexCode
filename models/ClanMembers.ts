import mongoose, { Schema, models } from "mongoose";

const ClanMembersSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    clanId: {
      type: Schema.Types.ObjectId,
      ref: "Clan",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const ClanMembers =
  models.ClanMember || mongoose.model("ClanMember", ClanMembersSchema);
export default ClanMembers;
