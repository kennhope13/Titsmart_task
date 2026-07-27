import { Router } from 'express';
import {
  getMaterialPlans,
  createMaterialPlan,
  updateMaterialPlan,
  deleteMaterialPlan,
  getPurchasings,
  createPurchasing,
  updatePurchasing,
  deletePurchasing,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getPayrolls,
  createPayroll,
  updatePayroll,
  deletePayroll,
  getDocumentTracks,
  createDocumentTrack,
  updateDocumentTrack,
  deleteDocumentTrack
} from '../controllers/accounting.controller';

const router = Router();

// Material Plans
router.get('/material-plans', getMaterialPlans);
router.post('/material-plans', createMaterialPlan);
router.put('/material-plans/:id', updateMaterialPlan);
router.delete('/material-plans/:id', deleteMaterialPlan);

// Purchasings
router.get('/purchasings', getPurchasings);
router.post('/purchasings', createPurchasing);
router.put('/purchasings/:id', updatePurchasing);
router.delete('/purchasings/:id', deletePurchasing);

// Expenses
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

// Payrolls
router.get('/payrolls', getPayrolls);
router.post('/payrolls', createPayroll);
router.put('/payrolls/:id', updatePayroll);
router.delete('/payrolls/:id', deletePayroll);

// Document Tracks
router.get('/document-tracks', getDocumentTracks);
router.post('/document-tracks', createDocumentTrack);
router.put('/document-tracks/:id', updateDocumentTrack);
router.delete('/document-tracks/:id', deleteDocumentTrack);

export default router;
