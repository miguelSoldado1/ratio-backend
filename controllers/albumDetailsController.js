import { mongoose } from "mongoose";
import postRating from "../models/postRating.js";
import postLike from "../models/postLike.js";
import { getAlbumDataAndTracks, mapArtistAlbums, handleFilters, setAccessToken } from "../scripts.js";

const DEFAULT_PAGE_SIZE = 6;
const RELATED_RAIL_MAX_SIZE = 10;
const DEFAULT_PAGE_NUMBER = 0;
const ALBUM_TYPE_FILTER = "album";
const POST_LIKES = "likes";

export const getAlbum = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getAlbum(req.query.album_id);
    if (data.body.album_type !== ALBUM_TYPE_FILTER) {
      return res.status(404).json({ message: "not an album!", error: 404 });
    }
    return res.status(200).json(getAlbumDataAndTracks(data?.body));
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getCommunityAlbumRating = async (req, res) => {
  try {
    const { album_id, page_number, order, page_size, user_id } = req.query;
    const parsed_page_size = parseInt(page_size) || DEFAULT_PAGE_SIZE;
    const parsed_page_number = parseInt(page_number) || DEFAULT_PAGE_NUMBER;
    let filter = handleFilters(order);

    const postRatings = await postRating.aggregate([
      { $match: { album_id: album_id } },
      { $sort: filter },
      { $skip: parsed_page_number * parsed_page_size },
      { $limit: parsed_page_size },
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
    res.status(200).json({ ratings: postRatings, page: parsed_page_number });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getMyAlbumRating = async (req, res) => {
  try {
    const { album_id, user_id } = req.query;
    const postRatings = await postRating.findOne({ album_id: album_id, user_id: user_id });
    var rating = null;
    if (postRatings?.rating) {
      rating = postRatings.rating;
    }
    res.status(200).json({ personalRating: rating });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getAverageAlbumRating = async (req, res) => {
  try {
    let roundedResult = null;
    let numRatings = 0;
    const { album_id } = req.query;
    const postRatings = await postRating.aggregate([
      {
        $match: {
          album_id: album_id,
        },
      },
      {
        $group: {
          _id: 0,
          sum: {
            $sum: 1,
          },
          average: {
            $avg: "$rating",
          },
        },
      },
    ]);
    if (postRatings.length > 0) {
      roundedResult = Math.round(postRatings[0].average * 10) / 10;
      numRatings = postRatings[0].sum;
    }
    res.status(200).json({ averageRating: roundedResult, numRatings: numRatings });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getRelatedAlbums = async (req, res) => {
  try {
    const { artist_id, album_id } = req.query;
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getArtistAlbums(artist_id);
    const result = mapArtistAlbums(data.body.items, album_id, RELATED_RAIL_MAX_SIZE);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const createPost = async (req, res) => {
  try {
    const data = await getUser(req);
    const user_id = data.body.id;
    const newPost = new postRating({ ...req.body, user_id: user_id, createdAt: new Date() });
    const rating = await postRating.findOne({ user_id: user_id, album_id: newPost.album_id });
    if (rating === null) {
      await newPost.save();
      const ratings = await postRating.find({ album_id: newPost.album_id }).sort({ createdAt: -1, album_id: 1 });
      return res.status(201).json(ratings);
    }
    return res.status(409).json({ message: "Album already rated!" });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const deletePost = async (req, res) => {
  try {
    const data = await getUser(req);
    const { _id, album_id } = req.body;
    const rating = await postRating.findOneAndDelete({ _id: mongoose.Types.ObjectId(_id), user_id: data.body.id });
    if (!rating) {
      return res.status(404).send("No post with specified values.");
    }
    await postLike.deleteOne({ post_id: mongoose.Types.ObjectId(_id) });

    res.status(200).json({ message: "success" });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

const getUser = async (req) => {
  const spotifyApi = setAccessToken(req);
  return await spotifyApi.getMe();
};

export const getUsersProfile = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getUser(req.query.user_id);
    res.status(200).json({ id: data.body.id, display_name: data.body.display_name, image_url: data.body.images[0]?.url });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const createLike = async (req, res) => {
  try {
    const { rating_id } = req.body;
    const data = await getUser(req);
    const userId = data.body.id;
    const like = await postLike.findOne({ post_id: mongoose.Types.ObjectId(rating_id), user_id: userId });
    if (like) return res.status(409).send({ message: "post already liked." });
    const likeData = { post_id: mongoose.Types.ObjectId(rating_id), user_id: userId, createdAt: new Date() };
    await new postLike(likeData).save();
    const numberOfLikes = await postLike.countDocuments({ post_id: mongoose.Types.ObjectId(rating_id) });
    res.status(200).json({ message: "post liked successfully.", numberOfLikes });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const deleteLike = async (req, res) => {
  try {
    const { rating_id } = req.body;
    const data = await getUser(req);
    const user_id = data.body.id;
    const like = await postLike.deleteOne({ post_id: mongoose.Types.ObjectId(rating_id), user_id: user_id });
    if (like.deletedCount <= 0) return res.status(409).send({ message: "like not found." });
    const numberOfLikes = await postLike.countDocuments({ post_id: mongoose.Types.ObjectId(rating_id) });
    res.status(200).json({ message: "post disliked successfully.", numberOfLikes });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getPostLikes = async (req, res) => {
  try {
    const { post_id, cursor = undefined, page_size } = req.query;
    const parsed_page_size = parseInt(page_size) || DEFAULT_PAGE_SIZE;
    let pipeline = [{ $match: { post_id: mongoose.Types.ObjectId(post_id) } }];
    if (cursor) pipeline.push({ $match: { _id: { $lt: mongoose.Types.ObjectId(cursor) } } });
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $limit: parsed_page_size });
    const likes = await postLike.aggregate(pipeline);
    const postLikes = await getAllUserLikes(likes, req);
    res.status(200).json({
      postLikes: postLikes,
      cursor: postLikes.length === parsed_page_size ? likes[likes.length - 1]._id : null,
      count: await postLike.countDocuments({ post_id: post_id }),
    });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

const getAllUserLikes = async (userLikes, req) => {
  const spotifyApi = setAccessToken(req);
  const userData = await Promise.all(userLikes.map(async (postLike) => await getSingleUserLike(spotifyApi, postLike)));
  return userData;
};

const getSingleUserLike = async (spotifyApi, postLike) => {
  try {
    const { body } = await spotifyApi.getUser(postLike.user_id);
    return {
      id: body?.id || null,
      display_name: body?.display_name || null,
      image_url: body?.images[0]?.url || null,
      like_id: postLike._id,
      createdAt: postLike.createdAt,
    };
  } catch (error) {
    if (error.body.error.status === 404) {
      return {
        id: null,
        display_name: "User not found",
        image_url: null,
        like_id: postLike._id,
        createdAt: postLike.createdAt,
      };
    }
    throw error;
  }
};
