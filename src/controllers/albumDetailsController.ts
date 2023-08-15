import { PipelineStage, Types } from "mongoose";
import { follow, postLike, postRating } from "../models";
import { getAlbumDataAndTracks, mapArtistAlbums, handleFilters, setAccessToken, getCurrentUser, mapSmallIconUser } from "../scripts";
import { BadRequest, Conflict, NotFound } from "../errors";
import type { NextFunction, Request, Response } from "express";
import type { LikeAggregationResult } from "../types";
import SpotifyWebApi from "spotify-web-api-node";

const DEFAULT_PAGE_SIZE = 8;
const RELATED_RAIL_MAX_SIZE = 10;
const DEFAULT_PAGE_NUMBER = 0;
const ALBUM_TYPE_FILTER = "album";
const POST_LIKES = "likes";

export const getAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const albumId = req.query.album_id;
    if (typeof albumId !== "string") {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const albumResponse = await spotifyApi.getAlbum(albumId);

    if (albumResponse.body.album_type !== ALBUM_TYPE_FILTER) {
      throw new NotFound();
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

    const pageSize = req.query.page_size ? parseInt(req.query.page_size?.toString()) : 6;
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
    const postRatings = await postRating.findOne({ album_id, user_id });
    const rating = postRatings?.rating || null;

    res.status(200).json({ personalRating: rating });
  } catch (error) {
    next(error);
  }
};

export const getAverageAlbumRating = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let roundedResult = null;
    let numRatings = 0;
    const { album_id } = req.query;

    const pipelineStage: PipelineStage[] = [
      { $match: { album_id: album_id } },
      { $group: { _id: 0, sum: { $sum: 1 }, average: { $avg: "$rating" } } },
    ];

    const postRatings = await postRating.aggregate(pipelineStage);
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
    if (typeof album_id !== "string" || typeof artist_id !== "string") {
      throw new BadRequest();
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
    const data = await getCurrentUser(req);
    const userId = data.body.id;
    const rating = await postRating.findOne({ user_id: userId, album_id: req.body.album_id });
    if (rating === null) {
      await postRating.create({ ...req.body, user_id: userId, createdAt: new Date() });
      const ratings = await postRating.find({ album_id: req.body.album_id }).sort({ createdAt: -1, album_id: 1 });
      return res.status(201).json(ratings);
    }
    throw new Conflict("This album has already been rated by the user.");
  } catch (error) {
    return next(error);
  }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCurrentUser(req);
    const { _id } = req.body;
    const rating = await postRating.findOneAndDelete({ _id: new Types.ObjectId(_id), user_id: data.body.id });
    if (!rating) {
      throw new NotFound();
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
      throw new BadRequest();
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
    const data = await getCurrentUser(req);
    const userId = data.body.id;
    const like = await postLike.findOne({ post_id: new Types.ObjectId(ratingId), user_id: userId });
    if (like) throw new Conflict("This post has already been liked by the user.");

    await postLike.create({ post_id: new Types.ObjectId(ratingId), user_id: userId, createdAt: new Date() });
    const numberOfLikes = await postLike.countDocuments({ post_id: new Types.ObjectId(ratingId) });

    res.status(200).json({ message: "post liked successfully.", numberOfLikes });
  } catch (error) {
    return next(error);
  }
};

export const deleteLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating_id } = req.body;
    const data = await getCurrentUser(req);
    const user_id = data.body.id;
    const like = await postLike.deleteOne({ post_id: new Types.ObjectId(rating_id), user_id: user_id });
    if (like.deletedCount <= 0) throw new NotFound();
    const numberOfLikes = await postLike.countDocuments({ post_id: new Types.ObjectId(rating_id) });

    res.status(200).json({ message: "post disliked successfully.", numberOfLikes });
  } catch (error) {
    return next(error);
  }
};

export const getPostLikes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { post_id, cursor = undefined } = req.query;
    if (typeof post_id !== "string" || (typeof cursor !== "string" && typeof cursor !== "undefined")) {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();
    const userId = user.body.id;

    const pipelineStage: PipelineStage[] = [
      {
        $match: {
          post_id: new Types.ObjectId(post_id),
          ...(cursor &&
            Types.ObjectId.isValid(cursor) && {
              _id: {
                $lt: new Types.ObjectId(cursor),
              },
              // Need to ignore the userId because we are returning it as the first element whenever it exists
              user_id: {
                $ne: userId,
              },
            }),
        },
      },
      {
        $lookup: {
          from: follow.collection.name,
          let: { userId: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$follower_id", userId] }, { $eq: ["$following_id", "$$userId"] }],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: "isFollowing",
        },
      },
      {
        $addFields: {
          isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] },
          priority: {
            $cond: {
              if: !cursor,
              then: { $eq: ["$user_id", userId] },
              else: false,
            },
          },
        },
      },
      { $sort: { priority: -1, _id: -1 } },
      { $limit: DEFAULT_PAGE_SIZE },
    ];

    const likes: LikeAggregationResult[] = await postLike.aggregate(pipelineStage);
    const result = await Promise.all(likes.map(async (postLike) => await handleLikesGetUser(postLike, spotifyApi)));

    res.status(200).json({ users: result, cursor: result.length === DEFAULT_PAGE_SIZE ? likes[likes.length - 1]._id : null });
  } catch (error) {
    return next(error);
  }
};

const handleLikesGetUser = async (postLike: LikeAggregationResult, spotifyApi: SpotifyWebApi) => {
  try {
    const user = await spotifyApi.getUser(postLike.user_id);
    return {
      profile: mapSmallIconUser(user.body),
      isFollowing: postLike.isFollowing,
      _id: postLike._id,
      createdAt: postLike.createdAt,
    };
  } catch (e) {
    return {
      profile: { id: "", displayName: "User not found", imageUrl: null },
      isFollowing: postLike.isFollowing,
      _id: postLike._id,
      createdAt: postLike.createdAt,
    };
  }
};
