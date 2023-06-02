import postRating from "../models/postRating.js";
import { handleFilters, setAccessToken } from "../scripts.js";

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
