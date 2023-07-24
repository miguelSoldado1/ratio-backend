import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

router.get("/login", authController.login);
router.get("/callback", authController.callback);
router.get("/refresh", authController.refresh);

export default router;
