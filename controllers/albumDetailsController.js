import SpotifyWebApi from "spotify-web-api-node";
import postRating from "../models/postRating.js";
import { getAlbumDataAndTracks, mapArtistAlbums, getAccessToken, handleFilters } from "../scripts.js";
import { mongoose } from "mongoose";

const DEFAULT_PAGE_SIZE = 6;
const DEFAULT_PAGE_NUMBER = 0;
const ALBUM_TYPE_FILTER = "album";

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

    const postRatings = await postRating
      .find({ album_id: album_id })
      .sort(filter)
      .limit(parsed_page_size)
      .skip(parsed_page_number * parsed_page_size);

    res.status(200).json(postRatings);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getMyAlbumRating = async (req, res) => {
  try {
    const { album_id, user_id } = req.query;
    const postRatings = await postRating.findOne({ album_id: album_id, user_id: user_id });
    var rating = -1;
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
    let roundedResult = -1;
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
      res.status(201).json(newPost);
    } else {
      res.status(409).json({ message: "Album already rated!" });
    }
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const deletePost = async (req, res) => {
  try {
    const data = await getUser(req);
    const user_id = data.body.id;
    const { _id } = req.params;
    const rating = await postRating.findOneAndDelete({ _id: mongoose.Types.ObjectId(_id), user_id });
    if (!rating) {
      return res.status(404).send("No post with specified values.");
    }
    res.status(200).json({ message: "Post deleted successfully." });
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
    const liked = req.body.liked;
    const data = await getUser(req);
    const user_id = data.body.id;
    const { _id } = req.params;
    var rating;
    if (liked) {
      var rating = await postRating.findByIdAndUpdate(mongoose.Types.ObjectId(_id), { $push: { likes: user_id } });
    } else {
      var rating = await postRating.findByIdAndUpdate(mongoose.Types.ObjectId(_id), { $pull: { likes: user_id } });
    }
    if (!rating) {
      return res.status(404).send("No post with specified values.");
    }
    res.status(200).json({ message: "Post updated successfully." });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};
