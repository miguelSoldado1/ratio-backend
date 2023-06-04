import mongoose from "mongoose";

const COLLECTION_NAME = process.env.NODE_ENV === "production" ? "follow" : "follow_dev";

const postSchema = mongoose.Schema(
  {
    follower_id: { type: String, required: true },
    following_id: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default mongoose.model("Follow", postSchema, COLLECTION_NAME);
