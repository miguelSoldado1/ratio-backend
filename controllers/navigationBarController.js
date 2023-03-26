import { getAlbumSearch, setAccessToken } from "../scripts.js";

export const getMe = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const { body } = await spotifyApi.getMe();
    res.status(200).json({ id: body.id, display_name: body.display_name, image_url: body.images[0]?.url });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const searchForAlbum = async (req, res) => {
  try {
    const spotifyApi = setAccessToken(req);
    const { body } = await spotifyApi.searchAlbums(req.query.search_query, { limit: 10 });
    const result = getAlbumSearch(body.albums.items);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};
