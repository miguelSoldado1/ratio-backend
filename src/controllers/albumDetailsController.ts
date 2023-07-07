import { PipelineStage, Types } from "mongoose";
import SpotifyWebApi from "spotify-web-api-node";
import { postLike, postRating } from "../models";
import { getAlbumDataAndTracks, mapArtistAlbums, handleFilters, setAccessToken, getUser, mapSmallIconUser } from "../scripts";
import { CustomError } from "../customError";
import type { NextFunction, Request, Response } from "express";
import type { PostLike } from "../models/postLike";
import type { UserLike } from "../types";

const DEFAULT_PAGE_SIZE = 6;
const RELATED_RAIL_MAX_SIZE = 10;
const DEFAULT_PAGE_NUMBER = 0;
const ALBUM_TYPE_FILTER = "album";
const POST_LIKES = "likes";

export const getAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albumId = req.query.album_id;
    if (typeof albumId !== "string") {
      throw new CustomError("album id param missing!", 500);
    }

    const spotifyApi = setAccessToken(req);

    const albumResponse = await spotifyApi.getAlbum(albumId);
    if (albumResponse.body.album_type !== ALBUM_TYPE_FILTER) {
      throw new CustomError("not an album!", 404);
    }

    const album = getAlbumDataAndTracks(albumResponse.body);
    return res.status(200).json(album);
  } catch (error) {
    return next(error);
  }
};

export const getCommunityAlbumRating = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { album_id, user_id } = req.query;

    const pageSize = req.query.page_size ? parseInt(req.query.page_size?.toString()) : DEFAULT_PAGE_SIZE;
    const pageNumber = req.query.page_number ? parseInt(req.query.page_number.toString()) : DEFAULT_PAGE_NUMBER;

    let filter = handleFilters(req.query.order?.toString());

    const postRatings = await postRating.aggregate([
      { $match: { album_id: album_id } },
      { $sort: filter },
      { $skip: pageNumber * pageSize },
      { $limit: pageSize },
      {
        $lookup: {
          from: postLike.collection.name,
          localField: "_id",
          foreignField: "post_id",
          as: POST_LIKES,
        },
      },
      {
        $addFields: {
          likes: { $size: `$${POST_LIKES}` },
          liked_by_user: {
            $gt: [{ $size: { $filter: { input: `$${POST_LIKES}`, as: "like", cond: { $eq: ["$$like.user_id", user_id] } } } }, 0],
          },
        },
      },
    ]);
    res.status(200).json({ ratings: postRatings, page: pageNumber });
  } catch (error) {
    return next(error);
  }
};

export const getMyAlbumRating = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { album_id, user_id } = req.query;
    const postRatings = await postRating.findOne({ album_id: album_id, user_id: user_id });
    var rating = null;
    if (postRatings?.rating) {
      rating = postRatings.rating;
    }
    res.status(200).json({ personalRating: rating });
  } catch (error) {
    return next(error);
  }
};

export const getAverageAlbumRating = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let roundedResult = null;
    let numRatings = 0;
    const { album_id } = req.query;
    const postRatings = await postRating.aggregate([
      {
        $match: {
          album_id: album_id,
        },
      },
      {
        $group: {
          _id: 0,
          sum: {
            $sum: 1,
          },
          average: {
            $avg: "$rating",
          },
        },
      },
    ]);
    if (postRatings.length > 0) {
      roundedResult = Math.round(postRatings[0].average * 10) / 10;
      numRatings = postRatings[0].sum;
    }
    res.status(200).json({ averageRating: roundedResult, numRatings: numRatings });
  } catch (error) {
    return next(error);
  }
};

