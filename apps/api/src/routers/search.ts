import { z } from "zod";
import { router, workspaceProcedure } from "../trpc.js";
import { db, items } from "@planner51/db";
import { eq, and, isNull, sql } from "drizzle-orm";

export const searchRouter = router({
  query: workspaceProcedure
    .input(z.object({ workspaceId: z.string().uuid(), q: z.string().min(1) }))
    .query(async ({ input }) => {
      const results = await db
        .select()
        .from(items)
        .where(
          and(
            eq(items.workspaceId, input.workspaceId),
            isNull(items.deletedAt),
            sql`to_tsvector('english', coalesce(${items.title}, '') || ' ' || coalesce(${items.content}, '')) @@ plainto_tsquery('english', ${input.q})`
          )
        );
      return results;
    }),
});
