import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { lucia } from "../auth.js";
import { db, users } from "@planner51/db";
import { eq } from "drizzle-orm";
import { SignUpInput, SignInInput } from "@planner51/shared";
import bcrypt from "bcrypt";
import { generateIdFromEntropySize } from "lucia";

export const authRouter = router({
  signUp: publicProcedure.input(SignUpInput).mutation(async ({ input, ctx }) => {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).then(r => r[0]);
    if (existing) {
      throw new Error("Email already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const [user] = await db.insert(users).values({
      email: input.email,
      passwordHash,
      name: input.name ?? null,
    }).returning();

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    ctx.res.header("Set-Cookie", cookie.serialize());

    return { id: user.id, email: user.email, name: user.name };
  }),

  signIn: publicProcedure.input(SignInInput).mutation(async ({ input, ctx }) => {
    const user = await db.select().from(users).where(eq(users.email, input.email)).then(r => r[0]);
    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }

    const session = await lucia.createSession(user.id, {});
    const cookie = lucia.createSessionCookie(session.id);
    ctx.res.header("Set-Cookie", cookie.serialize());

    return { id: user.id, email: user.email, name: user.name };
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    await lucia.invalidateSession(ctx.session.id);
    const cookie = lucia.createBlankSessionCookie();
    ctx.res.header("Set-Cookie", cookie.serialize());
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name };
  }),
});
