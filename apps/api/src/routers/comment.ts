import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { db, comments } from "@planner51/db";
import { eq, desc } from "drizzle-orm";
import { CreateCommentInput } from "@planner51/shared";

export const commentRouter = router({
  list: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.select().from(comments)
        .where(eq(comments.itemId, input.itemId))
        .orderBy(desc(comments.createdAt));
    }),

  create: protectedProcedure
    .input(CreateCommentInput)
    .mutation(async ({ input, ctx }) => {
      const [comment] = await db.insert(comments).values({
        itemId: input.itemId,
        userId: ctx.user.id,
        content: input.content,
      }).returning();
      return comment;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(comments).where(eq(comments.id, input.id));
      return { success: true };
    }),
});
