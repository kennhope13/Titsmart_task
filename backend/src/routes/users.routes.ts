import { Router } from 'express';
import { getEngineers, createEngineer, updateEngineer } from '../controllers/users.controller';

const router = Router();

router.get('/engineers', getEngineers);
router.post('/', createEngineer);
router.put('/:id', updateEngineer);

export default router;
