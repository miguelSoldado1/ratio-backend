import postRating from "../models/postRating.js";
import { handleFilters } from "../scripts.js";

export const getUserPosts = async (req, res) => {
  try {
    const { user_id, page_number, order } = req.query;
    let filter = handleFilters(order);
    // weird ass aggregation to get total of ratings
    const postRatings = await postRating.aggregate([
      {
        $match: {
          user_id: user_id,
        },
      },
      {
        $group: {
          _id: "$_id",
          album_id: {
            $last: "$album_id",
          },
          rating: {
            $last: "$rating",
          },
          createdAt: {
            $last: "$createdAt",
          },
        },
      },
      {
        $facet: {
          data: [
            {
              $sort: filter,
            },
            {
              $skip: page_number * 10,
            },
            {
              $limit: 10,
            },
          ],
          total: [
            {
              $count: "total",
            },
          ],
        },
      },
    ]);
    res.status(200).json({ data: postRatings[0]?.data, count: postRatings[0]?.total[0]?.total });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};
