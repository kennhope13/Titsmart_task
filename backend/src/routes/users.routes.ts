import { Router } from 'express';
import { getEngineers, createEngineer } from '../controllers/users.controller';

const router = Router();

router.get('/engineers', getEngineers);
router.post('/', createEngineer);

export default router;
