import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Remote Turso cloud database. Load whichever env file is present.
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  dbCredentials: {
    authToken: process.env.TURSO_AUTH_TOKEN ?? "",
    url: process.env.DATABASE_URL ?? "",
  },
  dialect: "turso",
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
});
