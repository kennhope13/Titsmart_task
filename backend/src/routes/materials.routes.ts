import { Router } from 'express';
import { getMaterials, createMaterial } from '../controllers/materials.controller';

const router = Router();

router.get('/', getMaterials);
router.post('/', createMaterial);

export default router;
