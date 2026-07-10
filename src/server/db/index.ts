import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { serverEnv } from "~/env";
import * as schema from "./schema";

// Remote Turso (cloud libSQL). The app requires network + a Turso db; there is
// no local/offline mode. Schema is applied to the remote db via drizzle
// migrations (`bun run db:migrate`). Generated media stays on local disk.
const client = createClient({
  url: serverEnv.databaseUrl,
  authToken: serverEnv.tursoAuthToken,
});

export const db = drizzle(client, { schema });
