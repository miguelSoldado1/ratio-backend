import postRating from "../models/postRating.js";
import { handleFilters } from "../scripts.js";

const DEFAULT_PAGE_SIZE = 8;
const DEFAULT_PAGE_NUMBER = 0;

export const getUserPosts = async (req, res) => {
  try {
    const { user_id, page_number, order, page_size } = req.query;
    const parsed_page_size = parseInt(page_size) || DEFAULT_PAGE_SIZE;
    const parsed_page_number = parseInt(page_number) || DEFAULT_PAGE_NUMBER;
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
              $skip: parsed_page_number * parsed_page_size,
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
    if (postRatings[0]?.data?.length <= 0) return res.status(404).json({ message: "no ratings found for user!", error: 404 });
    res.status(200).json({ data: postRatings[0]?.data, count: postRatings[0]?.total[0]?.total });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};
