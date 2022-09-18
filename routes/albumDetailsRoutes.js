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
router.delete("/:_id/deletePost", albumDetailsController.deletePost);
router.patch("/:_id/handleLikes", albumDetailsController.handleLikes);

export default router;
