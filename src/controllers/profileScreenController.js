import { follow, postRating } from "../models";
import { getUser, handleFilters, setAccessToken } from "../scripts";

const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_PAGE_NUMBER = 0;

export const getUserProfile = async (req, res) => {
  try {
    const { user_id } = req.query;
    const spotifyApi = setAccessToken(req);
    const { body } = await spotifyApi.getUser(user_id);
    res.status(200).json({ id: body.id, displayName: body.display_name, imageUrl: body.images[0]?.url });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { user_id, page_number, order, page_size } = req.query;
    const parsed_page_size = parseInt(page_size) || DEFAULT_PAGE_SIZE;
    const parsed_page_number = parseInt(page_number) || DEFAULT_PAGE_NUMBER;
    let filter = handleFilters(order);

    const postRatings = await postRating.aggregate([
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
          data: [{ $sort: filter }, { $skip: parsed_page_number * parsed_page_size }, { $limit: parsed_page_size }],
          total: [{ $count: "total" }],
        },
      },
      { $addFields: { total: { $arrayElemAt: ["$total.total", 0] } } },
    ]);

    const nextPage = (parsed_page_number + 1) * parsed_page_size < postRatings[0].total ? parsed_page_number + 1 : undefined;
    res.status(200).json({ data: postRatings[0].data, nextPage, total: postRatings[0].total });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const followUser = async (req, res) => {
  try {
    const { following_id } = req.query;
    const data = await getUser(req);
    const userId = data.body.id;
    const following = await follow.findOne({ folower_id: userId, following_id: following_id });
    if (following) return res.status(409).send({ message: "Already following user." });
    const followData = { follower_id: userId, following_id: following_id, createdAt: new Date() };
    await new follow(followData).save();
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ message: "user followed successfully.", numberOfFollowers });
  } catch (error) {
    res.status(error.statusCode ?? 500).json(error.message);
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { following_id } = req.query;
    const data = await getUser(req);
    const userId = data.body.id;
    const following = await follow.deleteOne({ folower_id: userId, following_id: following_id });
    if (following.deletedCount <= 0) return res.status(409).send({ message: "not following this user" });
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ message: "user unfollowed successfully.", numberOfFollowers });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getFollowingInfo = async (req, res) => {
  try {
    const { following_id } = req.query;
    const data = await getUser(req);
    const folower_id = data.body.id;
    const following = await follow.findOne({ folower_id, following_id });
    const numberOfFollowers = await follow.countDocuments({ following_id });
    res.status(200).json({ following: !!following, followers: numberOfFollowers });
  } catch (error) {
    res.status(error.statusCode ?? 500).json(error.message);
  }
};
