import express from "express";
import { getUserPosts, getUserDisplayName } from "../controllers/profileScreenController.js";

const router = express.Router();

router.get("/getUserPosts", getUserPosts);
router.get("/getUserDisplayName", getUserDisplayName);
export default router;
