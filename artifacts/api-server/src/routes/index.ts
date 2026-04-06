import { Router, type IRouter } from "express";
import healthRouter from "./health";
import listingsRouter from "./listings";
import commentsRouter from "./comments";
import usersRouter from "./users";
import savesRouter from "./saves";
import hashtagsRouter from "./hashtags";
import mapRouter from "./map";
import syncRouter from "./sync";

const router: IRouter = Router();

router.use(healthRouter);
router.use(listingsRouter);
router.use(commentsRouter);
router.use(usersRouter);
router.use(savesRouter);
router.use(hashtagsRouter);
router.use(mapRouter);
router.use(syncRouter);

export default router;
