import { PipelineStage, Types } from "mongoose";
import { getUserRecentAlbums, getUserRecommendedAlbums, setAccessToken, mapAlbum, mapUser } from "../scripts";
import { follow, postLike, postRating } from "../models";
import type { NextFunction, Request, Response } from "express";
import { CustomError } from "../customError";
import SpotifyWebApi from "spotify-web-api-node";
import type { Album, FeedPost, Post } from "../types";

const WEEKS_FOR_LATEST_POSTS = 12;
const LIMIT_OF_RESULTS = 2;
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
    const result = handleAlbumData(albums);

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
    const spotifyApi = setAccessToken(req);
    const data = await spotifyApi.getMe();
    const user_id = data.body.id;
    const cursor = req.query?.cursor ?? null;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            // Match posts from users the current user is following
            {
              user_id: {
                $in: await follow.find({ follower_id: user_id }).distinct("following_id"),
              },
            },
            // Match posts from the given user
            {
              user_id: user_id,
            },
          ],
          _id: {
            $lt: typeof cursor === "string" ? new Types.ObjectId(cursor) : new Types.ObjectId(),
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
            $gt: [
              {
                $size: {
                  $filter: {
                    input: `$${POST_LIKES}`,
                    as: "like",
                    cond: { $eq: ["$$like.user_id", user_id] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
    ];

    const postRatings: Post[] = await postRating.aggregate(pipeline);
    const result = await handlePostsSpotifyCalls(postRatings, spotifyApi);

    res.status(200).json({ data: result, cursor: result.length === LIMIT_OF_RESULTS ? result[result.length - 1]._id : null });
  } catch (error) {
    next(error);
  }
};

const fetchAlbum = async (albumId: string, spotifyApi: SpotifyWebApi) => {
  try {
    const data = await spotifyApi.getAlbum(albumId);
    return mapAlbum(data.body);
  } catch (error) {
    throw new CustomError("fetching album failed", 500);
  }
};

const handleAlbumData = (albums: SpotifyApi.AlbumObjectSimplified[]): Album[] => {
  const result: Album[] = [];
  albums.forEach((album) => {
    if (album.album_type === "album") {
      result.push(mapAlbum(album));
    }
  });
  return result;
};

const handlePostsSpotifyCalls = async (posts: Post[], spotifyApi: SpotifyWebApi): Promise<FeedPost[]> => {
  const userDataPromises = posts.map((post) => spotifyApi.getUser(post.user_id));
  const albumDataPromises = posts.map((post) => spotifyApi.getAlbum(post.album_id));

  const [userResults, albumResults] = await Promise.all([Promise.all(userDataPromises), Promise.all(albumDataPromises)]);
  return posts.map((post, index) => {
    const user = mapUser(userResults[index].body);
    const album = mapAlbum(albumResults[index].body);

    return { ...post, user, album };
  });
};
