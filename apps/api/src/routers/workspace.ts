import { z } from "zod";
import { router, protectedProcedure, workspaceProcedure } from "../trpc.js";
import { db, workspaces, workspaceMembers } from "@planner51/db";
import { eq } from "drizzle-orm";

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db
      .select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, ctx.user.id));
    return memberships;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), slug: z.string().min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const [ws] = await db.insert(workspaces).values({
        name: input.name,
        slug: input.slug,
      }).returning();

      await db.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: ctx.user.id,
        role: "owner",
      });

      return ws;
    }),

  get: workspaceProcedure.query(async ({ ctx }) => {
    const ws = await db.select().from(workspaces).where(eq(workspaces.id, ctx.workspaceId)).then(r => r[0]);
    return ws;
  }),

  invite: workspaceProcedure
    .input(z.object({ workspaceId: z.string().uuid(), username: z.string().min(1), role: z.string().default("member") }))
    .mutation(async ({ input }) => {
      const { users } = await import("@planner51/db");
      const user = await db.select().from(users).where(eq(users.username, input.username)).then(r => r[0]);
      if (!user) throw new Error("User not found");

      await db.insert(workspaceMembers).values({
        workspaceId: input.workspaceId,
        userId: user.id,
        role: input.role,
      });

      return { success: true };
    }),
});
