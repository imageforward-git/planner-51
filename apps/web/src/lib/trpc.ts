import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";

// Type import from API — this works because workspace packages resolve types
import type { AppRouter } from "../../../api/src/routers/index.js";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/trpc",
    }),
  ],
});
