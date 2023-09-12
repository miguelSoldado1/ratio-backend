import express from "express";
import * as profileScreenController from "../controllers/profileScreenController";

const router = express.Router();

router.get("/getUserProfile", profileScreenController.getUserProfile);
router.get("/followUser", profileScreenController.followUser);
router.get("/unfollowUser", profileScreenController.unfollowUser);
router.get("/getFollowingInfo", profileScreenController.getFollowingInfo);
router.get("/getUserRatings", profileScreenController.getUserRatings);
router.get("/getUserFollowers", profileScreenController.getUserFollowers);
router.get("/getUserFollowing", profileScreenController.getUserFollowing);

export default router;
