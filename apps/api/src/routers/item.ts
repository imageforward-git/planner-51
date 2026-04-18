import { z } from "zod";
import { router, workspaceProcedure, protectedProcedure } from "../trpc.js";
import { db, items, itemLinks } from "@planner51/db";
import { eq, and, isNull, sql, asc, desc } from "drizzle-orm";
import { CreateItemInput, UpdateItemInput, ItemFilter, ItemPriority } from "@planner51/shared";
import { parseWikilinks } from "../lib/wikilinks.js";

const SortBy = z.enum(["created_at", "due_date", "priority", "position"]).default("created_at");

const priorityOrder = sql`CASE ${items.priority}
  WHEN 'urgent' THEN 1
  WHEN 'high'   THEN 2
  WHEN 'medium' THEN 3
  WHEN 'low'    THEN 4
  WHEN 'none'   THEN 5
  ELSE 6
END`;

export const itemRouter = router({
  list: workspaceProcedure
    .input(z.object({
      workspaceId: z.string().uuid(),
      filter: ItemFilter.optional(),
      sortBy: SortBy.optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [
        eq(items.workspaceId, input.workspaceId),
        isNull(items.deletedAt),
      ];

      if (input.filter?.status) {
        conditions.push(eq(items.status, input.filter.status));
      }
      if (input.filter?.priority) {
        conditions.push(eq(items.priority, input.filter.priority));
      }
      if (input.filter?.type) {
        conditions.push(eq(items.type, input.filter.type));
      }
      if (input.filter?.parentId !== undefined) {
        if (input.filter.parentId === null) {
          conditions.push(isNull(items.parentId));
        } else {
          conditions.push(eq(items.parentId, input.filter.parentId));
        }
      }

      const sortBy = input.sortBy ?? "created_at";
      let orderExpr;
      switch (sortBy) {
        case "due_date":
          orderExpr = asc(items.dueDate);
          break;
        case "priority":
          orderExpr = asc(priorityOrder);
          break;
        case "position":
          orderExpr = asc(items.position);
          break;
        case "created_at":
        default:
          orderExpr = desc(items.createdAt);
          break;
      }

      return db.select().from(items)
        .where(and(...conditions))
        .orderBy(orderExpr);
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
        status: input.status ?? "todo",
        priority: input.priority ?? "none",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
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
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      }
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
      if (data.position !== undefined) updateData.position = data.position;

      const [item] = await db.update(items).set(updateData).where(eq(items.id, id)).returning();

      // Re-parse wikilinks
      if (data.content !== undefined && item) {
        await upsertWikilinks(item.id, item.workspaceId, data.content ?? "");
      }

      return item;
    }),

  reorder: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        position: z.number().int(),
      })),
    }))
    .mutation(async ({ input }) => {
      for (const { id, position } of input.items) {
        await db.update(items)
          .set({ position, updatedAt: new Date() })
          .where(eq(items.id, id));
      }
      return { success: true };
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
