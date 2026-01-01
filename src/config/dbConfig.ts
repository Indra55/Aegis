import "dotenv/config";
import { Pool } from "pg";

const isProduction = process.env.NODE_ENV === "production";

const poolConfig = isProduction && process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DB,
    };

export const pool = new Pool(poolConfig);

