import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const postLikeSchema = mongoose.Schema(
  {
    user_id: { type: String, required: true },
    post_id: { type: mongoose.Types.ObjectId, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

const postLike =
  process.env.NODE_ENV === "production"
    ? mongoose.model("PostLike", postLikeSchema, "postlike")
    : mongoose.model("PostLike", postLikeSchema, "postlike_dev");

export default postLike;
