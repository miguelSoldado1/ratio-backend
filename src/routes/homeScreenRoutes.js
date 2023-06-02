import express from "express";
import { getRecentlyListened, getLatestPosts, getMyTopArtists, getMyReleaseRadar } from "../controllers/homeScreenController.js";

const router = express.Router();

router.get("/getRecentlyListened", getRecentlyListened);
router.get("/getLatestPosts", getLatestPosts);
router.get("/getMyTopArtists", getMyTopArtists);
router.get("/getMyReleaseRadar", getMyReleaseRadar);

export default router;
