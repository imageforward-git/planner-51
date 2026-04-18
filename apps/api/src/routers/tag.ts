import { z } from "zod";
import { router, workspaceProcedure, protectedProcedure } from "../trpc.js";
import { db, tags, itemTags } from "@planner51/db";
import { eq, and } from "drizzle-orm";
import { CreateTagInput } from "@planner51/shared";

export const tagRouter = router({
  list: workspaceProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.select().from(tags).where(eq(tags.workspaceId, input.workspaceId));
    }),

  create: workspaceProcedure
    .input(CreateTagInput)
    .mutation(async ({ input }) => {
      const [tag] = await db.insert(tags).values({
        workspaceId: input.workspaceId,
        name: input.name,
        color: input.color ?? "#6b7280",
      }).returning();
      return tag;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(itemTags).where(eq(itemTags.tagId, input.id));
      await db.delete(tags).where(eq(tags.id, input.id));
      return { success: true };
    }),

  addToItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.insert(itemTags).values({
        itemId: input.itemId,
        tagId: input.tagId,
      }).onConflictDoNothing();
      return { success: true };
    }),

  removeFromItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid(), tagId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(itemTags).where(
        and(eq(itemTags.itemId, input.itemId), eq(itemTags.tagId, input.tagId))
      );
      return { success: true };
    }),

  getItemTags: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.select({ tag: tags })
        .from(itemTags)
        .innerJoin(tags, eq(tags.id, itemTags.tagId))
        .where(eq(itemTags.itemId, input.itemId));
    }),
});
