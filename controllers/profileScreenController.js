import postRating from "../models/postRating.js";
import { handleFilters } from "../scripts.js";

const DEFAULT_PAGE_SIZE = 8;

export const getUserPosts = async (req, res) => {
  try {
    const { user_id, page_number, order, page_size } = req.query;
    const parsed_page_size = parseInt(page_size) || DEFAULT_PAGE_SIZE;
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
              $skip: page_number * parsed_page_size,
            },
            {
              $limit: parsed_page_size,
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