export const getRelatedAlbums = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { artist_id, album_id } = req.query;
    if (typeof album_id !== "string") {
      throw new CustomError("album_id param missing!", 500);
    }

    if (typeof artist_id !== "string") {
      throw new CustomError("album id param missing!", 500);
    }

    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getArtistAlbums(artist_id);
    const result = mapArtistAlbums(data.body.items, album_id, RELATED_RAIL_MAX_SIZE);
    res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getUser(req);
    const userId = data.body.id;
    const newPost = new postRating({ ...req.body, user_id: userId, createdAt: new Date() });
    const rating = await postRating.findOne({ user_id: userId, album_id: newPost.album_id });
    if (rating === null) {
      await newPost.save();
      const ratings = await postRating.find({ album_id: newPost.album_id }).sort({ createdAt: -1, album_id: 1 });
      return res.status(201).json(ratings);
    }
    throw new CustomError("Album already rated!", 409);
  } catch (error) {
    return next(error);
  }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getUser(req);
    const { _id } = req.body;
    const rating = await postRating.findOneAndDelete({ _id: new Types.ObjectId(_id), user_id: data.body.id });
    if (!rating) {
      throw new CustomError("No post with specified values.", 404);
    }
    await postLike.deleteOne({ post_id: new Types.ObjectId(_id) });

    res.status(200).json({ message: "success" });
  } catch (error) {
    return next(error);
  }
};

export const getUsersProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.user_id;
    if (typeof userId !== "string") {
      throw new CustomError("user id param missing!", 500);
    }

    const spotifyApi = setAccessToken(req);

    const userResponse = await spotifyApi.getUser(userId);
    const user = mapSmallIconUser(userResponse.body);

    res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const createLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ratingId = req.body.rating_id;
    const data = await getUser(req);
    const userId = data.body.id;
    const like = await postLike.findOne({ post_id: new Types.ObjectId(ratingId), user_id: userId });
    if (like) throw new CustomError("post already liked", 409);

    const likeData = { post_id: new Types.ObjectId(ratingId), user_id: userId, createdAt: new Date() };
    await new postLike(likeData).save();
    const numberOfLikes = await postLike.countDocuments({ post_id: new Types.ObjectId(ratingId) });

    res.status(200).json({ message: "post liked successfully.", numberOfLikes });
  } catch (error) {
    return next(error);
  }
};

export const deleteLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating_id } = req.body;
    const data = await getUser(req);
    const user_id = data.body.id;
    const like = await postLike.deleteOne({ post_id: new Types.ObjectId(rating_id), user_id: user_id });
    if (like.deletedCount <= 0) throw new CustomError("like not found", 409);
    const numberOfLikes = await postLike.countDocuments({ post_id: new Types.ObjectId(rating_id) });

    res.status(200).json({ message: "post disliked successfully.", numberOfLikes });
  } catch (error) {
    return next(error);
  }
};

export const getPostLikes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { post_id, cursor = undefined } = req.query;
    if (typeof post_id !== "string") {
      throw new CustomError("post id param missing!", 500);
    }

    const pageSize = req.query.page_size ? parseInt(req.query.page_size?.toString()) : DEFAULT_PAGE_SIZE;
    let pipeline: PipelineStage[] = [{ $match: { post_id: new Types.ObjectId(post_id) } }];
    if (cursor) pipeline.push({ $match: { _id: { $lt: new Types.ObjectId(cursor.toString()) } } });

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $limit: pageSize });
    const likes: PostLike[] = await postLike.aggregate(pipeline);

    const postLikes = await getAllUserLikes(likes, req);
    res.status(200).json({
      postLikes: postLikes,
      cursor: postLikes.length === pageSize ? likes[likes.length - 1]._id : null,
      count: await postLike.countDocuments({ post_id: post_id }),
    });
  } catch (error) {
    return next(error);
  }
};

const getAllUserLikes = async (userLikes: PostLike[], req: Request) => {
  const spotifyApi = setAccessToken(req);
  try {
    const userDataPromises = userLikes.map((postLike) => getSingleUserLike(spotifyApi, postLike));
    const userData = await Promise.all(userDataPromises);
    return userData;
  } catch (error) {
    throw new CustomError("Failed to retrieve user likes", 500);
  }
};

const getSingleUserLike = async (spotifyApi: SpotifyWebApi, postLike: PostLike): Promise<UserLike> => {
  try {
    const { body: user } = await spotifyApi.getUser(postLike.user_id);

    return {
      id: user?.id ?? "",
      displayName: user?.display_name ?? "",
      imageUrl: user?.images?.[0]?.url ?? null,
      like_id: postLike._id,
      createdAt: postLike.createdAt,
    };
  } catch (error) {
    return getUserError(postLike);
  }
};

const getUserError = (postLike: PostLike): UserLike => ({
  id: "",
  displayName: "User not found",
  imageUrl: null,
  like_id: postLike._id,
  createdAt: postLike.createdAt,
});
