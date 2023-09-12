namespace NodeJS {
  interface ProcessEnv {
    BACK_END_URL: string;
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    CONNECTION_URL: string;
    FRONT_END_URL: string;
    NODE_ENV: develop | production;
    PORT: number;
    SCOPES: string;
  }
}
