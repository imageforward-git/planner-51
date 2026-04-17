import { z } from "zod";
import { router, protectedProcedure, workspaceProcedure } from "../trpc.js";
import { db, items, itemLinks } from "@planner51/db";
import { eq, and, isNull } from "drizzle-orm";

export const linkRouter = router({
  listBacklinks: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ input }) => {
      const backlinks = await db
        .select({ item: items, linkType: itemLinks.linkType })
        .from(itemLinks)
        .innerJoin(items, eq(items.id, itemLinks.sourceId))
        .where(and(eq(itemLinks.targetId, input.itemId), isNull(items.deletedAt)));
      return backlinks;
    }),

  graph: workspaceProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ input }) => {
      const allItems = await db.select({ id: items.id, title: items.title })
        .from(items)
        .where(and(eq(items.workspaceId, input.workspaceId), isNull(items.deletedAt)));

      const allLinks = await db.select().from(itemLinks);

      const itemIds = new Set(allItems.map(i => i.id));
      const edges = allLinks.filter(l => itemIds.has(l.sourceId) && itemIds.has(l.targetId));

      return {
        nodes: allItems.map(i => ({ id: i.id, label: i.title })),
        edges: edges.map(l => ({ source: l.sourceId, target: l.targetId, type: l.linkType })),
      };
    }),
});
