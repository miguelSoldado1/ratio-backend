import { Schema, Types, model } from "mongoose";
import type { PostLike } from "./types";

const postLikeSchema = new Schema<PostLike>(
  {
    user_id: { type: String, required: true },
    post_id: { type: Types.ObjectId, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<PostLike>("PostLike", postLikeSchema, "postlike");
