import { Schema, model } from "mongoose";
import config from "../../config";

const COLLECTION_NAME = config.NODE_ENV === "production" ? "follow" : "follow_dev";

type Post = {
  _id: Schema.Types.ObjectId;
  follower_id: string;
  following_id: string;
  createdAt: Date;
};

const postSchema: Schema = new Schema<Post>(
  {
    follower_id: { type: String, required: true },
    following_id: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<Post>("Follow", postSchema, COLLECTION_NAME);
