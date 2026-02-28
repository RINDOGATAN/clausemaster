import { createTRPCRouter } from "../trpc";
import { documentRouter } from "./document";
import { analysisRouter } from "./analysis";
import { skillDraftRouter } from "./skill-draft";
import { settingsRouter } from "./settings";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  document: documentRouter,
  analysis: analysisRouter,
  skillDraft: skillDraftRouter,
  settings: settingsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
