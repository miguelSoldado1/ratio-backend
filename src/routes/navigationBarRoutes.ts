import express from "express";
import { getMe, searchForAlbum } from "../controllers/navigationBarController";

const router = express.Router();

router.get("/getMe", getMe);
router.get("/searchForAlbum", searchForAlbum);

export default router;
