const RETURN_LIMIT = 20;
const ALBUM_TYPE_FILTER = "album";

//can't use a forEach because of the need of break condition
export const getUserRecentAlbums = (items) => {
  let counter = 0;
  const result = [];
  for (var item in items) {
    const album = items[item].track.album;
    if (album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0) {
      result.push(mapAlbum(album));
      counter++;
    }
    if (counter >= RETURN_LIMIT) break;
  }
  return result;
};

//can't use a forEach because of the need of break condition
export const getUserRecommendedAlbums = (items) => {
  let counter = 0;
  const result = [];
  for (var item in items) {
    const album = items[item];
    if (album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0) {
      result.push(mapAlbum(album));
      counter++;
    }
    if (counter >= RETURN_LIMIT) break;
  }
  return result;
};

export const getAlbumSearch = (items) => {
  const result = [];
  for (var item in items) {
    const album = items[item];
    if (album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0) {
      result.push(mapAlbum(album));
    }
  }
  return result;
};

export const mapArtistAlbums = (items, albumId) => {
  const result = [];
  for (var item in items) {
    const album = items[item];

    if (result.findIndex((x) => x.name === album.name) < 0 && album.album_type == ALBUM_TYPE_FILTER && result.findIndex((x) => x.id == album.id) < 0 && album.id !== albumId) {
      result.push(mapAlbum(album));
    }
  }
  return result;
};

export const getAlbumDataAndTracks = (album) => {
  var result = mapAlbum(album);
  result.tracks = album.tracks.items.map((track) => {
    return getTrack(track);
  });
  return result;
};

const getTrack = (track) => {
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

export const mapAlbum = (album) => {
  return {
    name: album.name || "",
    album_uri: album.uri,
    artist: album.artists.map(({ name, uri, id }) => ({ name, uri, id })) || [],
    artist_id: album.artists[0].id || "",
    id: album.id || "",
    release_date: album.release_date || "",
    image: album.images[1].url || "",
    release_date_precision: album.release_date_precision,
  };
};

export const getAccessToken = (req) => {
  if (req?.headers?.authorization) {
    var headersSplit = req.headers.authorization.split(" ");
  }
  return headersSplit && headersSplit[1] ? headersSplit[1] : undefined;
};

export const handleFilters = (filter) => {
  switch (filter) {
    case "oldest":
      return { createdAt: 1, album_id: -1 };
    case "top_rated":
      return { rating: -1, createdAt: -1 };
    case "latest":
    default:
      return { createdAt: -1, album_id: 1 };
  }
};
