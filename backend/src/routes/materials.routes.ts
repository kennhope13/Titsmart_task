import { Router } from 'express';
import {
  createInventoryTransaction,
  createMaterial,
  createBatchMaterial,
  getInventoryTransactions,
  getMaterials,
} from '../controllers/materials.controller';

const router = Router();

router.get('/', getMaterials);
router.post('/', createMaterial);
router.post('/batch', createBatchMaterial);
router.get('/transactions', getInventoryTransactions);
router.post('/transactions', createInventoryTransaction);

export default router;
