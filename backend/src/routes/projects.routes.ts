import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projects.controller';

const router = Router();

router.get('/', getProjects as any);
router.get('/:id', getProjectById as any);
router.post('/', createProject as any);
router.put('/:id', updateProject as any);
router.delete('/:id', deleteProject as any);

export default router;
