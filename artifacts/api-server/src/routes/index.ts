import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assignmentsRouter from "./assignments";
import submissionsRouter from "./submissions";
import instructorRouter from "./instructor";
import learnRouter from "./learn";
import reviewRouter from "./review";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assignmentsRouter);
router.use(submissionsRouter);
router.use(instructorRouter);
router.use(learnRouter);
router.use(reviewRouter);

export default router;
