import express from "express";
import { callback, login, refresh } from "../controllers/authController.js";

const router = express.Router();

router.get("/login", login);
router.get("/callback", callback);
router.get("/refresh", refresh);

export default router;
