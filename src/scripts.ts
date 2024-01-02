import { Request } from "express";
import SpotifyWebApi from "spotify-web-api-node";
import { PostRating } from "./models/types";
import { CustomError } from "./errors";
import { type Album, type User, type Track, FilterString } from "./types";

const ALBUM_TYPE_FILTER = "album";

//can't use a forEach because of the need of break condition
export const getUserRecentAlbums = (items: SpotifyApi.PlayHistoryObject[], limit: number) => {
  let counter = 0;
  const result = [];
  for (var item in items) {
    const album = items[item].track.album;
    if (album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0) {
      result.push(mapAlbum(album));
      counter++;
    }
    if (counter >= limit) break;
  }
  return result;
};

//can't use a forEach because of the need of break condition
export const getUserRecommendedAlbums = (items: SpotifyApi.AlbumObjectSimplified[], limit: number) => {
  let counter = 0;
  const result = [];
  for (var item in items) {
    const album = items[item];
    if (album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0) {
      result.push(mapAlbum(album));
      counter++;
    }
    if (counter >= limit) break;
  }
  return result;
};

export const getAlbumSearch = (items: SpotifyApi.AlbumObjectSimplified[] | undefined): Album[] => {
  const result: Album[] = [];
  if (!items) return result;

  for (var item in items) {
    const album = items[item];
    if (album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0) {
      result.push(mapAlbum(album));
    }
  }
  return result;
};

export const mapArtistAlbums = (items: SpotifyApi.AlbumObjectSimplified[], albumId: string, limit: number): Album[] => {
  const result: Album[] = [];
  for (var item in items) {
    const album = items[item];

    if (
      result.findIndex((x) => x.name === album.name) < 0 &&
      album.album_type == ALBUM_TYPE_FILTER &&
      result.findIndex((x) => x.id == album.id) < 0 &&
      album.id !== albumId
    ) {
      result.push(mapAlbum(album));
    }
    if (result.length >= limit) return result;
  }
  return result;
};

export const getAlbumDataAndTracks = (album: SpotifyApi.SingleAlbumResponse): Album => {
  var result = mapAlbum(album);
  result.tracks = album.tracks.items.map((track) => getTrack(track));
  return result;
};

const getTrack = (track: SpotifyApi.TrackObjectSimplified): Track => {
  return {
    id: track.id,
    name: track.name,
    trackNumber: track.track_number,
    artists: track.artists.map(({ name, uri, id }) => ({ name, uri, id })) || [],
    track_url: track.uri,
    duration_ms: track.duration_ms,
    explicit: track.explicit,
  };
};

export const mapAlbum = (album: SpotifyApi.AlbumObjectSimplified): Album => {
  return {
    name: album.name || "",
    album_uri: album.uri,
    artist: album.artists.map(({ name, uri, id }) => ({ name, uri, id })) || [],
    artist_id: album.artists[0].id || "",
    id: album.id || "",
    release_date: album.release_date || "",
    image: album.images[1]?.url || null,
    release_date_precision: album.release_date_precision,
  };
};

export const mapLargeIconUser = ({ id, display_name, images }: SpotifyApi.UserProfileResponse): User => {
  return {
    id: id ?? "",
    displayName: display_name ?? "",
    imageUrl: images ? images[images.length - 1]?.url : null,
  };
};

export const mapSmallIconUser = ({ id, display_name, images }: SpotifyApi.UserProfileResponse): User => {
  return {
    id: id ?? "",
    displayName: display_name ?? "",
    imageUrl: images && images.length > 0 ? images[0]?.url : null,
  };
};

export const setAccessToken = (request: Request): SpotifyWebApi => {
  if (!request || !request.headers || !request.headers.authorization) {
    throw new CustomError("Invalid request object", 400);
  }
  const authorization = request.headers.authorization;
  const [bearer, accessToken] = authorization.split(" ");
  if (bearer !== "Bearer" || !accessToken) {
    throw new CustomError("Invalid access token", 401);
  }
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  return spotifyApi;
};

export const getCurrentUser = async (req: Request) => {
  const spotifyApi = setAccessToken(req);
  return await spotifyApi.getMe();
};

export const handleFilters = (filter: string): { sortAscending?: boolean; paginatedField?: keyof PostRating } => {
  switch (filter) {
    case FilterString.oldest:
      return { sortAscending: true };
    case FilterString.top_rated:
      return { paginatedField: "rating" };
    case FilterString.latest:
    default:
      return { paginatedField: "_id" };
  }
};
