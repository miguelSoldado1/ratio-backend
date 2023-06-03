import mongoose from "mongoose";

const COLLECTION_NAME = process.env.NODE_ENV === "production" ? "postratings" : "postratings_dev";

const postSchema = mongoose.Schema(
  {
    user_id: { type: String, required: true },
    album_id: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: String,
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

export default mongoose.model("PostRating", postSchema, COLLECTION_NAME);
