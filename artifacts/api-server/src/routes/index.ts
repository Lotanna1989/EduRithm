import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assignmentsRouter from "./assignments";
import submissionsRouter from "./submissions";
import instructorRouter from "./instructor";
import learnRouter from "./learn";
import reviewRouter from "./review";
import classroomRouter from "./classroom";
import waitlistRouter from "./waitlist";
import opportunitiesRouter from "./opportunities";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(assignmentsRouter);
router.use(submissionsRouter);
router.use(instructorRouter);
router.use(learnRouter);
router.use(reviewRouter);
router.use(classroomRouter);
router.use(waitlistRouter);
router.use(opportunitiesRouter);
router.use(aiRouter);

export default router;
