import { createTRPCRouter } from "../trpc";
import { documentRouter } from "./document";
import { analysisRouter } from "./analysis";
import { skillDraftRouter } from "./skill-draft";
import { settingsRouter } from "./settings";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { reviewRouter } from "./review";

export const appRouter = createTRPCRouter({
  document: documentRouter,
  analysis: analysisRouter,
  skillDraft: skillDraftRouter,
  settings: settingsRouter,
  user: userRouter,
  admin: adminRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;
