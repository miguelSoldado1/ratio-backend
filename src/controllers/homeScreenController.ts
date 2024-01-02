import { Types } from "mongoose";
import SpotifyWebApi from "spotify-web-api-node";
import { getUserRecentAlbums, getUserRecommendedAlbums, setAccessToken, mapAlbum, mapSmallIconUser } from "../scripts";
import { follow, postLike, postRating } from "../models";
import { PostRating } from "../models/types";
import { infinitePagination } from "../pagination";
import { BadRequest, NotFound } from "../errors";
import type { NextFunction, Request, Response } from "express";
import type { FeedPost, Post } from "../types";
import type { InfinitePaginationParams } from "../pagination/types";

const WEEKS_FOR_LATEST_POSTS = 2;
const LIMIT_OF_RESULTS = 12;
const POST_LIKES = "likes";

export const getRecentlyListened = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 });
    const result = getUserRecentAlbums(data.body.items, LIMIT_OF_RESULTS);
    res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getLatestPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.user_id;
    const spotifyApi = setAccessToken(req);
    const postRatings: { albumId: string }[] = await postRating.aggregate([
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
      { $project: { albumId: "$_id" } },
    ]);

    const responses = await Promise.all(postRatings.map(({ albumId }) => fetchAlbum(albumId, spotifyApi)));
    res.status(200).json(responses);
  } catch (error) {
    return next(error);
  }
};

export const getMyTopArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const spotifyApi = setAccessToken(req);
    const topArtistsData = await spotifyApi.getMyTopArtists({ limit: LIMIT_OF_RESULTS, time_range: "long_term" });
    const artistIds = topArtistsData.body.items.map((artist) => artist.id);

    const artistAlbumPromises = artistIds.map(async (id) => {
      const albumsData = await spotifyApi.getArtistAlbums(id, { limit: 1 });
      return albumsData.body.items;
    });

    const artistAlbumData = await Promise.all(artistAlbumPromises);
    const albums = artistAlbumData.flatMap((items) => items);
    const result = albums.filter((album) => album.album_type === "album").map((album) => mapAlbum(album));

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyReleaseRadar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getNewReleases({ limit: 50 });
    const result = getUserRecommendedAlbums(data.body.albums.items, LIMIT_OF_RESULTS);
    res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getFollowingRatings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { next = undefined } = req.query;
    if (typeof next !== "string" && typeof next !== "undefined") {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getMe();
    const userId = data.body.id;

    const isFollowingUsers = await follow.exists({ follower_id: userId });
    if (!isFollowingUsers) {
      return res.status(200).json({ data: [], next: null });
    }

    const paginationParams: InfinitePaginationParams<PostRating> = {
      next: next && Types.ObjectId.isValid(next) ? new Types.ObjectId(next) : null,
      limit: LIMIT_OF_RESULTS,
      match: {
        $or: [
          // Match posts from users the current user is following
          {
            user_id: {
              $in: await follow.find({ follower_id: userId }).distinct("following_id"),
            },
          },
          // Match posts from the given user
          {
            user_id: userId,
          },
        ],
        _id: {
          $lt: typeof next === "string" ? new Types.ObjectId(next) : new Types.ObjectId(),
        },
      },
      query: [
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
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: `$${POST_LIKES}`,
                      as: "like",
                      cond: { $eq: ["$$like.user_id", userId] },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
      ],
    };

    const result = await infinitePagination<PostRating>(paginationParams, postRating);
    const response = await handlePostsSpotifyCalls(result.results, spotifyApi);

    res.status(200).json({ data: response, next: result.next });
  } catch (error) {
    next(error);
  }
};

const fetchAlbum = async (albumId: string, spotifyApi: SpotifyWebApi) => {
  try {
    const data = await spotifyApi.getAlbum(albumId);
    return mapAlbum(data.body);
  } catch (error) {
    throw new NotFound();
  }
};

const handlePostsSpotifyCalls = async (posts: Post[], spotifyApi: SpotifyWebApi): Promise<FeedPost[]> => {
  const userDataPromises = posts.map((post) => spotifyApi.getUser(post.user_id));
  const albumDataPromises = posts.map((post) => spotifyApi.getAlbum(post.album_id));

  const [userResults, albumResults] = await Promise.all([Promise.all(userDataPromises), Promise.all(albumDataPromises)]);
  return posts.map((post, index) => {
    const user = mapSmallIconUser(userResults[index].body);
    const album = mapAlbum(albumResults[index].body);

    return { ...post, user, album };
  });
};
