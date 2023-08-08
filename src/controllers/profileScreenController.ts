import type { NextFunction, Request, Response } from "express";
import SpotifyWebApi from "spotify-web-api-node";
import { PipelineStage, Types } from "mongoose";
import { follow, postLike, postRating } from "../models";
import { getCurrentUser, mapAlbum, mapLargeIconUser, mapSmallIconUser, setAccessToken } from "../scripts";
import { BadRequest, Conflict } from "../errors";
import type { Post } from "../types";

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
    const { user_id, cursor, filter } = req.query;
    if (typeof user_id !== "string" || (typeof cursor !== "string" && typeof cursor !== "undefined") || typeof filter !== "string")
      throw new BadRequest();

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();

    let pipeline: PipelineStage[] = await handleCursorFilters(filter, user_id, cursor);
    pipeline.push(
      {
        $limit: DEFAULT_PAGE_SIZE,
      },
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
                    cond: { $eq: ["$$like.user_id", user.body.id] },
                  },
                },
              },
              0,
            ],
          },
        },
      }
    );

    const postRatings: Post[] = await postRating.aggregate(pipeline);
    const result = await handleAlbumsSpotifyCalls(postRatings, spotifyApi);

    res.status(200).json({ data: result, cursor: result.length === DEFAULT_PAGE_SIZE ? result[result.length - 1]._id : null });
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
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ message: "user followed successfully.", followers: numberOfFollowers, following: true });
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
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ message: "user unfollowed successfully.", followers: numberOfFollowers, following: false });
  } catch (error) {
    return next(error);
  }
};

export const getFollowingInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { following_id: user_id } = req.query;
    const data = await getCurrentUser(req);
    const follower_id = data.body.id;
    const following = await follow.findOne({ follower_id, following_id: user_id });
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
    const { user_id, cursor = undefined } = req.query;
    if (typeof user_id !== "string" || (typeof cursor !== "string" && typeof cursor !== "undefined")) {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();

    const follows = await follow
      .aggregate([
        {
          $match: {
            following_id: user_id,
            ...(cursor &&
              Types.ObjectId.isValid(cursor) && {
                _id: {
                  $gt: new Types.ObjectId(cursor),
                },
              }),
          },
        },
        {
          $lookup: {
            from: follow.collection.name,
            let: { userId: "$follower_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$following_id", "$$userId"] }, { $eq: ["$follower_id", user.body.id] }],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "isFollowing",
          },
        },
        {
          $project: {
            follower_id: 1,
            isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] },
          },
        },
      ])
      .sort({ createdAt: -1, _id: -1 })
      .limit(DEFAULT_PAGE_SIZE);

    const result = await Promise.all(
      follows.map(async ({ follower_id, ...follow }) => {
        const user = await spotifyApi.getUser(follower_id);
        return {
          profile: mapSmallIconUser(user.body),
          ...follow,
        };
      })
    );

    res.status(200).json({ users: result });
  } catch (error) {
    return next(error);
  }
};

export const getUserFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, cursor = undefined } = req.query;
    if (typeof user_id !== "string" || (typeof cursor !== "string" && typeof cursor !== "undefined")) {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();

    const follows = await follow
      .aggregate([
        {
          $match: {
            follower_id: user_id,
            ...(cursor &&
              Types.ObjectId.isValid(cursor) && {
                _id: {
                  $lt: new Types.ObjectId(cursor),
                },
              }),
          },
        },
        {
          $lookup: {
            from: follow.collection.name,
            let: { userId: "$following_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$follower_id", user.body.id] }, { $eq: ["$following_id", "$$userId"] }],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "isFollowing",
          },
        },
        {
          $project: {
            following_id: 1,
            isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] },
          },
        },
      ])
      .sort({ createdAt: -1, _id: -1 })
      .limit(DEFAULT_PAGE_SIZE);

    const result = await Promise.all(
      follows.map(async ({ following_id, ...follow }) => {
        const user = await spotifyApi.getUser(following_id);
        return {
          profile: mapSmallIconUser(user.body),
          ...follow,
        };
      })
    );

    res.status(200).json({ users: result });
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

const handleCursorFilters = async (filter: string | undefined, user_id: string, cursor: string | undefined): Promise<PipelineStage[]> => {
  switch (filter) {
    case "oldest":
      return [
        {
          $match: {
            user_id: user_id,
            ...(cursor &&
              Types.ObjectId.isValid(cursor) && {
                _id: {
                  $gt: new Types.ObjectId(cursor),
                },
              }),
          },
        },
        {
          $sort: {
            createdAt: 1,
          },
        },
      ];
    case "top_rated":
      const post = await postRating.findById(cursor);
      return [
        {
          $match: {
            user_id: user_id,
            ...(cursor &&
              post &&
              Types.ObjectId.isValid(cursor) && {
                $and: [
                  {
                    rating: {
                      $lte: post.rating ?? 10,
                    },
                  },
                  {
                    $or: [
                      { rating: { $lt: post.rating ?? 10 } },
                      {
                        $and: [{ rating: post.rating ?? 10 }, { _id: { $lt: new Types.ObjectId(cursor) } }],
                      },
                    ],
                  },
                ],
              }),
          },
        },
        {
          $sort: {
            rating: -1,
            createdAt: -1,
            _id: 1,
          },
        },
      ];
    default:
    case "latest":
      return [
        {
          $match: {
            user_id: user_id,
            ...(cursor &&
              Types.ObjectId.isValid(cursor) && {
                _id: {
                  $lt: new Types.ObjectId(cursor),
                },
              }),
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ];
  }
};
