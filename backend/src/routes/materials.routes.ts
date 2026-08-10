import { Router } from 'express';
import {
  createInventoryTransaction,
  createMaterial,
  getInventoryTransactions,
  getMaterials,
} from '../controllers/materials.controller';

const router = Router();

router.get('/', getMaterials);
router.post('/', createMaterial);
router.get('/transactions', getInventoryTransactions);
router.post('/transactions', createInventoryTransaction);

export default router;
