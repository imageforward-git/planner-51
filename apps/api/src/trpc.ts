import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "@planner51/db";
import { users, workspaceMembers } from "@planner51/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

// Auto-authenticate as the "selah" system user on every request
let cachedUser: { id: string; username: string } | null = null;

async function getSystemUser() {
  if (cachedUser) return cachedUser;
  const row = await db.select().from(users).where(sql`lower(${users.username}) = 'selah'`).then(r => r[0]);
  if (row) cachedUser = { id: row.id, username: row.username };
  return cachedUser;
}

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const user = await getSystemUser();
  return { user, session: { id: "system" }, db, res };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user!, session: ctx.session! } });
});

export const workspaceProcedure = protectedProcedure
  .input(z.object({ workspaceId: z.string().uuid() }))
  .use(async ({ ctx, input, next }) => {
    // Auto-add selah to any workspace they access
    const member = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, ctx.user.id)
        )
      )
      .then((rows) => rows[0]);

    if (!member) {
      // Auto-join as owner
      await db.insert(workspaceMembers).values({
        workspaceId: input.workspaceId,
        userId: ctx.user.id,
        role: "owner",
      });
    }

    return next({ ctx: { ...ctx, member: member ?? { role: "owner" }, workspaceId: input.workspaceId } });
  });
