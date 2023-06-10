import { getUserRecentAlbums, getUserRecommendedAlbums, setAccessToken, mapAlbum, mapUser } from "../scripts.js";
import mongoose from "mongoose";
import postRating from "../models/postRating.js";
import follow from "../models/follow.js";
import postLike from "../models/postLike.js";

const WEEKS_FOR_LATEST_POSTS = 2;
const LIMIT_OF_RESULTS = 12;
const POST_LIKES = "likes";

export const getRecentlyListened = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 });
    const result = getUserRecentAlbums(data.body.items, LIMIT_OF_RESULTS);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getLatestPosts = async (req, res) => {
  try {
    const userId = req?.query?.user_id;
    const spotifyApi = setAccessToken(req);
    const postRatings = await postRating.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7 * WEEKS_FOR_LATEST_POSTS)),
          },
        },
      },
      {
        $match: {
          user_id: {
            $nin: [userId],
          },
        },
      },
      {
        $group: {
          _id: "$album_id",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: LIMIT_OF_RESULTS,
      },
    ]);
    const responses = await Promise.all(postRatings.map(({ _id }) => fetchAlbum(_id, spotifyApi)));
    res.status(200).json(responses);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getMyTopArtists = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const topArtistsData = await spotifyApi.getMyTopArtists({ limit: LIMIT_OF_RESULTS, time_range: "long_term" });
    const trackIds = topArtistsData.body.items.map((t) => t.id);
    const artistAlbumPromises = trackIds.map(async (id) => await spotifyApi.getArtistAlbums(id, { limit: 1 }));
    const artistAlbumData = await Promise.all(artistAlbumPromises);
    res.status(200).json(handleAlbumData(artistAlbumData));
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getMyReleaseRadar = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getNewReleases({ limit: 50 });
    const result = getUserRecommendedAlbums(data.body.albums.items, LIMIT_OF_RESULTS);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getFollowingRatings = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getMe();
    const user_id = data.body.id;
    const cursor = req.query?.cursor ?? null;

    const pipeline = [
      // Match the posts made by the users the current user is following
      {
        $match: {
          user_id: {
            $in: await follow.find({ follower_id: user_id }).distinct("following_id"),
          },
          _id: {
            $lt: cursor ? mongoose.Types.ObjectId(cursor) : mongoose.Types.ObjectId(),
          },
        },
      },
      // Sort the posts by the creation date in descending order
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: LIMIT_OF_RESULTS,
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
            $gt: [{ $size: { $filter: { input: `$${POST_LIKES}`, as: "like", cond: { $eq: ["$$like.user_id", user_id] } } } }, 0],
          },
        },
      },
    ];

    const postRatings = await postRating.aggregate(pipeline);
    const result = await handlePostsSpotifyCalls(postRatings, spotifyApi);

    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode ?? 500).json(error.message);
  }
};

const fetchAlbum = async (albumId, spotifyApi) => {
  try {
    const data = await spotifyApi.getAlbum(albumId);
    return mapAlbum(data.body);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

const handleAlbumData = (albums) => {
  const result = [];
  albums.forEach((data) => {
    data.body.items.forEach((album) => {
      if (album.album_type === "album") {
        result.push(mapAlbum(album));
      }
    });
  });
  return result;
};

const handlePostsSpotifyCalls = async (posts, spotifyApi) => {
  const userDataPromises = posts.map((post) => spotifyApi.getUser(post.user_id));
  const albumDataPromises = posts.map((post) => spotifyApi.getAlbum(post.album_id));

  const [userResults, albumResults] = await Promise.all([Promise.all(userDataPromises), Promise.all(albumDataPromises)]);
  return posts.map((post, index) => {
    const user = mapUser(userResults[index].body);
    const album = mapAlbum(albumResults[index].body);

    return { ...post, user, album };
  });
};
