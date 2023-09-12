import { Schema, model } from "mongoose";
import type { Follow } from "./types";

const followSchema: Schema = new Schema<Follow>(
  {
    follower_id: { type: String, required: true },
    following_id: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<Follow>("Follow", followSchema, "follow");
