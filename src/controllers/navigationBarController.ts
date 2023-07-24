import { BadRequest } from "../errors";
import { getAlbumSearch, mapSmallIconUser, setAccessToken } from "../scripts";
import type { NextFunction, Request, Response } from "express";

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const spotifyApi = setAccessToken(req);
    const userResponse = await spotifyApi.getMe();
    const user = mapSmallIconUser(userResponse.body);

    res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

export const searchForAlbum = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const searchQuery = req.query.search_query;
    if (typeof searchQuery !== "string") {
      throw new BadRequest();
    }

    const spotifyApi = setAccessToken(req);
    const response = await spotifyApi.searchAlbums(searchQuery, { limit: 10 });
    const result = getAlbumSearch(response.body.albums?.items);

    res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
