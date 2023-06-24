import spotifyApi from "../spotifyApiWrapper";
import config from "../../config";
import { CustomError } from "../customError";
import type { NextFunction, Request, Response } from "express";

export const login = (req: Request, res: Response, next: NextFunction) => {
  try {
    const pathname = req.query.pathname;
    if (typeof pathname !== "string") {
      throw new CustomError("Something went wrong!", 500);
    }

    const redirectUrl = spotifyApi.createAuthorizeURL(config.SCOPES.split(","), pathname, false);
    res.redirect(redirectUrl);
  } catch (error) {
    return next(error);
  }
};

export const callback = (req: Request, res: Response, next: NextFunction) => {
  try {
    const error = req.query.error as string;
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (error) {
      throw new CustomError(error, 500);
    }

    spotifyApi.authorizationCodeGrant(code).then((data) => {
      const { access_token, expires_in, refresh_token } = data.body;
      const newUrl = new URL(config.FRONT_END_URL);
      newUrl.searchParams.set("access_token", access_token);
      newUrl.searchParams.set("expires_in", expires_in.toString());
      newUrl.searchParams.set("refresh_token", refresh_token);
      state && newUrl.searchParams.set("redirect", state);

      res.redirect(newUrl.toString());
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (typeof req.query.refresh_token !== "string") {
      throw new CustomError("Something went wrong!", 500);
    }

    spotifyApi.setRefreshToken(req.query.refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    res.status(200).json({ access_token: data.body["access_token"], expires_in: data.body["expires_in"] });
  } catch (error) {
    next(error);
  }
};
