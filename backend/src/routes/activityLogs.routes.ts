import { Router } from 'express';
import { getActivityLogs, createActivityLog } from '../controllers/activityLogs.controller';

const router = Router();

router.get('/', getActivityLogs);
router.post('/', createActivityLog);

export default router;
