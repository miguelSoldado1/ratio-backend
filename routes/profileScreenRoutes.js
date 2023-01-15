import express from "express";
import { getUserPosts } from "../controllers/profileScreenController.js";

const router = express.Router();

router.get("/getUserPosts", getUserPosts);
export default router;
