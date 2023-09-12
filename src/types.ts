import type { PostLike, PostRating } from "./models/types";

export type Album = {
  name: string;
  album_uri: string;
  artist: JointArtist[];
  artist_id: string;
  id: string;
  release_date: string;
  image: string | null;
  release_date_precision: "year" | "month" | "day";
  tracks?: Track[];
};

export type User = {
  id: string;
  displayName: string;
  imageUrl: string | null;
};

export type Track = {
  id: string;
  name: string;
  trackNumber: number;
  artists: JointArtist[];
  track_url: string;
  duration_ms: number;
  explicit: boolean;
};

export type JointArtist = {
  name: string;
  uri: string;
  id: string;
};

export type Filter = {
  createdAt?: -1 | 1;
  album_id?: -1 | 1;
  rating?: -1 | 1;
};

export interface Post extends PostRating {
  likes: number;
  liked_by_user: boolean;
}

export interface FeedPost extends Post {
  user: User;
  album: Album;
}

export interface LikeAggregationResult extends PostLike {
  isFollowing: boolean;
  priority: boolean;
}

export enum FilterString {
  top_rated = "top_rated",
  oldest = "oldest",
  latest = "latest",
}
