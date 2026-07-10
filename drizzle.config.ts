import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Remote Turso cloud database. Load whichever env file is present.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
    authToken: process.env.TURSO_AUTH_TOKEN ?? "",
  },
});
