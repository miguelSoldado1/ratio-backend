import express from "express";
import * as homeScreen from "../controllers/homeScreenController";

const router = express.Router();

router.get("/getRecentlyListened", homeScreen.getRecentlyListened);
router.get("/getLatestPosts", homeScreen.getLatestPosts);
router.get("/getMyTopArtists", homeScreen.getMyTopArtists);
router.get("/getMyReleaseRadar", homeScreen.getMyReleaseRadar);
router.get("/getFollowingRatings", homeScreen.getFollowingRatings);

export default router;
