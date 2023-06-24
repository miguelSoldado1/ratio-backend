import { Schema, Types, model } from "mongoose";

const COLLECTION_NAME = process.env.NODE_ENV === "production" ? "postlike" : "postlike_dev";

type PostLike = {
  _id: Schema.Types.ObjectId;
  user_id: string;
  post_id: Schema.Types.ObjectId;
  createdAt: Date;
};

const postLikeSchema = new Schema<PostLike>(
  {
    user_id: { type: String, required: true },
    post_id: { type: Types.ObjectId, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<PostLike>("PostLike", postLikeSchema, COLLECTION_NAME);
