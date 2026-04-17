import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { lucia } from "./auth.js";
import { db } from "@planner51/db";
import { workspaceMembers } from "@planner51/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const cookies = (req as any).cookies as Record<string, string> | undefined;
  const sessionId = cookies?.auth_session ?? null;
  if (!sessionId) return { user: null, session: null, db, res };

  const { session, user } = await lucia.validateSession(sessionId);
  if (session?.fresh) {
    const cookie = lucia.createSessionCookie(session.id);
    res.header("Set-Cookie", cookie.serialize());
  }
  if (!session) {
    const cookie = lucia.createBlankSessionCookie();
    res.header("Set-Cookie", cookie.serialize());
  }
  return { user, session, db, res };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session } });
});

export const workspaceProcedure = protectedProcedure
  .input(z.object({ workspaceId: z.string().uuid() }))
  .use(async ({ ctx, input, next }) => {
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
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
    }

    return next({ ctx: { ...ctx, member, workspaceId: input.workspaceId } });
  });
