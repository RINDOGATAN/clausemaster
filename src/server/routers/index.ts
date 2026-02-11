import { createTRPCRouter } from "../trpc";
import { documentRouter } from "./document";
import { analysisRouter } from "./analysis";
import { skillDraftRouter } from "./skill-draft";

export const appRouter = createTRPCRouter({
  document: documentRouter,
  analysis: analysisRouter,
  skillDraft: skillDraftRouter,
});

export type AppRouter = typeof appRouter;
