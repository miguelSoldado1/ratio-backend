import express from "express";
import * as albumDetailsController from "../controllers/albumDetailsController.js";

const router = express.Router();

router.get("/getAlbum", albumDetailsController.getAlbum);
router.get("/getCommunityAlbumRating", albumDetailsController.getCommunityAlbumRating);
router.get("/getAverageAlbumRating", albumDetailsController.getAverageAlbumRating);
router.get("/getMyAlbumRating", albumDetailsController.getMyAlbumRating);
router.get("/getRelatedAlbums", albumDetailsController.getRelatedAlbums);
router.get("/getUsersProfile", albumDetailsController.getUsersProfile);
router.post("/createPost", albumDetailsController.createPost);
router.delete("/deletePost", albumDetailsController.deletePost);
router.post("/createLike", albumDetailsController.createLike);
router.delete("/deleteLike", albumDetailsController.deleteLike);
router.get("/getPostLikes", albumDetailsController.getPostLikes);

export default router;
