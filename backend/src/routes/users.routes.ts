import { Router } from 'express';
import { getEngineers, createEngineer, updateEngineer, deleteEngineer } from '../controllers/users.controller';

const router = Router();

router.get('/engineers', getEngineers);
router.post('/', createEngineer);
router.put('/:id', updateEngineer);
router.delete('/:id', deleteEngineer);

export default router;
