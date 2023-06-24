import { Schema, model } from "mongoose";

const COLLECTION_NAME = process.env.NODE_ENV === "production" ? "postratings" : "postratings_dev";

type PostRating = {
  _id: Schema.Types.ObjectId;
  user_id: string;
  album_id: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

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
