import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { workspaceRouter } from "./workspace.js";
import { itemRouter } from "./item.js";
import { linkRouter } from "./link.js";
import { searchRouter } from "./search.js";
import { commentRouter } from "./comment.js";
import { tagRouter } from "./tag.js";

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  item: itemRouter,
  link: linkRouter,
  search: searchRouter,
  comment: commentRouter,
  tag: tagRouter,
});

export type AppRouter = typeof appRouter;
