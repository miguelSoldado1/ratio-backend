import express from "express";
import * as navigationBarController from "../controllers/navigationBarController";

const router = express.Router();

router.get("/getMe", navigationBarController.getMe);
router.get("/searchForAlbum", navigationBarController.searchForAlbum);

export default router;
