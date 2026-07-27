import { Router } from 'express';
import { getEngineers } from '../controllers/users.controller';

const router = Router();

router.get('/engineers', getEngineers);

export default router;
