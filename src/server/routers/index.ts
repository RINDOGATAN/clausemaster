import { createTRPCRouter } from "../trpc";
import { documentRouter } from "./document";
import { analysisRouter } from "./analysis";

export const appRouter = createTRPCRouter({
  document: documentRouter,
  analysis: analysisRouter,
});

export type AppRouter = typeof appRouter;
