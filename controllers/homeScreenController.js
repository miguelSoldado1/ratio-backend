import SpotifyWebApi from "spotify-web-api-node";
import { getUserRecentAlbums, getUserRecommendedAlbums } from "../scripts.js";
import postRating from "../models/postRating.js";
import { mapAlbum, getAccessToken } from "../scripts.js";

const WEEKS_FOR_LATEST_POSTS = 2;
const LIMIT_OF_RESULTS = 20;

export const getRecentlyListened = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getMyRecentlyPlayedTracks({ limit: 50 })
    .then((data) => {
      const result = getUserRecentAlbums(data.body.items);
      res.status(200).json(result);
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

export const getLatestPosts = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const userId = req?.query?.user_id;
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(accessToken);
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
    Promise.all(postRatings.map(({ _id }) => fetchAlbum(_id, spotifyApi))).then((response) => res.status(200).json(response));
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const getMyTopArtists = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getMyTopArtists({ limit: LIMIT_OF_RESULTS, time_range: "long_term" })
    .then((data) => data.body.items.map((t) => t.id))
    .then((trackIds) => {
      const promises = trackIds.map(async (id) => await spotifyApi.getArtistAlbums(id, { limit: 1 }));
      return Promise.all(promises);
    })
    .then((data) => {
      res.status(200).json(handleComplicated(data));
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

export const getMyReleaseRadar = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getNewReleases({ limit: 50 })
    .then((response) => {
      const result = getUserRecommendedAlbums(response.body.albums.items);
      res.status(200).json(result);
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

const fetchAlbum = (albumId, spotifyApi) => {
  return spotifyApi
    .getAlbum(albumId)
    .then((data) => mapAlbum(data.body))
    .catch((error) => error.status);
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
