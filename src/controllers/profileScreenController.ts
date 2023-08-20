import SpotifyWebApi from "spotify-web-api-node";
import { Types } from "mongoose";
import { follow, postLike, postRating } from "../models";
import { infinitePagination } from "../pagination";
import { getCurrentUser, handleFiltersNew, mapAlbum, mapLargeIconUser, mapSmallIconUser, setAccessToken } from "../scripts";
import { BadRequest, Conflict } from "../errors";
import type { NextFunction, Request, Response } from "express";
import type { Post } from "../types";
import type { InfinitePaginationParams } from "../pagination/types";
import type { Follow, PostRating } from "../models/types";

const DEFAULT_PAGE_SIZE = 8;
const POST_LIKES = "likes";

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.query.user_id;

    if (typeof user_id !== "string") {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const userResponse = await spotifyApi.getUser(user_id);
    res.status(200).json(mapLargeIconUser(userResponse.body));
  } catch (error) {
    return next(error);
  }
};

export const getUserRatings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, next = undefined, filter } = req.query;
    if (typeof user_id !== "string" || (typeof next !== "string" && typeof next !== "undefined") || typeof filter !== "string")
      throw new BadRequest();

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();
    const userId = user.body.id;

    let filterParams = handleFiltersNew(filter);

    const paginationParams: InfinitePaginationParams<PostRating> = {
      next: next && Types.ObjectId.isValid(next) ? new Types.ObjectId(next) : null,
      limit: DEFAULT_PAGE_SIZE,
      match: { user_id: user_id },
      query: [
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
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: `$${POST_LIKES}`,
                      as: "like",
                      cond: { $eq: ["$$like.user_id", userId] },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
      ],
      ...filterParams,
    };

    const result = await infinitePagination<PostRating>(paginationParams, postRating);
    const data = await handleAlbumsSpotifyCalls(result.results, spotifyApi);

    res.status(200).json({ data: data, next: result.next });
  } catch (error) {
    return next(error);
  }
};

export const followUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { following_id } = req.query;
    const data = await getCurrentUser(req);
    const userId = data.body.id;
    if (following_id === userId) throw new Conflict("You can't follow yourself.");
    const following = await follow.findOne({ follower_id: userId, following_id: following_id });
    if (following) throw new Conflict("This user is already being followed.");
    await follow.create({ follower_id: userId, following_id: following_id, createdAt: new Date() });

    res.status(200).json({ message: "User unfollowed successfully.", isFollowing: true });
  } catch (error) {
    return next(error);
  }
};

export const unfollowUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { following_id } = req.query;
    const data = await getCurrentUser(req);
    const userId = data.body.id;
    const following = await follow.deleteOne({ follower_id: userId, following_id: following_id });
    if (following.deletedCount <= 0) throw new Conflict("This user is already not being followed.");

    res.status(200).json({ message: "User unfollowed successfully.", isFollowing: false });
  } catch (error) {
    return next(error);
  }
};

export const getFollowingInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { following_id: user_id } = req.query;
    const data = await getCurrentUser(req);
    const follower_id = data.body.id;
    const following = await follow.exists({ follower_id, following_id: user_id });
    const numberOfFollowers = await follow.countDocuments({ following_id: user_id });
    const numberOfFollowing = await follow.countDocuments({ follower_id: user_id });
    const numberOfPosts = await postRating.countDocuments({ user_id: user_id });

    res.status(200).json({ isFollowing: !!following, followers: numberOfFollowers, following: numberOfFollowing, numberOfPosts: numberOfPosts });
  } catch (error) {
    return next(error);
  }
};

export const getUserFollowers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, next = undefined } = req.query;
    if (typeof user_id !== "string" || (typeof next !== "string" && typeof next !== "undefined")) {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();
    const userId = user.body.id;

    const paginationParams: InfinitePaginationParams<Follow> = {
      next: next && Types.ObjectId.isValid(next) ? new Types.ObjectId(next) : null,
      limit: DEFAULT_PAGE_SIZE,
      match: {
        following_id: user_id,
        ...(next && {
          // Need to ignore the userId here because we are returning it as the first element whenever it exists
          user_id: {
            $ne: userId,
          },
        }),
      },
      query: [
        {
          $lookup: {
            from: follow.collection.name,
            let: { userId: "$follower_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$following_id", "$$userId"] }, { $eq: ["$follower_id", userId] }],
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
            // if the user is a follower we want to return it at the top of the list.
            priority: {
              $cond: {
                if: !next,
                then: { $eq: ["$follower_id", userId] },
                else: false,
              },
            },
          },
        },
        {
          $sort: {
            priority: -1,
          },
        },
      ],
    };

    const result = await infinitePagination<Follow>(paginationParams, follow);
    const users = await Promise.all(
      result.results.map(async ({ priority, follower_id, ...follow }) => {
        const user = await spotifyApi.getUser(follower_id);
        return {
          profile: mapSmallIconUser(user.body),
          ...follow,
        };
      })
    );

    res.status(200).json({ users: users, next: result.next });
  } catch (error) {
    return next(error);
  }
};

export const getUserFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, next = undefined } = req.query;
    if (typeof user_id !== "string" || (typeof next !== "string" && typeof next !== "undefined")) {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();
    const userId = user.body.id;

    const paginationParams: InfinitePaginationParams<Follow> = {
      next: next && Types.ObjectId.isValid(next) ? new Types.ObjectId(next) : null,
      limit: DEFAULT_PAGE_SIZE,
      match: {
        follower_id: user_id,
        ...(next && {
          // Need to ignore the userId here because we are returning it as the first element whenever it exists
          user_id: {
            $ne: userId,
          },
        }),
      },
      query: [
        {
          $lookup: {
            from: follow.collection.name,
            let: { userId: "$following_id" },
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
            // if the user is being followed we want to return it at the top of the list.
            priority: {
              $cond: {
                if: !next,
                then: { $eq: ["$following_id", userId] },
                else: false,
              },
            },
          },
        },
      ],
    };

    const result = await infinitePagination<Follow>(paginationParams, follow);
    const users = await Promise.all(
      result.results.map(async ({ priority, following_id, ...follow }) => {
        const user = await spotifyApi.getUser(following_id);
        return {
          profile: mapSmallIconUser(user.body),
          ...follow,
        };
      })
    );

    res.status(200).json({ users: users, next: result.next });
  } catch (error) {
    return next(error);
  }
};

const handleAlbumsSpotifyCalls = async (posts: Post[], spotifyApi: SpotifyWebApi) => {
  const albumDataPromises = posts.map((post) => spotifyApi.getAlbum(post.album_id));

  const albumResults = await Promise.all(albumDataPromises);
  return posts.map((post, index) => {
    const albumInfo = mapAlbum(albumResults[index].body);

    return { ...post, album: albumInfo };
  });
};
