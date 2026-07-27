import { Router } from 'express';
import { getActivityLogs } from '../controllers/activityLogs.controller';

const router = Router();

router.get('/', getActivityLogs);

export default router;
