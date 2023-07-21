import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import config from "../config";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware";

const app = express();

// rate limiting for max 100 request per 5 minutes
app.use(rateLimit({ windowMs: 5 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use(bodyParser.json({ limit: "30mb" }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

app.use(routes);
app.use(errorHandler);
app.use(notFound);

mongoose
  .connect(config.CONNECTION_URL)
  .then(() => {
    app.listen(config.PORT, () => console.log(`Server running on port: ${config.PORT}`));
  })
  .catch((error) => console.log(error.message));
