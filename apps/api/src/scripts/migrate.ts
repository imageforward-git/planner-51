import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DIRECT_URL;
if (!url) throw new Error("DIRECT_URL not set");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log("Running migrations...");
await migrate(db, { migrationsFolder: path.join(__dirname, "../../../packages/db/migrations") });
console.log("Migrations complete.");
await client.end();
