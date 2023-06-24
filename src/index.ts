import express, { type Request, type Response } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import config from "../config";
import { CustomError } from "./customError";
import { authRoutes, albumDetailsRoutes, homeScreenRoutes, navigationBarRoutes, profileScreenRoutes } from "./routes";

const app = express();

const errorHandler = (error: Error | CustomError, req: Request, res: Response) => {
  let statusCode = 500; // Default status code for internal server errors

  if (error instanceof CustomError) {
    statusCode = error.statusCode; // Use custom status code if available
  }
  return res.status(statusCode).json({ message: error.message, status: statusCode });
};

app.use(bodyParser.json({ limit: "30mb" }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

app.use("/auth", authRoutes);
app.use("/homeScreen", homeScreenRoutes);
app.use("/albumDetails", albumDetailsRoutes);
app.use("/navigationBar", navigationBarRoutes);
app.use("/profileScreen", profileScreenRoutes);
app.use(errorHandler);

mongoose
  .connect(config.CONNECTION_URL)
  .then(() => {
    app.listen(config.PORT, () => console.log(`Server running on port: ${config.PORT}`));
  })
  .catch((error) => console.log(error.message));
