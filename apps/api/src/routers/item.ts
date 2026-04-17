import { z } from "zod";
import { router, workspaceProcedure, protectedProcedure } from "../trpc.js";
import { db, items, itemLinks } from "@planner51/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { CreateItemInput, UpdateItemInput, ItemFilter } from "@planner51/shared";
import { parseWikilinks } from "../lib/wikilinks.js";

export const itemRouter = router({
  list: workspaceProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      filter: ItemFilter.optional(),
    }))
    .query(async ({ input }) => {
      let query = db.select().from(items).where(
        and(
          eq(items.workspaceId, input.workspaceId),
          isNull(items.deletedAt)
        )
      );
      return query;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const item = await db.select().from(items).where(eq(items.id, input.id)).then(r => r[0]);
      return item ?? null;
    }),

  create: workspaceProcedure
    .input(CreateItemInput)
    .mutation(async ({ input, ctx }) => {
      const [item] = await db.insert(items).values({
        workspaceId: input.workspaceId,
        parentId: input.parentId ?? null,
        type: input.type,
        title: input.title,
        content: input.content ?? null,
        properties: input.properties ?? null,
        createdBy: ctx.user.id,
      }).returning();

      // Parse wikilinks from content and upsert into item_links
      if (input.content) {
        await upsertWikilinks(item.id, input.workspaceId, input.content);
      }

      return item;
    }),

  update: protectedProcedure
    .input(UpdateItemInput)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.properties !== undefined) updateData.properties = data.properties;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.parentId !== undefined) updateData.parentId = data.parentId;

      const [item] = await db.update(items).set(updateData).where(eq(items.id, id)).returning();

      // Re-parse wikilinks
      if (data.content !== undefined && item) {
        await upsertWikilinks(item.id, item.workspaceId, data.content ?? "");
      }

      return item;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [item] = await db.update(items)
        .set({ deletedAt: new Date() })
        .where(eq(items.id, input.id))
        .returning();
      return item;
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [item] = await db.update(items)
        .set({ deletedAt: null })
        .where(eq(items.id, input.id))
        .returning();
      return item;
    }),
});

async function upsertWikilinks(sourceId: string, workspaceId: string, content: string) {
  const titles = parseWikilinks(content);
  if (titles.length === 0) return;

  // Delete existing links from this source
  await db.delete(itemLinks).where(eq(itemLinks.sourceId, sourceId));

  // Find target items by title in this workspace
  for (const title of titles) {
    const target = await db.select().from(items)
      .where(and(eq(items.workspaceId, workspaceId), eq(items.title, title)))
      .then(r => r[0]);

    if (target) {
      await db.insert(itemLinks).values({
        sourceId,
        targetId: target.id,
        linkType: "reference",
      }).onConflictDoNothing();
    }
  }
}
