import express from "express";
import { followUser, getUserPosts, getUserProfile, unfollowUser } from "../controllers/profileScreenController.js";

const router = express.Router();

router.get("/getUserPosts", getUserPosts);
router.get("/getUserProfile", getUserProfile);
router.get("/followUser", followUser);
router.get("/unfollowUser", unfollowUser);

export default router;
