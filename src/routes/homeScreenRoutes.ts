import express from "express";
import { getRecentlyListened, getLatestPosts, getMyTopArtists, getMyReleaseRadar, getFollowingRatings } from "../controllers/homeScreenController.js";

const router = express.Router();

router.get("/getRecentlyListened", getRecentlyListened);
router.get("/getLatestPosts", getLatestPosts);
router.get("/getMyTopArtists", getMyTopArtists);
router.get("/getMyReleaseRadar", getMyReleaseRadar);
router.get("/getFollowingRatings", getFollowingRatings);

export default router;
