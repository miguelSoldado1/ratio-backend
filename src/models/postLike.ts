import { Schema, Types, model } from "mongoose";
import config from "../../config";
import type { PostLike } from "./types";

const COLLECTION_NAME = config.NODE_ENV === "production" ? "postlike" : "postlike_dev";

const postLikeSchema = new Schema<PostLike>(
  {
    user_id: { type: String, required: true },
    post_id: { type: Types.ObjectId, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<PostLike>("PostLike", postLikeSchema, COLLECTION_NAME);
