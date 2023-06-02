import dotenv from "dotenv";
import spotifyApi from "../spotifyApiWrapper.js";

dotenv.config();
const { SCOPES, FRONT_END_URL } = process.env;

export const login = (req, res) => {
  try {
    const redirectUrl = spotifyApi.createAuthorizeURL(SCOPES.split(","), req.query.pathname, false);
    res.redirect(redirectUrl);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const callback = (req, res) => {
  try {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
      console.error("Callback Error:", error);
      throw new Error({ statusCode: 401, message: error });
    }

    spotifyApi.authorizationCodeGrant(code).then((data) => {
      const { access_token, expires_in, refresh_token } = data.body;
      const newUrl = new URL(FRONT_END_URL);
      newUrl.searchParams.set("access_token", access_token);
      newUrl.searchParams.set("expires_in", expires_in);
      newUrl.searchParams.set("refresh_token", refresh_token);
      state && newUrl.searchParams.set("redirect", state);

      res.redirect(newUrl);
    });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};

export const refresh = async (req, res) => {
  try {
    spotifyApi.setRefreshToken(req.query.refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    res.status(200).json({ access_token: data.body["access_token"], expires_in: data.body["expires_in"] });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
};
