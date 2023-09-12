import authRoutes from "./authRoutes";
import albumDetailsRoutes from "./albumDetailsRoutes";
import homeScreenRoutes from "./homeScreenRoutes";
import navigationBarRoutes from "./navigationBarRoutes";
import profileScreenRoutes from "./profileScreenRoutes";
import { Router } from "express";

const router = Router();

router.use("/auth", authRoutes);
router.use("/homeScreen", homeScreenRoutes);
router.use("/albumDetails", albumDetailsRoutes);
router.use("/navigationBar", navigationBarRoutes);
router.use("/profileScreen", profileScreenRoutes);

export default router;
