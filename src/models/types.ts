import { Schema } from "mongoose";

export type PostLike = {
  _id: Schema.Types.ObjectId;
  user_id: string;
  post_id: Schema.Types.ObjectId;
  createdAt: Date;
};

export type Follow = {
  _id: Schema.Types.ObjectId;
  follower_id: string;
  following_id: string;
  createdAt: Date;
};

export type PostRating = {
  _id: Schema.Types.ObjectId;
  user_id: string;
  album_id: string;
  rating: number;
  comment: string;
  createdAt: Date;
};
