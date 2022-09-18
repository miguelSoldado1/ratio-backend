import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import SpotifyWebApi from "spotify-web-api-node";
import dotenv from "dotenv";
import homeScreenRoutes from "./routes/homeScreenRoutes.js";
import albumDetailsRoutes from "./routes/albumDetailsRoutes.js";
import navigationBarRoutes from "./routes/navigationBarRoutes.js";
import profileScreenRoutes from "./routes/profileScreenRoutes.js";

const app = express();
dotenv.config();

app
  .use(bodyParser.json({ limit: "30mb", extended: true }))
  .use(bodyParser.urlencoded({ limit: "30mb", extended: true }))
  .use(cors());

/* START AUTHORIZATION BOILERPLATE CODE */
const PORT = process.env.PORT;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BACK_END_URL = process.env.BACK_END_URL;

export const spotifyApi = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: `${BACK_END_URL}/callback`,
});

const scopes = process.env.SCOPES.split(",");

app.get("/login", (req, res) => {
  try {
    const redirectUrl = spotifyApi.createAuthorizeURL(scopes, req.query.pathname, false);
    res.redirect(redirectUrl);
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
});

app.get("/callback", (req, res) => {
  try {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
      console.error("Callback Error:", error);
      res.send(`Callback Error: ${error}`);
      return;
    }

    spotifyApi.authorizationCodeGrant(code).then((data) => {
      const access_token = data.body["access_token"];
      const expires_in = data.body["expires_in"];
      res.redirect(`${process.env.FRONT_END_URL}?access_token=${access_token}&&expires_in=${expires_in}&&redirect=${state ? state : ""}`);
    });
  } catch (error) {
    res.status(error.statusCode).json(error.message);
  }
});

app.get("/refresh", (req, res) => {
  spotifyApi.setRefreshToken(req.query.refreshToken);
  spotifyApi.refreshAccessToken().then((data) => {
    res.status(200).json({ accessToken: data.body["access_token"], expiresIn: data.body["expires_in"], refreshToken: data.body["refresh_token"] });
  });
});

/* END AUTHORIZATION BOILERPLATE CODE */

app.use("/homeScreen", homeScreenRoutes);
app.use("/albumDetails", albumDetailsRoutes);
app.use("/navigationBar", navigationBarRoutes);
app.use("/profileScreen", profileScreenRoutes);

mongoose
  .connect(process.env.CONNECTION_URL, {
    useNewURlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(process.env.PORT, () => console.log(`Server running on port: ${process.env.PORT}`));
  })
  .catch((error) => console.log(error.message));

module.exports = app;
