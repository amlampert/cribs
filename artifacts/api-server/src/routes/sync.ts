import { Router, type IRouter } from "express";
import { syncSimplyRETS } from "../lib/simplyrets";

const router: IRouter = Router();

router.post("/sync", async (req, res): Promise<void> => {
  const result = await syncSimplyRETS();
  res.json(result);
});

export default router;
