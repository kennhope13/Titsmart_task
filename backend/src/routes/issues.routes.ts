import { Router } from 'express';
import { getIssues, createIssue } from '../controllers/issues.controller';

const router = Router();

router.get('/', getIssues);
router.post('/', createIssue);

export default router;
