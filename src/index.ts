import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import config from "../config";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware";

const app = express();

app.set("trust proxy", 1);

// rate limiting for max 50 request per 1 minutes
if (config.NODE_ENV !== "local") app.use(rateLimit({ windowMs: 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false }));
app.use(bodyParser.json({ limit: "30mb" }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors({ origin: config.FRONT_END_URL, optionsSuccessStatus: 200 }));

app.use(
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      console.warn(`This request[${key}] is sanitized`, req);
    },
  })
);

app.use(routes);
app.use(errorHandler);
app.use(notFound);

mongoose
  .connect(config.CONNECTION_URL)
  .then(() => {
    app.listen(config.PORT, () => console.log(`Server running on port: ${config.PORT}`));
  })
  .catch((error) => console.log(error.message));
