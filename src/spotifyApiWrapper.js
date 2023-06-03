import SpotifyWebApi from "spotify-web-api-node";

const { CLIENT_ID, CLIENT_SECRET, BACK_END_URL } = process.env;

export const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: `${BACK_END_URL}/auth/callback`,
});

export default spotifyApi;
