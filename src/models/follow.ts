import { Schema, model } from "mongoose";
import config from "../../config";
import type { Follow } from "./types";

const COLLECTION_NAME = config.NODE_ENV === "production" ? "follow" : "follow_dev";

const followSchema: Schema = new Schema<Follow>(
  {
    follower_id: { type: String, required: true },
    following_id: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<Follow>("Follow", followSchema, COLLECTION_NAME);
