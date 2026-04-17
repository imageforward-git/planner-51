import "dotenv/config";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc.js";
import { db } from "@planner51/db";
import { sql } from "drizzle-orm";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cookie);

  // Health check
  app.get("/healthz", async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: "ok", db: "ok" };
    } catch {
      return { status: "error", db: "failed" };
    }
  });

  // tRPC
  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  // Static files (production: serve web app)
  if (process.env.NODE_ENV === "production") {
    await app.register(fastifyStatic, {
      root: path.join(__dirname, "../../web/dist"),
      wildcard: false,
    });
    // SPA fallback
    app.setNotFoundHandler((_req, reply) => {
      return reply.sendFile("index.html");
    });
  }

  const port = parseInt(process.env.PORT || "8080", 10);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Server listening on port ${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
