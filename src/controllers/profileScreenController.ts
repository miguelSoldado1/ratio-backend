import { follow, postRating } from "../models";
import { getUser, handleFilters, mapLargeIconUser, setAccessToken } from "../scripts";
import { CustomError } from "../customError";
import type { NextFunction, Request, Response } from "express";

const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_PAGE_NUMBER = 0;

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
