import { getUserRecentAlbums, getUserRecommendedAlbums, setAccessToken, mapAlbum } from "../scripts.js";
import postRating from "../models/postRating.js";

const WEEKS_FOR_LATEST_POSTS = 2;
const LIMIT_OF_RESULTS = 12;

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
    res.status(200).json(handleComplicated(artistAlbumData));
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

const fetchAlbum = async (albumId, spotifyApi) => {
  try {
    const data = await spotifyApi.getAlbum(albumId);
    return mapAlbum(data.body);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

const handleComplicated = (albums) => {
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
