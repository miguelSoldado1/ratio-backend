import mongoose from "mongoose";

const COLLECTION_NAME = process.env.NODE_ENV === "production" ? "postlike" : "postlike_dev";

const postLikeSchema = mongoose.Schema(
  {
    user_id: { type: String, required: true },
    post_id: { type: mongoose.Types.ObjectId, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default mongoose.model("PostLike", postLikeSchema, COLLECTION_NAME);
