import { Router } from 'express';
import { getFieldLogs, createFieldLog, deleteFieldLog, uploadFieldImages } from '../controllers/fieldLogs.controller';

const router = Router();

router.get('/', getFieldLogs);
router.post('/', uploadFieldImages.array('images', 20), createFieldLog);
router.delete('/:id', deleteFieldLog);

export default router;
