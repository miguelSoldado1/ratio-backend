import express from "express";
import { getUserPosts, getUserProfile } from "../controllers/profileScreenController.js";

const router = express.Router();

router.get("/getUserPosts", getUserPosts);
router.get("/getUserProfile", getUserProfile);
export default router;
