import SpotifyWebApi from "spotify-web-api-node";
import config from "../config";

const { CLIENT_ID, CLIENT_SECRET, BACK_END_URL } = config;

export const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: `${BACK_END_URL}/auth/callback`,
});

export default spotifyApi;
