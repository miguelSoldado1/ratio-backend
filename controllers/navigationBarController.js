import { getAlbumSearch, getAccessToken } from "../scripts.js";
import SpotifyWebApi from "spotify-web-api-node";

export const getMe = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getMe()
    .then((data) => {
      res.status(200).json({ id: data.body.id, display_name: data.body.display_name, image_url: data.body.images[0]?.url });
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

export const searchForAlbum = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .searchAlbums(req.query.search_query, { limit: 10 })
    .then((data) => {
      const result = getAlbumSearch(data.body.albums.items);
      res.status(200).json(result);
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};
