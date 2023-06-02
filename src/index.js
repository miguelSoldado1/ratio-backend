import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import homeScreenRoutes from "./routes/homeScreenRoutes.js";
import albumDetailsRoutes from "./routes/albumDetailsRoutes.js";
import navigationBarRoutes from "./routes/navigationBarRoutes.js";
import profileScreenRoutes from "./routes/profileScreenRoutes.js";

const app = express();
dotenv.config();
const { PORT, CONNECTION_URL } = process.env;

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

app.use("/auth", authRoutes);
app.use("/homeScreen", homeScreenRoutes);
app.use("/albumDetails", albumDetailsRoutes);
app.use("/navigationBar", navigationBarRoutes);
app.use("/profileScreen", profileScreenRoutes);

mongoose
  .connect(CONNECTION_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
  })
  .catch((error) => console.log(error.message));
