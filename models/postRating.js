import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const COLLECTION_NAME = process.env.COLLECTION_NAME;

const postSchema = mongoose.Schema(
  {
    user_id: { type: String, required: true },
    album_id: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: String,
    createdAt: {
      type: Date,
      default: new Date(),
    },
    likes: [],
  },
  {
    versionKey: false,
  }
);

const postRating = COLLECTION_NAME != undefined ? mongoose.model("PostRating", postSchema, COLLECTION_NAME) : mongoose.model("PostRating", postSchema);

export default postRating;
