import { createTRPCRouter } from "../trpc";
import { documentRouter } from "./document";
import { analysisRouter } from "./analysis";
import { skillDraftRouter } from "./skill-draft";
import { settingsRouter } from "./settings";
import { userRouter } from "./user";
import { adminRouter } from "./admin";

export const appRouter = createTRPCRouter({
  document: documentRouter,
  analysis: analysisRouter,
  skillDraft: skillDraftRouter,
  settings: settingsRouter,
  user: userRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
