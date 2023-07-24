import express from "express";
import { followUser, getFollowingInfo, getUserProfile, getUserRatings, unfollowUser } from "../controllers/profileScreenController";

const router = express.Router();

router.get("/getUserProfile", getUserProfile);
router.get("/followUser", followUser);
router.get("/unfollowUser", unfollowUser);
router.get("/getFollowingInfo", getFollowingInfo);
router.get("/getUserRatings", getUserRatings);

export default router;
