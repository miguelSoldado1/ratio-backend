import express from "express";
import { getPostLikes, getUserPosts } from "../controllers/profileScreenController.js";

const router = express.Router();

router.get("/getUserPosts", getUserPosts);
router.get("/getPostLikes", getPostLikes);
export default router;
