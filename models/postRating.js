import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

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

const postRating =
  process.env.NODE_ENV === "production"
    ? mongoose.model("PostRating", postSchema, "postratings")
    : mongoose.model("PostRating", postSchema, "postratings");

export default postRating;
