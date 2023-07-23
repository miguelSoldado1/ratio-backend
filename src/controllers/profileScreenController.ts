import SpotifyWebApi from "spotify-web-api-node";
import { follow, postLike, postRating } from "../models";
import { getUser, handleFilters, mapAlbum, mapLargeIconUser, setAccessToken } from "../scripts";
import { CustomError } from "../middleware";
import { PipelineStage, Types } from "mongoose";
import type { NextFunction, Request, Response } from "express";
import type { Post, UserProfilePost } from "../types";

const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_PAGE_NUMBER = 0;
const POST_LIKES = "likes";

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.query.user_id;

    if (typeof user_id !== "string") {
      throw new CustomError("user id param missing!", 500);
    }

    const spotifyApi = setAccessToken(req);
    const userResponse = await spotifyApi.getUser(user_id);
    res.status(200).json(mapLargeIconUser(userResponse.body));
  } catch (error) {
    return next(error);
  }
};

export const getUserPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.query;
    const pageSize = req.query.page_size ? parseInt(req.query.page_size?.toString()) : DEFAULT_PAGE_SIZE;
    const pageNumber = req.query.page_number ? parseInt(req.query.page_number.toString()) : DEFAULT_PAGE_NUMBER;
    let filter = handleFilters(req.query.order?.toString());

    const [postRatings] = await postRating.aggregate([
      { $match: { user_id: user_id } },
      {
        $group: {
          _id: "$_id",
          album_id: { $last: "$album_id" },
          rating: { $last: "$rating" },
          createdAt: { $last: "$createdAt" },
        },
      },
      {
        $facet: {
          data: [{ $sort: filter }, { $skip: pageNumber * pageSize }, { $limit: pageSize }],
          total: [{ $count: "total" }],
        },
      },
      { $addFields: { total: { $arrayElemAt: ["$total.total", 0] } } },
    ]);

    const nextPage = (pageNumber + 1) * pageSize < postRatings.total ? pageNumber + 1 : undefined;
    res.status(200).json({ data: postRatings.data, nextPage, total: postRatings.total });
  } catch (error) {
    return next(error);
  }
};

export const getUserRatings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, cursor, filter } = req.query;

    if (typeof user_id !== "string") throw new CustomError("user id param missing!", 500);
    const spotifyApi = setAccessToken(req);
    const user = await spotifyApi.getMe();

    let pipeline: PipelineStage[] = await handleCursorFilters(filter?.toString(), user_id, cursor?.toString());
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
    const data = await getUser(req);
    const userId = data.body.id;
    const following = await follow.findOne({ folower_id: userId, following_id: following_id });
    if (following) throw new CustomError("Already following user.", 409);
    const followData = { follower_id: userId, following_id: following_id, createdAt: new Date() };
    await new follow(followData).save();
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ message: "user followed successfully.", numberOfFollowers });
  } catch (error) {
    return next(error);
  }
};

export const unfollowUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { following_id } = req.query;
    const data = await getUser(req);
    const userId = data.body.id;
    const following = await follow.deleteOne({ folower_id: userId, following_id: following_id });
    if (following.deletedCount <= 0) throw new CustomError("Not following this user.", 409);
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ message: "user unfollowed successfully.", numberOfFollowers });
  } catch (error) {
    return next(error);
  }
};

export const getFollowingInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { following_id } = req.query;
    const data = await getUser(req);
    const folower_id = data.body.id;
    const following = await follow.findOne({ folower_id, following_id });
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ following: !!following, followers: numberOfFollowers });
  } catch (error) {
    return next(error);
  }
};

const handleAlbumsSpotifyCalls = async (posts: Post[], spotifyApi: SpotifyWebApi): Promise<UserProfilePost[]> => {
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
            _id: 1, // Add this to ensure consistent sorting for equal ratings
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
