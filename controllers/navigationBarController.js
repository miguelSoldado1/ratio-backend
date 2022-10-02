import { getAlbumSearch, getAccessToken } from "../scripts.js";
import SpotifyWebApi from "spotify-web-api-node";

export const getMe = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .getMe()
    .then(({ body }) => {
      res.status(200).json({ id: body.id, display_name: body.display_name, image_url: body.images[0]?.url });
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};

export const searchForAlbum = (req, res) => {
  const accessToken = getAccessToken(req);
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  spotifyApi
    .searchAlbums(req.query.search_query, { limit: 10 })
    .then(({ body }) => {
      const result = getAlbumSearch(body.albums.items);
      res.status(200).json(result);
    })
    .catch((error) => res.status(error.statusCode).json(error.message));
};
