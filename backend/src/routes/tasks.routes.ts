import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask
} from '../controllers/tasks.controller';

const router = Router();

router.get('/', getTasks as any);
router.get('/:id', getTaskById as any);
router.post('/', createTask as any);
router.put('/:id', updateTask as any);
router.delete('/:id', deleteTask as any);

export default router;
