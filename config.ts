import dotenv from "dotenv";

// Parsing the env file.
dotenv.config();

// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

interface ENV {
  BACK_END_URL: string | undefined;
  CLIENT_ID: string | undefined;
  CLIENT_SECRET: string | undefined;
  CONNECTION_URL: string | undefined;
  FRONT_END_URL: string | undefined;
  NODE_ENV: string | undefined;
  PORT: number | undefined;
  SCOPES: string | undefined;
}

interface Config {
  BACK_END_URL: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  CONNECTION_URL: string;
  FRONT_END_URL: string;
  NODE_ENV: string;
  PORT: number;
  SCOPES: string;
}

// Loading process.env as ENV interface
const getConfig = (): ENV => {
  return {
    BACK_END_URL: process.env.BACK_END_URL,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    CONNECTION_URL: process.env.CONNECTION_URL,
    FRONT_END_URL: process.env.FRONT_END_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    SCOPES: process.env.SCOPES,
  };
};

// Throwing an Error if any field was undefined we don't
// want our app to run if it can't connect to DB and ensure
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type
// definition.

const getSanitzedConfig = (config: ENV): Config => {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`);
    }
  }
  return config as Config;
};

const config = getConfig();

const sanitizedConfig = getSanitzedConfig(config);

export default sanitizedConfig;
