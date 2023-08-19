import { Schema, model } from "mongoose";
import config from "../../config";
import type { PostRating } from "./types";

const COLLECTION_NAME = config.NODE_ENV === "production" ? "postratings" : "postratings_dev";

const postRatingSchema = new Schema<PostRating>(
  {
    user_id: { type: String, required: true },
    album_id: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default model<PostRating>("PostRating", postRatingSchema, COLLECTION_NAME);
