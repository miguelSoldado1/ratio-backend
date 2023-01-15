import SpotifyWebApi from "spotify-web-api-node";
import { mongoose } from "mongoose";
import postRating from "../models/postRating.js";
import postLike from "../models/postLike.js";
import { getAlbumDataAndTracks, mapArtistAlbums, getAccessToken, handleFilters } from "../scripts.js";

const DEFAULT_PAGE_SIZE = 6;
const DEFAULT_PAGE_NUMBER = 0;
const ALBUM_TYPE_FILTER = "album";
const POST_LIKES = "likes";

export const getAlbum = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getAlbum(req.query.album_id)
    .then((data) => {
      if (data.body.album_type !== ALBUM_TYPE_FILTER) return res.status(404).json({ message: "not an album!", error: 404 });
      return res.status(200).json(getAlbumDataAndTracks(data?.body));
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

export const getCommunityAlbumRating = async (req, res) => {
  try {
    const { album_id, page_number, order, page_size } = req.query;
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
          [POST_LIKES]: {
            $map: {
              input: `$${POST_LIKES}`,
              as: "like",
              in: "$$like.user_id",
            },
          },
        },
      },
    ]);
    res.status(200).json(postRatings);
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
    res.status(200).json({ rating: rating });
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
    res.status(200).json({ rating: roundedResult, sum: numRatings });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getRelatedAlbums = (req, res) => {
  const RELATED_RAIL_MAX_SIZE = 10;
  const { artist_id, album_id } = req.query;
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getArtistAlbums(artist_id)
    .then((data) => {
      const result = mapArtistAlbums(data.body.items, album_id, RELATED_RAIL_MAX_SIZE);
      res.status(200).json(result);
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
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
    await postLike.deleteMany({ post_id: mongoose.Types.ObjectId(_id) });
    const ratings = await postRating.find({ album_id }).sort({ createdAt: -1, album_id: 1 });
    res.status(200).json(ratings);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

const getUser = async (req) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  return spotifyApi.getMe();
};

export const getUsersProfile = (req, res) => {
  const { user_id } = req.query;
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getUser(user_id)
    .then((data) => {
      res.status(200).json({ id: data.body.id, display_name: data.body.display_name, image_url: data.body.images[0]?.url });
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

export const handleLikes = async (req, res) => {
  try {
    const data = await getUser(req);
    const { liked, ratingId } = req.body;
    const userId = data.body.id;
    let like;
    if (liked) {
      like = await postLike.findOne({ post_id: mongoose.Types.ObjectId(ratingId), user_id: userId });
      if (like) return res.status(404).send({ message: "Post already liked!" });
      like = await new postLike({ post_id: mongoose.Types.ObjectId(ratingId), user_id: userId }).save();
    } else {
      like = await postLike.deleteOne({ post_id: mongoose.Types.ObjectId(ratingId), user_id: userId });
    }
    if (!like) return res.status(404).send({ message: "No post with specified values." });
    res.status(200).json({ message: "Post updated successfully." });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getPostLikes = async (req, res) => {
  try {
    const { post_id, page_number, page_size } = req.query;
    const parsed_page_size = parseInt(page_size) || DEFAULT_PAGE_SIZE;
    const parsed_page_number = parseInt(page_number) || DEFAULT_PAGE_NUMBER;
    const likes = await postLike
      .find({ post_id: post_id })
      .skip(parsed_page_number * parsed_page_size)
      .limit(parsed_page_size);
    const postLikes = await getAllUserLikes(likes, req);
    res.status(200).json({ postLikes: postLikes, count: await postLike.countDocuments({ post_id: post_id }) });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

const getAllUserLikes = async (userLikes, req) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);

  const userData = await Promise.all(
    userLikes.map(async (postLike) => {
      const data = await spotifyApi.getUser(postLike.user_id);
      return {
        id: data.body.id || null,
        display_name: data.body.display_name || null,
        image_url: data.body.images[0]?.url || null,
      };
    })
  );
  return userData;
};
